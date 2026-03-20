import argparse
import csv
import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path

try:
    import torch
    from diffusers import AutoPipelineForText2Image
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Missing Python dependencies. Install from ml/requirements.txt before running this script."
    ) from exc

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

PROMPT_LIBRARY = {
    "electrical": [
        "burned electrical outlet near a college classroom wall",
        "sparking switchboard in campus hallway",
        "damaged ceiling light fixture in university lab",
        "exposed electrical wiring close to a hostel staircase",
    ],
    "plumbing": [
        "leaking water pipe under a college wash basin",
        "overflowing restroom sink in campus building",
        "broken tap dripping in university corridor",
        "water seepage and puddle near hostel bathroom entrance",
    ],
    "furniture": [
        "broken classroom chair in a college lecture room",
        "damaged wooden desk with cracked surface in campus library",
        "loose bench leg in university canteen seating area",
        "collapsed cupboard shelf in staff room",
    ],
    "cleanliness": [
        "overflowing garbage bin near college walkway",
        "unclean classroom floor with litter and dust",
        "dirty campus washroom with stains and waste",
        "trash scattered around hostel staircase corner",
    ],
    "ac_ventilation": [
        "dusty non-working air conditioner in college classroom",
        "blocked ventilation grill in campus corridor ceiling",
        "water leaking from old split AC unit in lecture hall",
        "broken exhaust fan in university lab",
    ],
    "internet_wifi": [
        "damaged wifi router mounted in campus hallway",
        "loose ethernet cable setup in university computer lab",
        "network switch with warning lights in IT room",
        "broken access point device in classroom ceiling",
    ],
    "infrastructure": [
        "cracked campus wall with peeling plaster",
        "damaged staircase tile in university building",
        "pothole and broken pavement inside college grounds",
        "water-stained ceiling with structural damage",
    ],
    "security": [
        "broken CCTV camera in campus corridor",
        "faulty fire extinguisher cabinet in college building",
        "damaged emergency exit sign near staircase",
        "unlocked electrical control room door in university block",
    ],
    "other": [
        "general maintenance issue in college campus area",
        "miscellaneous damaged equipment in university corridor",
        "unidentified complaint scene in campus building",
        "non-categorized facility problem near hostel entrance",
    ],
}

STYLE_SUFFIXES = [
    "realistic documentary photo, natural lighting, detailed texture",
    "high-detail smartphone camera photo, realistic environment",
    "authentic maintenance inspection photo, photorealistic",
    "wide angle institutional facility photograph, highly detailed",
]

NEGATIVE_PROMPT_DEFAULT = (
    "cartoon, anime, painting, illustration, low quality, blurry, watermark, logo, text overlay,"
    " people posing, duplicate objects, distorted geometry"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic complaint images with Stable Diffusion.")
    parser.add_argument("--output-root", default="ml/raw_dataset")
    parser.add_argument("--artifacts-root", default="ml/artifacts")
    parser.add_argument("--classes", default=",".join(CLASSES))
    parser.add_argument("--images-per-class", type=int, default=5000)
    parser.add_argument("--minimum-total", type=int, default=50000)
    parser.add_argument("--model-id", default="stabilityai/sd-turbo")
    parser.add_argument("--negative-prompt", default=NEGATIVE_PROMPT_DEFAULT)
    parser.add_argument("--steps", type=int, default=2)
    parser.add_argument("--guidance-scale", type=float, default=0.0)
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--max-retries", type=int, default=2)
    return parser.parse_args()


def parse_classes(raw: str) -> list[str]:
    parsed = [item.strip() for item in raw.split(",") if item.strip()]
    if not parsed:
        raise ValueError("Class list cannot be empty.")
    return parsed


def image_count(folder: Path) -> int:
    if not folder.exists():
        return 0
    return sum(1 for file in folder.iterdir() if file.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})


def effective_per_class(class_count: int, images_per_class: int, minimum_total: int) -> int:
    if class_count <= 0:
        return images_per_class
    return max(images_per_class, math.ceil(max(0, minimum_total) / class_count))


def build_prompt(category: str, rng: random.Random) -> str:
    base = rng.choice(PROMPT_LIBRARY.get(category, PROMPT_LIBRARY["other"]))
    style = rng.choice(STYLE_SUFFIXES)
    return f"{base}, {style}, no people focus"


def readable_category(category: str) -> str:
    return category.replace("_", " ").replace("wifi", "WiFi").title()


def build_title_description(category: str, image_number: int) -> tuple[str, str]:
    name = readable_category(category)
    title = f"{name} complaint sample {image_number:05d}"
    description = (
        f"Synthetic campus complaint image for class '{category}'. "
        f"Generated for Smart Campus complaint classifier training with realistic facility conditions."
    )
    return title, description


