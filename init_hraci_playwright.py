#!/usr/bin/env python3
"""
Nový scraper pomocí Playwright - načítá body přímo z nového webu cesky-tenis.cz
"""

import re, os, json, time
from datetime import date, datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

BASE_URL = "https://cesky-tenis.cz"
TOP_N = 8

KATEGORIE = [
    {"id": "22", "slug": "mladsi-zaci",   "url_base": "mladsi-zactvo", "cat": "4"},
    {"id": "23", "slug": "mladsi-zakyne", "url_base": "mladsi-zactvo", "cat": "4"},
    {"id": "25", "slug": "starsi-zaci",   "url_base": "starsi-zactvo", "cat": "5"},
    {"id": "26", "slug": "starsi-zakyne", "url_base": "starsi-zactvo", "cat": "5"},
    {"id": "20", "slug": "dorostenci",    "url_base": "dorost",        "cat": "2"},
    {"id": "21", "slug": "dorostenky",    "url_base": "dorost",        "cat": "2"},

]

ROCNIKY = {
    "22": [2014,2015,2016], "23": [2014,2015,2016],
    "25": [2012,2013,2014,2015,2016], "26": [2012,2013,2014,2015,2016],
    "20": [2008,2009,2010,2011],
    "21": [2008,2009,2010,2011],

}

# Sezóny pro scraping
SEZONY = ["2026-Z", "2026-L"]

# Prefix čísla turnaje určuje kategorii
TURNAJ_PREFIXES = {
    "mladsi-zaci":   ["7"],
    "mladsi-zakyne": ["8"],
    "starsi-zaci":   ["5"],
    "starsi-zakyne": ["6"],
    "dorostenci":    ["3"],
    "dorostenky":    ["4"],
}

# Klíčová slova pro mezinárodní turnaje (bez odkazu)
MEZINARODNI_KLICOVA_SLOVA = {
    "mladsi-zaci":   ["u12 boys", "b12"],
    "mladsi-zakyne": ["u12 girls", "g12"],
    "starsi-zaci":   ["u14 boys", "b14", "te u14 boys"],
    "starsi-zakyne": ["u14 girls", "g14", "te u14 girls"],
    "dorostenci":    ["u16 boys", "u18 boys", "b16", "b18", "junior davis", "davis cup", "itf juniors boys", "te u16 boys", "te u18 boys"],
    "dorostenky":    ["u16 girls", "u18 girls", "g16", "g18", "fed cup", "billie jean", "itf juniors girls", "te u16 girls", "te u18 girls"],
}

def get_page(page, url, retries=3):
    for i in range(retries):
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            return page.content()
        except Exception as e:
            print(f"    retry {i+1}/3: {e}")
            time.sleep(5)
    return None

def parse_body_z_turnaje(match_div):
    """Parsuje body z jednoho turnaje - vrací (body_dv, body_ct, je_druzstvo)"""
    body_dv = 0
    body_ct = 0
    je_druzstvo = 'match--teams' in ' '.join(match_div.get('class', []))
    
    cols = match_div.find_all(class_='match__tournaments__column')
    for col in cols:
        title = col.find(class_='title')
        if not title: continue
        je_ctyrhra = 'čtyřhra' in title.get_text(strip=True).lower() or 'Čtyřhra' in title.get_text()
        p_body = col.find('p', class_='text-center')
        if p_body:
            strong = p_body.find('strong')
            if strong:
                try:
                    b = int(re.search(r'\d+', strong.get_text()).group())
                    if je_ctyrhra:
                        body_ct = b
                    else:
                        body_dv = b
                except: pass
    
    return body_dv, body_ct, je_druzstvo

def get_vsechny_kategorie(page, hrac_id, kat_cat):
    """Zjistí všechny kategorie které hráč hraje"""
    url = f"{BASE_URL}/hrac/{hrac_id}"
    content = get_page(page, url)
    if not content: return [kat_cat]
    
    soup = BeautifulSoup(content, "html.parser")
    cats = set([kat_cat])
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if f"/hrac/{hrac_id}" in href and "category=" in href:
            cat = href.split("category=")[1].split("&")[0]
            cats.add(cat)
    return list(cats)

