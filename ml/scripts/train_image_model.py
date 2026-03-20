import argparse
import json
import time
from pathlib import Path

try:
    import torch
    from torch import nn
    from torch.utils.data import DataLoader
    from torchvision import datasets, models, transforms
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Missing Python dependencies. Install from ml/requirements.txt before running this script."
    ) from exc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train complaint image classification model.")
    parser.add_argument("--dataset-root", default="ml/dataset")
    parser.add_argument("--artifacts-root", default="ml/artifacts")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--device", default="auto")
    return parser.parse_args()


def get_device(device_arg: str) -> str:
    if device_arg != "auto":
        return device_arg
    return "cuda" if torch.cuda.is_available() else "cpu"


def accuracy_from_logits(logits: torch.Tensor, labels: torch.Tensor) -> float:
    predictions = torch.argmax(logits, dim=1)
    return (predictions == labels).float().mean().item()


def evaluate(model, loader, criterion, device: str) -> dict:
    model.eval()
    loss_sum = 0.0
    acc_sum = 0.0
    count = 0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            logits = model(images)
            loss = criterion(logits, labels)

            batch_size = images.size(0)
            loss_sum += loss.item() * batch_size
            acc_sum += accuracy_from_logits(logits, labels) * batch_size
            count += batch_size

    if count == 0:
        return {"loss": 0.0, "accuracy": 0.0}

    return {
        "loss": loss_sum / count,
        "accuracy": acc_sum / count,
    }


def main() -> None:
    args = parse_args()

    dataset_root = Path(args.dataset_root)
    artifacts_root = Path(args.artifacts_root)
    models_root = artifacts_root / "models"
    models_root.mkdir(parents=True, exist_ok=True)

    train_dir = dataset_root / "train"
    val_dir = dataset_root / "val"
    test_dir = dataset_root / "test"

    if not train_dir.exists():
        raise SystemExit(f"Training folder not found: {train_dir.as_posix()}")

    image_size = args.image_size
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(image_size),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    eval_transform = transforms.Compose(
        [
            transforms.Resize(int(image_size * 1.15)),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    train_dataset = datasets.ImageFolder(train_dir.as_posix(), transform=train_transform)
    val_dataset = datasets.ImageFolder(val_dir.as_posix(), transform=eval_transform)
    test_dataset = datasets.ImageFolder(test_dir.as_posix(), transform=eval_transform)

    if len(train_dataset) == 0:
        raise SystemExit("No training images found in ml/dataset/train.")

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    class_names = train_dataset.classes
    num_classes = len(class_names)
    device = get_device(args.device)

    base_model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    in_features = base_model.fc.in_features
    base_model.fc = nn.Linear(in_features, num_classes)
    model = base_model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay
    )

    best_val_acc = 0.0
    best_state_dict = None
    history = []

    training_started = time.time()

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss_sum = 0.0
        train_acc_sum = 0.0
        train_count = 0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad(set_to_none=True)
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

            batch_size = images.size(0)
            train_loss_sum += loss.item() * batch_size
            train_acc_sum += accuracy_from_logits(logits, labels) * batch_size
            train_count += batch_size

        train_loss = train_loss_sum / max(1, train_count)
        train_acc = train_acc_sum / max(1, train_count)
        val_metrics = evaluate(model, val_loader, criterion, device)

        if val_metrics["accuracy"] >= best_val_acc:
            best_val_acc = val_metrics["accuracy"]
            best_state_dict = {
                key: value.detach().cpu().clone() for key, value in model.state_dict().items()
            }

        epoch_record = {
            "epoch": epoch,
            "train_loss": round(train_loss, 6),
            "train_accuracy": round(train_acc, 6),
            "val_loss": round(val_metrics["loss"], 6),
            "val_accuracy": round(val_metrics["accuracy"], 6),
        }
        history.append(epoch_record)
        print(json.dumps(epoch_record))

    if best_state_dict is None:
        best_state_dict = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}

    model.load_state_dict(best_state_dict)
    test_metrics = evaluate(model, test_loader, criterion, device)

    model_path = models_root / "complaint_classifier_resnet18.pt"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "class_names": class_names,
            "image_size": image_size,
        },
        model_path,
    )

    class_map_path = models_root / "class_to_idx.json"
    with class_map_path.open("w", encoding="utf-8") as handle:
        json.dump(train_dataset.class_to_idx, handle, indent=2)

    history_path = artifacts_root / "training_history.json"
    with history_path.open("w", encoding="utf-8") as handle:
        json.dump(history, handle, indent=2)

    training_duration_sec = time.time() - training_started
    summary = {
        "dataset_root": dataset_root.as_posix(),
        "train_images": len(train_dataset),
        "val_images": len(val_dataset),
        "test_images": len(test_dataset),
        "num_classes": num_classes,
        "class_names": class_names,
        "device": device,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "weight_decay": args.weight_decay,
        "best_val_accuracy": round(best_val_acc, 6),
        "test_loss": round(test_metrics["loss"], 6),
        "test_accuracy": round(test_metrics["accuracy"], 6),
        "training_duration_sec": round(training_duration_sec, 2),
        "model_path": model_path.as_posix(),
    }

    summary_path = artifacts_root / "training_summary.json"
    with summary_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