def load_pipeline(model_id: str):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    # Some community/test models publish only .bin weights, so fall back if safetensors are unavailable.
    try:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype, use_safetensors=True)
    except OSError:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype, use_safetensors=False)

    # For offline synthetic dataset creation we disable safety checker to avoid model-specific shape mismatches.
    if hasattr(pipe, "safety_checker"):
        pipe.safety_checker = None
    if hasattr(pipe, "requires_safety_checker"):
        pipe.requires_safety_checker = False

    pipe = pipe.to(device)
    pipe.set_progress_bar_config(disable=True)

    if hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()
    if hasattr(pipe, "enable_vae_slicing"):
        pipe.enable_vae_slicing()

    return pipe, device


def main() -> None:
    args = parse_args()
    classes = parse_classes(args.classes)

    output_root = Path(args.output_root)
    artifacts_root = Path(args.artifacts_root)
    output_root.mkdir(parents=True, exist_ok=True)
    artifacts_root.mkdir(parents=True, exist_ok=True)

    rng = random.Random(args.seed)
    target_per_class = effective_per_class(len(classes), args.images_per_class, args.minimum_total)

    metadata_csv_path = artifacts_root / "synthetic_dataset_metadata.csv"
    metadata_jsonl_path = artifacts_root / "synthetic_dataset_metadata.jsonl"
    summary_path = artifacts_root / "synthetic_generation_summary.json"

    pipe, device = load_pipeline(args.model_id)

    generated_total = 0
    skipped_existing = 0
    summary = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "model_id": args.model_id,
        "device": device,
        "width": args.width,
        "height": args.height,
        "steps": args.steps,
        "guidance_scale": args.guidance_scale,
        "requested_images_per_class": args.images_per_class,
        "minimum_total": args.minimum_total,
        "effective_target_per_class": target_per_class,
        "classes": {},
    }

    with metadata_csv_path.open("a", newline="", encoding="utf-8") as csv_file, metadata_jsonl_path.open(
        "a", encoding="utf-8"
    ) as jsonl_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "timestamp_utc",
                "class",
                "file_path",
                "title",
                "description",
                "prompt",
                "negative_prompt",
                "model_id",
                "seed",
                "width",
                "height",
            ],
        )
        if csv_file.tell() == 0:
            writer.writeheader()

        for category in classes:
            class_dir = output_root / category
            class_dir.mkdir(parents=True, exist_ok=True)

            existing = image_count(class_dir)
            needed = max(0, target_per_class - existing)
            skipped_existing += min(existing, target_per_class)

            class_generated = 0
            class_failures = 0
            class_last_error = ""

            for offset in range(needed):
                image_number = existing + offset + 1
                prompt = build_prompt(category, rng)
                seed = rng.randint(1, 2**31 - 1)

                image = None
                last_error = None
                for _ in range(args.max_retries + 1):
                    try:
                        generator = torch.Generator(device=device).manual_seed(seed)
                        image = pipe(
                            prompt=prompt,
                            negative_prompt=args.negative_prompt,
                            num_inference_steps=args.steps,
                            guidance_scale=args.guidance_scale,
                            width=args.width,
                            height=args.height,
                            generator=generator,
                        ).images[0]
                        break
                    except Exception as exc:
                        last_error = exc
                        image = None

                if image is None:
                    class_failures += 1
                    if last_error is not None:
                        class_last_error = str(last_error)
                    continue

                file_name = f"sd_{category}_{image_number:06d}_{seed}.png"
                output_path = class_dir / file_name
                image.save(output_path)

                title, description = build_title_description(category, image_number)
                record = {
                    "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                    "class": category,
                    "file_path": output_path.as_posix(),
                    "title": title,
                    "description": description,
                    "prompt": prompt,
                    "negative_prompt": args.negative_prompt,
                    "model_id": args.model_id,
                    "seed": seed,
                    "width": args.width,
                    "height": args.height,
                }

                writer.writerow(record)
                jsonl_file.write(json.dumps(record) + "\n")
                csv_file.flush()
                jsonl_file.flush()

                generated_total += 1
                class_generated += 1

            final_count = image_count(class_dir)
            summary["classes"][category] = {
                "existing_before_run": existing,
                "generated_this_run": class_generated,
                "failed_this_run": class_failures,
                "final_count": final_count,
                "target_count": target_per_class,
            }
            if class_last_error:
                summary["classes"][category]["last_error"] = class_last_error

    summary["generated_total_this_run"] = generated_total
    summary["skipped_existing"] = skipped_existing
    summary["target_total"] = target_per_class * len(classes)

    with summary_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