def scrape_hrace(page, hrac_id, kat):
    """Stáhne body hráče ze všech sezón - filtruje podle prefixu turnaje"""
    akce_dv = []
    akce_ct = []
    druz_dv = []
    druz_ct = []
    prefixes = TURNAJ_PREFIXES.get(kat["slug"], [])
    
    seen_druz = set()
    for sezona in SEZONY:
        url = f"{BASE_URL}/hrac/{hrac_id}?year={sezona}&category={kat['cat']}"
        content = get_page(page, url)
        if not content: continue
        
        # Zkontroluj jestli záložka pro tuto kategorii existuje
        from bs4 import BeautifulSoup as _BS
        _soup = _BS(content, 'html.parser')
        dostupne_katy = set()
        for a in _soup.find_all('a', href=True):
            href = a['href']
            if f'/hrac/{hrac_id}' in href and 'category=' in href:
                cat = href.split('category=')[1].split('&')[0]
                dostupne_katy.add(cat)
        if kat['cat'] not in dostupne_katy:
            continue  # hráč nemá turnaje v této kategorii v této sezóně
        
        soup = BeautifulSoup(content, 'html.parser')
        matches = soup.find_all(class_=lambda c: c and 'match--tournaments' in c)
        
        for match in matches:
            # Filtruj podle prefixu čísla turnaje
            if prefixes:
                odkaz = match.find("a", href=lambda h: h and "/turnaj/" in str(h))
                if odkaz:
                    kod = odkaz["href"].split("/turnaj/")[1].split("?")[0].split("#")[0]
                    if not any(kod.startswith(p) for p in prefixes):
                        continue
                else:
                    pass  # bez odkazu = mezinárodní turnaj, zahrneme
            
            body_dv, body_ct, je_druzstvo = parse_body_z_turnaje(match)
            nazev_elem = match.find(class_="match__title")
            nazev = nazev_elem.get_text(strip=True)[:50] if nazev_elem else ""
            if je_druzstvo:
                # Deduplikuj podle názvu turnaje
                klic_dv = f"{nazev}_dv"
                klic_ct = f"{nazev}_ct"
                if body_dv > 0 and klic_dv not in seen_druz:
                    druz_dv.append(body_dv)
                    seen_druz.add(klic_dv)
                if body_ct > 0 and klic_ct not in seen_druz:
                    druz_ct.append(body_ct)
                    seen_druz.add(klic_ct)
            else:
                if body_dv > 0: akce_dv.append(body_dv)
                if body_ct > 0: akce_ct.append(body_ct)
        
        time.sleep(0.5)
    
    # Družstva: top 4 výsledky = 1 akce (článek 24)
    if druz_dv:
        top4_druz_dv = sum(sorted(druz_dv, reverse=True)[:4])
        akce_dv.append(top4_druz_dv)
    if druz_ct:
        top4_druz_ct = sum(sorted(druz_ct, reverse=True)[:4])
        akce_ct.append(top4_druz_ct)
    
    # Spočítej top 8
    top_dv = sorted(akce_dv, reverse=True)[:TOP_N]
    top_ct = sorted(akce_ct, reverse=True)[:TOP_N]
    A = sum(top_dv)
    B = sum(top_ct)
    return A + B, A, B, top_dv, top_ct

# Mapování slug na URL název
SLUG_URL = {
    "mladsi-zaci":   "mladsi-zaci",
    "mladsi-zakyne": "mladsi-zakyne",
    "starsi-zaci":   "starsi-zaci",
    "starsi-zakyne": "starsi-zakyne",
    "dorostenci":    "dorostenci",
    "dorostenky":    "dorostenky",

}

def nacti_hraci_ze_zebricky(page, kat):
    """Načte seznam hráčů ze žebříčku - nový web cesky-tenis.cz"""
    from bs4 import BeautifulSoup as BS
    hraci = []
    povolene = ROCNIKY.get(kat["id"], [])
    url_slug = SLUG_URL.get(kat["slug"], kat["slug"])
    strankovani = 1

    while True:
        url = f"{BASE_URL}/zebricky/{url_slug}/{strankovani}"
        print(f"    stránka {strankovani}...", end=" ", flush=True)
        
        content = get_page(page, url)
        if not content: break
        
        soup = BS(content, "html.parser")
        davka = []
        
        for t in soup.find_all("table"):
            rows = t.find_all("tr")
            if not rows: continue
            for row in rows[1:]:
                tds = row.find_all("td")
                if len(tds) < 6: continue
                link = tds[2].find("a") if len(tds) > 2 else None
                if not link: continue
                href = link.get("href", "")
                if "/hrac/" not in href: continue
                hrac_id = href.split("/hrac/")[1].split("?")[0].split("/")[0]
                # Sloupce: 0=cž 1=kž 2=Jméno 3=Narozen 4=Klub 5=Dvouhra 6=Čtyřhra 7=Suma 8=BH 9=rCŽ
                narozeni = tds[3].get_text(strip=True) if len(tds) > 3 else ""
                if povolene and narozeni and narozeni.isdigit() and int(narozeni) not in povolene: continue
                
                klub = tds[4].get_text(strip=True) if len(tds) > 4 else ""
                dvouhra_raw = tds[5].get_text(strip=True) if len(tds) > 5 else ""
                ctyrhra_raw = tds[6].get_text(strip=True) if len(tds) > 6 else ""
                suma_raw = tds[7].get_text(strip=True) if len(tds) > 7 else ""
                
                try:
                    int(suma_raw); te_itf = False; te_itf_typ = None; te_itf_poradi = None
                except:
                    te_itf = True
                    te_itf_typ = dvouhra_raw if dvouhra_raw in ["TE","ITF","ATP","WTA"] else None
                    try: te_itf_poradi = int(ctyrhra_raw)
                    except: te_itf_poradi = None
                
                davka.append({
                    "id": hrac_id,
                    "jmeno": tds[2].get_text(strip=True),
                    "narozeni": narozeni,
                    "klub": klub,
                    "te_itf": te_itf, "te_itf_typ": te_itf_typ, "te_itf_poradi": te_itf_poradi,
                })
            break
        
        print(f"{len(davka)} hráčů")
        if not davka: break
        hraci += davka
        
        # Zkontroluj jestli existuje další stránka
        next_page = soup.find("a", string=str(strankovani + 1))
        if not next_page:
            # Zkus najít šipku doprava
            next_btn = soup.find("a", class_=lambda c: c and "next" in str(c).lower())
            if not next_btn: break
        
        strankovani += 1
        time.sleep(1.0)
    
    return hraci

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for kat in KATEGORIE:
            print(f"\n{'='*40}")
            print(f"📡 {kat['slug']}")
            
            hraci = nacti_hraci_ze_zebricky(page, kat)
            print(f"   Celkem: {len(hraci)} hráčů")
            
            for i, h in enumerate(hraci, 1):
                if h.get("te_itf"):
                    sb.table("hraci").upsert({
                        "id": h["id"], "jmeno": h["jmeno"],
                        "narozeni": h["narozeni"], "klub": h["klub"],
                        "kategorie_slug": kat["slug"],
                        "te_itf": True, "te_itf_typ": h["te_itf_typ"],
                        "te_itf_poradi": h["te_itf_poradi"],
                        "body_celkem": 0, "body_dv": 0, "body_ct": 0,
                        "updated_at": datetime.now().isoformat(),
                    }, on_conflict="id,kategorie_slug").execute()
                    print(f"  [{i:>3}/{len(hraci)}] {h['jmeno']:30} TE/ITF")
                    continue
                
                print(f"  [{i:>3}/{len(hraci)}] {h['jmeno']:30}", end=" ", flush=True)
                try:
                    csb, A, B, top_dv, top_ct = scrape_hrace(page, h["id"], kat)
                    sb.table("hraci").upsert({
                        "id": h["id"], "jmeno": h["jmeno"],
                        "narozeni": h["narozeni"], "klub": h["klub"],
                        "kategorie_slug": kat["slug"],
                        "body_dv": A, "body_ct": B, "body_celkem": csb,
                        "akce_dv": top_dv, "akce_ct": top_ct,
                        "te_itf": False,
                        "updated_at": datetime.now().isoformat(),
                    }, on_conflict="id,kategorie_slug").execute()
                    print(f"dv:{A} ct:{B} = {csb}")
                except Exception as e:
                    print(f"CHYBA: {e}")
        
        browser.close()
    print("\n✅ Hotovo!")

