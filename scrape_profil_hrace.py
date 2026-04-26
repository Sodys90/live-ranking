"""
Scraper profilů hráčů — turnaje + zápasy
Spouštět: python3 scrape_profil_hrace.py
"""
import re, time
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from supabase import create_client

BASE_URL = "https://cesky-tenis.cz"
SEZONY = ["2026-L", "2026-Z"]  # 2026-Z je uzavřená — scrapeovat pouze jednou ručně

HRACI = [
    (1061488, "Vašíček Jiří",    "mladsi-zaci", 4),
    (1059461, "Stalčík Jakub",   "mladsi-zaci", 4),
    (1055631, "Kačín Lukáš",     "mladsi-zaci", 4),
    (1056208, "Ječmínek Tobiáš", "mladsi-zaci", 4),
    (1053902, "Komárek Matěj",   "mladsi-zaci", 4),
    (1055901, "Frelich Tomáš",   "mladsi-zaci", 4),
    (1056295, "Hayek Denis",     "mladsi-zaci", 4),
    (1060408, "Vyžrálek Radim",  "mladsi-zaci", 4),
    (1052660, "Rožek Filip",     "mladsi-zaci", 4),
    (1061345, "Kováč Jiří",      "mladsi-zaci", 4),
]

KOLO_MAPA = {
    "Group": "GS",
    "2 > 1": "F", "4 > 2": "SF", "4 > 3": "SF",
    "8 > 4": "8", "8 > 5": "8", "8 > 6": "8", "8 > 7": "8",
    "16 > 8": "16", "32 > 16": "32", "64 > 32": "64", "128 > 64": "128",
}

KOLO_PORADI = ["V", "F", "SF", "8", "16", "32", "64", "128"]

def parse_kolo(kolo_str):
    k = kolo_str.strip()
    return KOLO_MAPA.get(k, k)

def umisteni_z_zapasu(zapasy_discipliny):
    """Z výsledků zápasů odvodí umístění"""
    if not zapasy_discipliny: return None
    # Pokud vyhrál všechny → V
    if all(z["vyhral"] for z in zapasy_discipliny):
        return "V"
    # Poslední kolo kde prohrál
    prohry = [z for z in zapasy_discipliny if not z["vyhral"]]
    if prohry:
        return prohry[-1]["kolo"]
    return None

def parse_sety(rows):
    sety = []
    if len(rows) >= 2:
        hrac_tds = rows[0].find_all('td', class_='result')
        souper_tds = rows[1].find_all('td', class_='result')
        for h, s in zip(hrac_tds, souper_tds):
            hg = h.get_text(strip=True)
            sg = s.get_text(strip=True)
            if hg and sg: sety.append(f"{hg}:{sg}")
    return " ".join(sety)

def parse_turnaj(match, sezona, hrac_id, kategorie_slug):
    je_druzstvo = 'match--teams' in ' '.join(match.get('class', []))

    # Datum
    datum_str = ""
    datum_el = match.find(class_='match__date')
    if datum_el:
        s = datum_el.find('strong')
        if s: datum_str = s.get_text(strip=True)

    # Název + odkaz + kategorie K:14/13
    nazev, turnaj_kod, turnaj_url = "", None, None
    kategorie_dv, kategorie_ct = None, None
    povrch, typ_turnaje = None, None

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
            # Název bez odkazu (družstva, mezinárodní)
            raw = title_el.get_text(separator=' ', strip=True)
            nazev = re.split(r',\s*K:', raw)[0].strip()
        km = re.search(r'K:\s*(\d+)(?:/(\d+))?', title_el.get_text())
        if km:
            kategorie_dv = int(km.group(1))
            kategorie_ct = int(km.group(2)) if km.group(2) else kategorie_dv

    # Povrch + typ
    small = match.find('small')
    if small:
        parts = [p.strip() for p in small.get_text(separator='•', strip=True).split('•')]
        if parts: typ_turnaje = parts[0]
        if len(parts) > 1: povrch = parts[1]

    # Body + zápasy per disciplína
    body_dv, body_ct = 0, 0
    zapasy_dv, zapasy_ct = [], []

    for col in match.find_all(class_='match__tournaments__column'):
        title = col.find('strong', class_='title')
        if not title: continue
        je_ct = 'čtyřhra' in title.get_text(strip=True).lower()
        disciplina = "ct" if je_ct else "dv"

        # Body
        p = col.find('p', class_='text-center')
        if p:
            strong = p.find('strong')
            if strong:
                try:
                    b = int(re.search(r'\d+', strong.get_text()).group())
                    if je_ct: body_ct = b
                    else: body_dv = b
                except: pass

        # Zápasy
        for result in col.find_all(class_='match__result'):
            kolo_div = result.find('div', recursive=False)
            kolo = parse_kolo(kolo_div.get_text(strip=True) if kolo_div else "")

            table = result.find('table', class_='match-table')
            if not table: continue
            rows = table.find_all('tr')
            if len(rows) < 2: continue

            # Soupeři — může být více (čtyřhra)
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
                "hrac_id": hrac_id,
                "turnaj_kod": turnaj_kod,
                "sezona": sezona,
                "kategorie_slug": kategorie_slug,
                "disciplina": disciplina,
                "kolo": kolo,
                "souper_id": souper_id,
                "souper_jmeno": souper_jmeno,
                "vysledek": sety,
                "vyhral": vyhral,
                "je_druzstvo": je_druzstvo,
            }
            if je_ct: zapasy_ct.append(zap)
            else: zapasy_dv.append(zap)

    umisteni_dv = umisteni_z_zapasu(zapasy_dv) if not je_druzstvo else None
    umisteni_ct = umisteni_z_zapasu(zapasy_ct) if not je_druzstvo else None

    turnaj = {
        "hrac_id": hrac_id,
        "kategorie_slug": kategorie_slug,
        "sezona": sezona,
        "nazev": nazev,
        "turnaj_kod": turnaj_kod,
        "turnaj_url": turnaj_url,
        "datum_str": datum_str,
        "body_dv": body_dv,
        "body_ct": body_ct,
        "body_celkem": body_dv + body_ct,
        "je_druzstvo": je_druzstvo,
        "kategorie_dv": kategorie_dv,
        "kategorie_ct": kategorie_ct,
        "umisteni_dv": umisteni_dv,
        "umisteni_ct": umisteni_ct,
        "povrch": povrch,
        "typ_turnaje": typ_turnaje,
    }

    return turnaj, zapasy_dv + zapasy_ct

