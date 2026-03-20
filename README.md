# College Complaint Management System with AI Auto-Classification

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Seed database with test data
npm run seed

# Start development servers
npm run dev
```

## Massive Dataset Seeding (VCET)

Use the VCET seeder when you want larger training and validation-style complaint history in MongoDB.

```powershell
# From server folder
npm run seed:vcet

# Massive run (example: 10000 complaints)
$env:VCET_SEED_COMPLAINTS = "10000"
$env:VCET_COMPLAINT_BATCH_SIZE = "1000"
$env:VCET_STUDENT_BATCH_SIZE = "500"
npm run seed:vcet
```

After seeding, restart the backend so analytics and AI services warm up on the larger dataset.

## Default Login Credentials

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | admin@college.edu        | admin123    |
| Worker  | electrical@college.edu   | worker123   |
| Worker  | plumbing@college.edu     | worker123   |
| Worker  | furniture@college.edu    | worker123   |
| Worker  | cleaning@college.edu     | worker123   |
| Worker  | it@college.edu           | worker123   |
| Student | student1@college.edu     | student123  |
| Student | student2@college.edu     | student123  |
| Student | student3@college.edu     | student123  |

## Features

- AI Auto-Classification using TensorFlow.js (MobileNet + COCO-SSD)
- Real-time updates via Socket.io across all 3 dashboards
- Auto-assignment of complaints to workers by department
- Role-based access: Student, Admin, Worker
- Image-only complaint submission (AI fills in everything else)
- JWT authentication with httpOnly cookies
- Responsive design (mobile, tablet, desktop)

## Technology Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + TensorFlow.js
- **Backend**: Node.js + Express + MongoDB + Socket.io
- **AI**: TensorFlow.js MobileNet + COCO-SSD (client-side)

## Synthetic Dataset + Image Model Pipeline

This project now includes a Stable Diffusion based synthetic dataset generator for Smart Campus complaint image classification.

### 1) Install Python ML dependencies

```powershell
python -m pip install -r ml/requirements.txt
```

### 2) Generate synthetic images into `ml/raw_dataset`

```powershell
npm run generate:synthetic-images
```

Default behavior:
- 9 complaint classes
- minimum target: 50000 synthetic images total
- metadata written to `ml/artifacts/synthetic_dataset_metadata.csv` and `.jsonl`

### 3) Merge synthetic + real images and build train/val/test

```powershell
npm run prepare:image-dataset
```

Real images are automatically merged from:
- `ml/real_dataset/<class>`
- `client/ml/dataset/<split>/<class>`

Prepared dataset output:
- `ml/dataset/train/<class>`
- `ml/dataset/val/<class>`
- `ml/dataset/test/<class>`

### 4) Train image classification model

```powershell
npm run train:image-model
```

Training artifacts are saved in:
- `ml/artifacts/models/complaint_classifier_resnet18.pt`
- `ml/artifacts/training_summary.json`

### 5) Run full pipeline

```powershell
npm run pipeline:image-model
```
