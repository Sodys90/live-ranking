#!/bin/bash
cd ~/Desktop/tenis-zebricky
source ~/venv-grant/bin/activate

echo "1/2 České žebříčky (Playwright)..."
caffeinate -i python3 init_hraci_playwright.py

echo "2/2 Push..."
git add public/data/zebricky.json
git commit -m "🎾 Aktualizace $(date '+%d.%m.%Y')"
git push

echo "✅ Hotovo!"
