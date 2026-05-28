#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
npm run build

cd "$ROOT/backend"
exec python3 main.py
