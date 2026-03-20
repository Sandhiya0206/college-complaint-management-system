import argparse
import csv
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path

CLASSES = [
    "electrical",
    "plumbing",
    "furniture",
    "cleanliness",
    "ac_ventilation",
    "internet_wifi",
    "infrastructure",
    "security",
    "other",
]

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".avif"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare merged complaint image dataset splits.")
    parser.add_argument("--synthetic-root", default="ml/raw_dataset")
    parser.add_argument("--real-roots", default="ml/real_dataset,client/ml/dataset")
    parser.add_argument("--output-root", default="ml/dataset")
    parser.add_argument("--artifacts-root", default="ml/artifacts")
    parser.add_argument("--classes", default=",".join(CLASSES))
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--test-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--max-per-class", type=int, default=0)
    return parser.parse_args()


def parse_classes(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS


def collect_from_direct_root(root: Path, category: str) -> list[Path]:
    class_dir = root / category
    if not class_dir.exists():
        return []
    return sorted([path for path in class_dir.rglob("*") if is_image(path)])


def collect_from_split_root(root: Path, category: str) -> list[Path]:
    paths = []
    for split in ("train", "val", "test"):
        class_dir = root / split / category
        if not class_dir.exists():
            continue
        paths.extend([path for path in class_dir.rglob("*") if is_image(path)])
    return sorted(paths)


def load_synthetic_metadata(artifacts_root: Path) -> dict[str, dict]:
    metadata = {}
    metadata_jsonl = artifacts_root / "synthetic_dataset_metadata.jsonl"
    if not metadata_jsonl.exists():
        return metadata

    with metadata_jsonl.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            file_path = Path(record.get("file_path", ""))
            if file_path.name:
                metadata[file_path.name] = record

    return metadata


def split_counts(total: int, train_ratio: float, val_ratio: float, test_ratio: float) -> dict[str, int]:
    if total <= 0:
        return {"train": 0, "val": 0, "test": 0}

    ratio_sum = train_ratio + val_ratio + test_ratio
    if ratio_sum <= 0:
        raise ValueError("Sum of split ratios must be positive.")

    train_ratio /= ratio_sum
    val_ratio /= ratio_sum
    test_ratio /= ratio_sum

    train_count = int(total * train_ratio)
    val_count = int(total * val_ratio)
    test_count = total - train_count - val_count

    if total >= 3:
        if val_count == 0:
            val_count = 1
            train_count = max(1, train_count - 1)
        if test_count == 0:
            test_count = 1
            train_count = max(1, train_count - 1)

    return {"train": train_count, "val": val_count, "test": test_count}


def reset_output_root(output_root: Path, classes: list[str]) -> None:
    for split in ("train", "val", "test"):
        for category in classes:
            class_dir = output_root / split / category
            class_dir.mkdir(parents=True, exist_ok=True)
            for file_path in class_dir.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
                    file_path.unlink(missing_ok=True)


def copy_image(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def class_display_name(category: str) -> str:
    return category.replace("_", " ").replace("wifi", "WiFi").title()


def main() -> None:
    args = parse_args()
    classes = parse_classes(args.classes)

    synthetic_root = Path(args.synthetic_root)
    real_roots = [Path(item.strip()) for item in args.real_roots.split(",") if item.strip()]
    output_root = Path(args.output_root)
    artifacts_root = Path(args.artifacts_root)

    artifacts_root.mkdir(parents=True, exist_ok=True)
    reset_output_root(output_root, classes)

    randomizer = random.Random(args.seed)
    synthetic_metadata = load_synthetic_metadata(artifacts_root)

    summary = {
        "synthetic_root": synthetic_root.as_posix(),
        "real_roots": [root.as_posix() for root in real_roots],
        "output_root": output_root.as_posix(),
        "classes": {},
        "totals": {
            "train": 0,
            "val": 0,
            "test": 0,
            "all": 0,
            "synthetic": 0,
            "real": 0,
        },
    }

    manifest_rows = []
    export_per_class = {category: 0 for category in classes}

    for category in classes:
        entries = []

        for path in collect_from_direct_root(synthetic_root, category):
            meta = synthetic_metadata.get(path.name, {})
            entries.append(
                {
                    "path": path,
                    "source": "synthetic",
                    "title": meta.get("title") or f"Synthetic {class_display_name(category)} complaint sample",
                    "description": meta.get("description")
                    or f"Synthetic training image for class '{category}' generated using Stable Diffusion.",
                }
            )

        for root in real_roots:
            if not root.exists():
                continue
            from_direct = collect_from_direct_root(root, category)
            from_split = collect_from_split_root(root, category)
            for path in from_direct + from_split:
                entries.append(
                    {
                        "path": path,
                        "source": "real",
                        "title": f"Real {class_display_name(category)} complaint sample",
                        "description": f"Real complaint image for class '{category}' collected from campus datasets.",
                    }
                )

        dedup = {}
        for item in entries:
            dedup[item["path"].resolve().as_posix()] = item
        entries = list(dedup.values())

        randomizer.shuffle(entries)
        if args.max_per_class > 0:
            entries = entries[: args.max_per_class]

        counts = split_counts(len(entries), args.train_ratio, args.val_ratio, args.test_ratio)
        split_cursor = 0
        split_items = {
            "train": entries[split_cursor : split_cursor + counts["train"]],
            "val": entries[split_cursor + counts["train"] : split_cursor + counts["train"] + counts["val"]],
            "test": entries[split_cursor + counts["train"] + counts["val"] :],
        }

        split_indices = defaultdict(int)
        class_real_count = 0
        class_synthetic_count = 0

        for split, split_entry_list in split_items.items():
            for item in split_entry_list:
                source = item["source"]
                if source == "synthetic":
                    class_synthetic_count += 1
                else:
                    class_real_count += 1

                split_indices[split] += 1
                src_path = item["path"]
                target_name = f"{source}_{split_indices[split]:06d}{src_path.suffix.lower()}"
                target_path = output_root / split / category / target_name
                copy_image(src_path, target_path)

                manifest_rows.append(
                    {
                        "split": split,
                        "class": category,
                        "source": source,
                        "source_path": src_path.as_posix(),
                        "target_path": target_path.as_posix(),
                        "title": item["title"],
                        "description": item["description"],
                    }
                )

        class_total = len(entries)
        export_per_class[category] = class_total

        summary["classes"][category] = {
            "total": class_total,
            "train": len(split_items["train"]),
            "val": len(split_items["val"]),
            "test": len(split_items["test"]),
            "synthetic": class_synthetic_count,
            "real": class_real_count,
        }

        summary["totals"]["train"] += len(split_items["train"])
        summary["totals"]["val"] += len(split_items["val"])
        summary["totals"]["test"] += len(split_items["test"])
        summary["totals"]["all"] += class_total
        summary["totals"]["synthetic"] += class_synthetic_count
        summary["totals"]["real"] += class_real_count

    manifest_path = artifacts_root / "dataset_manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["split", "class", "source", "source_path", "target_path", "title", "description"],
        )
        writer.writeheader()
        writer.writerows(manifest_rows)

    metadata_path = artifacts_root / "complaint_image_metadata.csv"
    with metadata_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["target_path", "class", "title", "description", "source", "split"])
        writer.writeheader()
        for row in manifest_rows:
            writer.writerow(
                {
                    "target_path": row["target_path"],
                    "class": row["class"],
                    "title": row["title"],
                    "description": row["description"],
                    "source": row["source"],
                    "split": row["split"],
                }
            )

    dataset_summary_path = artifacts_root / "dataset_prepare_summary.json"
    with dataset_summary_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    export_summary_path = artifacts_root / "export_dataset_summary.json"
    export_summary = {
        "complaintsScanned": summary["totals"]["all"],
        "imagesCopied": summary["totals"]["all"],
        "imagesMissing": 0,
        "imagesSkippedLowConfidence": 0,
        "perClass": export_per_class,
        "splitCounts": {
            "train": summary["totals"]["train"],
            "val": summary["totals"]["val"],
            "test": summary["totals"]["test"],
        },
    }
    with export_summary_path.open("w", encoding="utf-8") as handle:
        json.dump(export_summary, handle, indent=2)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
