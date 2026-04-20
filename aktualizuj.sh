#!/bin/bash
cd ~/Desktop/tenis-zebricky
source ~/venv-grant/bin/activate

echo "1/4 České žebříčky (trvá hodiny)..."
caffeinate -i python3 init_hraci_s_body.py

echo "2/4 ITF scraper..."
caffeinate -i python3 scraper_itf.py

echo "3/4 Přepočet žebříčku..."
python3 -c "from scraper_turnaje import prepocitej_zebricky; prepocitej_zebricky()"

echo "4/4 Push na GitHub..."
git add public/data/zebricky.json
git commit -m "🎾 Aktualizace $(date '+%d.%m.%Y')"
git push

echo "✅ Hotovo!"
