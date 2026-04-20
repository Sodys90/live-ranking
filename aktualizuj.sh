#!/bin/bash
cd ~/Desktop/tenis-zebricky
source ~/venv-grant/bin/activate

echo "1/3 České žebříčky (Playwright - nový web)..."
caffeinate -i python3 init_hraci_playwright.py

echo "2/3 ITF scraper..."
caffeinate -i python3 scraper_itf.py

echo "3/3 Přepočet a push..."
python3 -c "from scraper_turnaje import prepocitej_zebricky; prepocitej_zebricky()"
git add public/data/zebricky.json
git commit -m "🎾 Aktualizace $(date '+%d.%m.%Y')"
git push

echo "✅ Hotovo!"
