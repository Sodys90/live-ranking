"""
Jednorázový scraper zimní sezóny 2026-Z pro všechny hráče
Spouštět: caffeinate -i python3 scrape_profil_zima.py
POZOR: Spustit pouze jednou — data se nepřepisují!
"""
import re, time, os, sys
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from supabase import create_client

BASE_URL = "https://cesky-tenis.cz"
SEZONA = "2026-Z"

# Kategorie slug → category číslo
KAT_CAT = {
    "mladsi-zaci": "4", "mladsi-zakyne": "4",
    "starsi-zaci": "5", "starsi-zakyne": "5",
    "dorostenci": "2", "dorostenky": "2",
    "muzi": "3", "zeny": "3",
}

# Supabase
sb_url, sb_key = "", ""
try:
    for line in open("/Users/dave-macstudio/Desktop/tenis-zebricky/.env.local"):
        if "SUPABASE_URL" in line: sb_url = line.split("=",1)[1].strip()
        if "ANON_KEY" in line: sb_key = line.split("=",1)[1].strip()
except: pass
sb = create_client(sb_url, sb_key)

KOLO_MAPA = {
    "2 > 1": "F", "4 > 2": "SF", "4 > 3": "SF",
    "8 > 4": "8", "8 > 5": "8", "8 > 6": "8", "8 > 7": "8",
    "16 > 8": "16", "32 > 16": "32", "64 > 32": "64", "128 > 64": "128",
    "Group": "GS",
}

def parse_kolo(kolo_str):
    return KOLO_MAPA.get(kolo_str.strip(), kolo_str.strip())

def umisteni_z_zapasu(zapasy):
    if not zapasy: return None
    if all(z["vyhral"] for z in zapasy): return "V"
    prohry = [z for z in zapasy if not z["vyhral"]]
    return prohry[-1]["kolo"] if prohry else None

def parse_sety(rows):
    sety = []
    if len(rows) >= 2:
        for h, s in zip(rows[0].find_all('td', class_='result'), rows[1].find_all('td', class_='result')):
            hg, sg = h.get_text(strip=True), s.get_text(strip=True)
            if hg and sg: sety.append(f"{hg}:{sg}")
    return " ".join(sety)

def parse_turnaj(match, hrac_id, kategorie_slug):
    je_druzstvo = 'match--teams' in ' '.join(match.get('class', []))
    datum_str, nazev, turnaj_kod, turnaj_url = "", "", None, None
    kategorie_dv, kategorie_ct, povrch, typ_turnaje = None, None, None, None

    datum_el = match.find(class_='match__date')
    if datum_el:
        s = datum_el.find('strong')
        if s: datum_str = s.get_text(strip=True)

    title_el = match.find(class_='match__title')
    if title_el:
        odkaz = title_el.find('a')
        if odkaz:
            nazev = odkaz.get_text(strip=True)
            href = odkaz.get('href', '')
            if '/turnaj/' in href:
                turnaj_kod = href.split('/turnaj/')[1].split('?')[0].split('#')[0]
                turnaj_url = BASE_URL + href
        else:
            raw = title_el.get_text(separator=' ', strip=True)
            nazev = re.split(r',\s*K:', raw)[0].strip()
        km = re.search(r'K:\s*(\d+)(?:/(\d+))?', title_el.get_text())
        if km:
            kategorie_dv = int(km.group(1))
            kategorie_ct = int(km.group(2)) if km.group(2) else kategorie_dv

    small = match.find('small')
    if small:
        parts = [p.strip() for p in small.get_text(separator='•', strip=True).split('•')]
        if parts: typ_turnaje = parts[0]
        if len(parts) > 1: povrch = parts[1]

    if not turnaj_kod:
        return None, []

    body_dv, body_ct = 0, 0
    zapasy_dv, zapasy_ct = [], []

    for col in match.find_all(class_='match__tournaments__column'):
        title = col.find('strong', class_='title')
        if not title: continue
        je_ct = 'čtyřhra' in title.get_text(strip=True).lower()
        disciplina = "ct" if je_ct else "dv"

        p = col.find('p', class_='text-center')
        if p:
            strong = p.find('strong')
            if strong:
                try:
                    b = int(re.search(r'\d+', strong.get_text()).group())
                    if je_ct: body_ct = b
                    else: body_dv = b
                except: pass

        for result in col.find_all(class_='match__result'):
            kolo_div = result.find('div', recursive=False)
            kolo = parse_kolo(kolo_div.get_text(strip=True) if kolo_div else "")
            table = result.find('table', class_='match-table')
            if not table: continue
            rows = table.find_all('tr')
            if len(rows) < 2: continue

            souper_links = rows[1].find_all('a')
            souper_jmeno, souper_id = "", None
            if souper_links:
                jmena = [re.sub(r'\s+', ' ', a.get_text()).strip() for a in souper_links]
                souper_jmeno = " / ".join(jmena)
                m_id = re.search(r'/hrac/(\d+)', souper_links[0].get('href', ''))
                if m_id: souper_id = int(m_id.group(1))

            svg = result.find('svg')
            ico = svg.find('use')['href'] if svg and svg.find('use') else ''
            vyhral = 'ico-check' in ico
            sety = parse_sety(rows)

            zap = {
                "hrac_id": hrac_id, "turnaj_kod": turnaj_kod,
                "sezona": SEZONA, "kategorie_slug": kategorie_slug,
                "disciplina": disciplina, "kolo": kolo,
                "souper_id": souper_id, "souper_jmeno": souper_jmeno,
                "vysledek": sety, "vyhral": vyhral, "je_druzstvo": je_druzstvo,
            }
            if je_ct: zapasy_ct.append(zap)
            else: zapasy_dv.append(zap)

    umisteni_dv = umisteni_z_zapasu(zapasy_dv) if not je_druzstvo else None
    umisteni_ct = umisteni_z_zapasu(zapasy_ct) if not je_druzstvo else None

    turnaj = {
        "hrac_id": hrac_id, "kategorie_slug": kategorie_slug, "sezona": SEZONA,
        "nazev": nazev, "turnaj_kod": turnaj_kod, "turnaj_url": turnaj_url,
        "datum_str": datum_str, "body_dv": body_dv, "body_ct": body_ct,
        "body_celkem": body_dv + body_ct, "je_druzstvo": je_druzstvo,
        "kategorie_dv": kategorie_dv, "kategorie_ct": kategorie_ct,
        "umisteni_dv": umisteni_dv, "umisteni_ct": umisteni_ct,
        "povrch": povrch, "typ_turnaje": typ_turnaje,
    }
    return turnaj, zapasy_dv + zapasy_ct

