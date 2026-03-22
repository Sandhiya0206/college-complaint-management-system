#!/bin/bash
# Build script for Render deployment
set -e

echo "========== BUILDING COLLEGE COMPLAINT MANAGEMENT SYSTEM =========="
echo ""

echo "📦 Installing root dependencies..."
npm install

echo ""
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

echo ""
echo "📦 Installing client dev dependencies..."
cd client
npm install --include=dev
cd ..

echo ""
echo "🔨 Building frontend (React + Vite)..."
npm run build

echo ""
echo "✓ Build completed successfully!"
echo "📁 Frontend dist folder created at: client/dist"
ls -lh client/dist/ | head -5

echo ""
echo "========== BUILD SUCCESS =========="
