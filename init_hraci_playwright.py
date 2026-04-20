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
    {"id": "25", "slug": "starsi-zaci",   "url_base": "starsi-zactvo", "cat": "3"},
    {"id": "26", "slug": "starsi-zakyne", "url_base": "starsi-zactvo", "cat": "3"},
    {"id": "20", "slug": "dorostenci",    "url_base": "dorost",        "cat": "2"},
    {"id": "21", "slug": "dorostenky",    "url_base": "dorost",        "cat": "2"},
]

ROCNIKY = {
    "22": [2014,2015,2016], "23": [2014,2015,2016],
    "25": [2012,2013,2014,2015,2016], "26": [2012,2013,2014,2015,2016],
    "20": [2008,2009,2010,2011,2012,2013,2014,2015,2016],
    "21": [2008,2009,2010,2011,2012,2013,2014,2015,2016],
}

# Sezóny pro scraping
SEZONY = ["2026-Z", "2026-L"]

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
    """Parsuje body z jednoho turnaje"""
    body_dv = 0
    body_ct = 0
    
    cols = match_div.find_all(class_='match__tournaments__column')
    for col in cols:
        title = col.find(class_='title')
        if not title: continue
        
        je_ctyrhra = 'čtyřhra' in title.get_text(strip=True).lower() or 'Čtyřhra' in title.get_text()
        
        # Najdi "Ziskané body: X b."
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
        else:
            # Jednotlivci - spočítej z kol
            results = col.find_all(class_='match__result')
            if results:
                # Poslední kolo kde hráč vyhrál
                posledni_kolo = None
                for res in results:
                    kolo_div = res.find('div')
                    if kolo_div:
                        kolo_text = kolo_div.get_text(strip=True)
                        if '>' in kolo_text:
                            posledni_kolo = kolo_text
                # Přepočítej kolo na umístění
                # 2>1 = finále, 4>2 = semifinále atd. - ale to nevíme bez kat.
                # Raději necháme 0 a použijeme data ze žebříčku
    
    return body_dv, body_ct

def scrape_hrace(page, hrac_id, kat):
    """Stáhne body hráče ze všech sezón"""
    akce_dv = []
    akce_ct = []
    
    for sezona in SEZONY:
        url = f"{BASE_URL}/hrac/{hrac_id}?year={sezona}&category={kat['cat']}"
        content = get_page(page, url)
        if not content: continue
        
        soup = BeautifulSoup(content, 'html.parser')
        matches = soup.find_all(class_=lambda c: c and 'match--tournaments' in c)
        
        for match in matches:
            body_dv, body_ct = parse_body_z_turnaje(match)
            if body_dv > 0: akce_dv.append(body_dv)
            if body_ct > 0: akce_ct.append(body_ct)
        
        time.sleep(0.5)
    
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

if __name__ == "__main__":
    main()