# Supabase
sb_url, sb_key = "", ""
try:
    for line in open("/Users/dave-macstudio/Desktop/tenis-zebricky/.env.local"):
        if "SUPABASE_URL" in line: sb_url = line.split("=",1)[1].strip()
        if "ANON_KEY" in line: sb_key = line.split("=",1)[1].strip()
except: pass
sb = create_client(sb_url, sb_key)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    vsechny_turnaje, vsechny_zapasy = [], []

    for hrac_id, jmeno, kategorie_slug, cat in HRACI:
        print(f"\n=== {jmeno} ({hrac_id}) ===")
        for sezona in SEZONY:
            url = f"{BASE_URL}/hrac/{hrac_id}?year={sezona}&category={cat}"
            print(f"  {sezona}...", end=" ", flush=True)
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
                content = page.content()
                soup = BeautifulSoup(content, 'html.parser')
                matches = soup.find_all(class_=lambda c: c and 'match--tournaments' in c)
                print(f"{len(matches)} turnajů")
                for m in matches:
                    t, z = parse_turnaj(m, sezona, hrac_id, kategorie_slug)
                    # Přeskočit mezinárodní (bez turnaj_kod)
                    if not t["turnaj_kod"]:
                        continue
                    if t["nazev"] or t["body_celkem"] > 0:
                        vsechny_turnaje.append(t)
                        vsechny_zapasy.extend(z)
            except Exception as e:
                print(f"CHYBA: {e}")
            time.sleep(1)

    browser.close()

print(f"\nCelkem turnajů: {len(vsechny_turnaje)}")
print(f"Celkem zápasů: {len(vsechny_zapasy)}")

print("\nUkázka turnajů:")
for t in vsechny_turnaje[:3]:
    print(f"  {t['nazev']} | K:{t['kategorie_dv']} | {t['umisteni_dv']} | {t['body_dv']}b")

print("\nUkázka zápasů:")
for z in vsechny_zapasy[:5]:
    print(f"  {z['kolo']} vs {z['souper_jmeno']} | {z['vysledek']} | {'✓' if z['vyhral'] else '✗'}")

# Uložení
print("\nUkládám do Supabase...")
hrac_ids = [h[0] for h in HRACI]
# Smaž pouze letní sezónu — zimní zůstane
sb.table("turnaje_hrace").delete().in_("hrac_id", hrac_ids).execute()
sb.table("zapasy_hrace").delete().in_("hrac_id", hrac_ids).execute()

for i in range(0, len(vsechny_turnaje), 50):
    sb.table("turnaje_hrace").insert(vsechny_turnaje[i:i+50]).execute()
for i in range(0, len(vsechny_zapasy), 50):
    sb.table("zapasy_hrace").insert(vsechny_zapasy[i:i+50]).execute()

print("Hotovo!")