def nacti_vsechny_hrace():
    """Načte všechny hráče z DB po stránkách"""
    hraci = []
    from_idx = 0
    while True:
        data = sb.table("hraci").select("id, kategorie_slug").range(from_idx, from_idx + 999).execute()
        if not data.data: break
        hraci.extend(data.data)
        if len(data.data) < 1000: break
        from_idx += 1000
    # Deduplikuj — každý hráč jen jednou (primární kategorie)
    seen = set()
    unique = []
    for h in hraci:
        if h["id"] not in seen:
            seen.add(h["id"])
            unique.append(h)
    return unique

def uloz_batch(turnaje, zapasy):
    for i in range(0, len(turnaje), 100):
        sb.table("turnaje_hrace").insert(turnaje[i:i+100]).execute()
    for i in range(0, len(zapasy), 100):
        sb.table("zapasy_hrace").insert(zapasy[i:i+100]).execute()

# Načti hráče již zpracované (pro resume při přerušení)
def nacti_zpracovane():
    data = sb.table("turnaje_hrace").select("hrac_id").eq("sezona", SEZONA).execute()
    return set(r["hrac_id"] for r in data.data)

print("Načítám hráče z DB...")
hraci = nacti_vsechny_hrace()
print(f"Celkem hráčů: {len(hraci)}")

zpracovane = nacti_zpracovane()
print(f"Již zpracováno: {len(zpracovane)}")

hraci_ke_zpracovani = [h for h in hraci if int(h["id"]) not in zpracovane]
print(f"Zbývá zpracovat: {len(hraci_ke_zpracovani)}")

if not hraci_ke_zpracovani:
    print("Vše již zpracováno!")
    sys.exit(0)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    batch_turnaje, batch_zapasy = [], []
    BATCH_SIZE = 50

    for idx, h in enumerate(hraci_ke_zpracovani):
        hrac_id = int(h["id"])
        kat = h["kategorie_slug"]
        cat = KAT_CAT.get(kat, 4)

        url = f"{BASE_URL}/hrac/{hrac_id}?year={SEZONA}&category={cat}"
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            content = page.content()
            soup = BeautifulSoup(content, 'html.parser')
            matches = soup.find_all(class_=lambda c: c and 'match--tournaments' in c)

            for m in matches:
                t, z = parse_turnaj(m, hrac_id, kat)
                if t:
                    batch_turnaje.append(t)
                    batch_zapasy.extend(z)

        except Exception as e:
            print(f"  CHYBA {hrac_id}: {e}")

        # Progress
        if (idx + 1) % 10 == 0:
            print(f"  [{idx+1}/{len(hraci_ke_zpracovani)}] turnajů: {len(batch_turnaje)}, zápasů: {len(batch_zapasy)}")

        # Uložit po batch
        if len(batch_turnaje) >= BATCH_SIZE:
            uloz_batch(batch_turnaje, batch_zapasy)
            batch_turnaje, batch_zapasy = [], []

        time.sleep(0.8)

    # Zbytek
    if batch_turnaje:
        uloz_batch(batch_turnaje, batch_zapasy)

    browser.close()

print("\nHotovo!")
