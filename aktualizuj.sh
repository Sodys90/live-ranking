#!/bin/bash
cd ~/Desktop/tenis-zebricky
source ~/venv-grant/bin/activate

echo "1/3 České žebříčky (Playwright)..."
caffeinate -i python3 init_hraci_playwright.py

echo "2/3 Letní profily..."
caffeinate -i python3 scrape_profil_leto.py

echo "3/3 Push..."
git add public/data/zebricky.json
git commit -m "Aktualizace $(date '+%d.%m.%Y')"
git push

echo "Hotovo!"
