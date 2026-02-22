#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "[Deploy] Pulling latest changes..."
git pull origin main

echo "[Deploy] Building client..."
cd client && npm run build

echo "[Deploy] Restarting server..."
pm2 restart samo-hotel

echo "[Deploy] Done!"
