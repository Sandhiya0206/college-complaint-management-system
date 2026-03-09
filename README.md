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