def prepocitej_zebricky():
    import json
    TOP_N = 8
    output = {}
    for kat in KATEGORIE:
        hraci = []
        offset = 0
        while True:
            res = sb.table("hraci").select("*").eq("kategorie_slug", kat["slug"]).range(offset, offset+999).execute()
            if not res.data: break
            hraci += res.data
            if len(res.data) < 1000: break
            offset += 1000

        # Seřaď - TE/ITF první, pak podle bodů
        from typing import Any
        def sort_key(h):
            if h.get("te_itf"):
                typ = h.get("te_itf_typ", "TE")
                p = {"ATP": 0, "WTA": 0, "ITF": 1, "TE": 2}.get(typ, 9)
                return (0, p, h.get("te_itf_poradi") or 999)
            return (1, 0, -(h.get("body_celkem") or 0))

        hraci.sort(key=sort_key)
        
        # Počet hráčů bez TE/ITF pro výpočet BH
        pocet = sum(1 for h in hraci if not h.get("te_itf"))
        
        def vypocitej_bh(poradi, pocet):
            if pocet <= 0: return 1
            # Hranice skupin
            bs = [
                (5,   60),
                (7,   45),
                (9,   35),
                (12,  30),
                (27,  25),
                (28,  20),
                (42,  15),
                (70,  12),
                (100,  9),
            ]
            hranice = 0
            for pocet_skupiny, bh_val in bs:
                hranice += pocet_skupiny
                if poradi <= hranice:
                    return bh_val
            # 1/3 zbývajících
            zbyvajici = pocet - hranice
            if zbyvajici <= 0: return 1
            tretina = max(1, zbyvajici // 3)
            if poradi <= hranice + tretina: return 6
            if poradi <= hranice + 2 * tretina: return 4
            if poradi <= hranice + 3 * tretina: return 3
            return 1

        poradi = 1
        for i, h in enumerate(hraci):
            if h.get("te_itf"):
                h["poradi_live"] = 0
                h["bh"] = 0
                continue
            if i > 0 and not hraci[i-1].get("te_itf") and h["body_celkem"] == hraci[i-1]["body_celkem"]:
                h["poradi_live"] = hraci[i-1]["poradi_live"]
            else:
                h["poradi_live"] = poradi
            h["bh"] = vypocitej_bh(h["poradi_live"], pocet)
            poradi += 1

        output[kat["slug"]] = {
            "nazev": kat["slug"],
            "aktualizace": datetime.now().isoformat(),
            "hraci": hraci,
        }

    os.makedirs("public/data", exist_ok=True)
    with open("public/data/zebricky.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("✅ zebricky.json aktualizován")

if __name__ == "__main__":
    main()
    prepocitej_zebricky()
