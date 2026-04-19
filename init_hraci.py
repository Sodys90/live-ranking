#!/usr/bin/env python3
"""
Jednorázové stažení všech hráčů ze žebříčku do Supabase
Spusť pouze jednou!
"""

import requests, time, json, re, os
from bs4 import BeautifulSoup
from datetime import date, datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

BASE_URL = "https://cztenis.cz"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

KATEGORIE = [
    {"id": "22", "slug": "mladsi-zaci",    "url_base": "mladsi-zactvo"},
    {"id": "23", "slug": "mladsi-zakyne",  "url_base": "mladsi-zactvo"},
    {"id": "25", "slug": "starsi-zaci",    "url_base": "starsi-zactvo"},
    {"id": "26", "slug": "starsi-zakyne",  "url_base": "starsi-zactvo"},
    {"id": "20", "slug": "dorostenci",     "url_base": "dorost"},
    {"id": "21", "slug": "dorostenky",     "url_base": "dorost"},
]

ROCNIKY = {
    "22": [2014,2015,2016],
    "23": [2014,2015,2016],
    "25": [2012,2013,2014,2015,2016],
    "26": [2012,2013,2014,2015,2016],
    "20": [2008,2009,2010,2011,2012,2013,2014,2015,2016],
    "21": [2008,2009,2010,2011,2012,2013,2014,2015,2016],
}

def get_soup_post(url, data):
    for attempt in range(3):
        r = requests.post(url, headers=HEADERS, data=data, timeout=15)
        if r.status_code == 429:
            print(f"    429 - čekám 30s...")
            time.sleep(30)
            continue
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    raise Exception("429 Too Many Requests")

def get_soup_get(url):
    for attempt in range(3):
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 429:
            print(f"    429 - čekám 30s...")
            time.sleep(30)
            continue
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    raise Exception("429 Too Many Requests")

def nacti_kategorii(kat):
    url = f"{BASE_URL}/{kat['url_base']}/zebricky/"
    hraci = []
    limit = 0
    povolene_rocniky = ROCNIKY.get(kat["id"], [])

    while True:
        print(f"    Stránka offset {limit}...", end=" ", flush=True)
        if limit == 0:
            soup = get_soup_post(url, {
                "volba": "1", "sezona": "2026-L",
                "kategorie": kat["id"], "region": "-1", "hrac": "",
            })
        else:
            next_url = f"{BASE_URL}/post/1/volba/2/sezona/2026-L/kategorie/{kat['id']}/region/-1/hrac/-/limit/{limit}/limit_next/1"
            soup = get_soup_get(next_url)

        davka = []
        for t in soup.find_all("table"):
            rows = t.find_all("tr")
            if not rows or "suma" not in rows[0].get_text().lower(): continue
            for row in rows[1:]:
                tds = row.find_all("td")
                if len(tds) < 8: continue
                link = tds[2].find("a")
                if not link: continue
                hrac_id = link["href"].split("/hrac/")[1].split("/")[0]
                narozeni = tds[3].get_text(strip=True)
                if povolene_rocniky and narozeni and int(narozeni) not in povolene_rocniky:
                    continue
                dvouhra_raw = tds[5].get_text(strip=True)
                ctyrhra_raw = tds[6].get_text(strip=True)
                suma_raw    = tds[7].get_text(strip=True)
                try:
                    suma_oficial = int(suma_raw)
                    te_itf = False
                    te_itf_typ = None
                    te_itf_poradi = None
                except:
                    suma_oficial = 0
                    te_itf = True
                    te_itf_typ = dvouhra_raw if dvouhra_raw in ["TE","ITF","ATP","WTA"] else None
                    try: te_itf_poradi = int(ctyrhra_raw)
                    except: te_itf_poradi = None

                davka.append({
                    "id":            hrac_id,
                    "jmeno":         tds[2].get_text(strip=True),
                    "narozeni":      narozeni,
                    "klub":          tds[4].get_text(strip=True),
                    "kategorie_slug": kat["slug"],
                    "body_dv":       0,
                    "body_ct":       0,
                    "body_celkem":   suma_oficial,
                    "te_itf":        te_itf,
                    "te_itf_typ":    te_itf_typ,
                    "te_itf_poradi": te_itf_poradi,
                    "updated_at":    datetime.now().isoformat(),
                })
            break

        print(f"{len(davka)} hráčů")
        if not davka: break
        hraci += davka
        if len(davka) < 100: break
        dalsi = soup.find("a", href=lambda h: h and "limit_next" in str(h))
        if not dalsi: break
        limit += 100
        time.sleep(1.0)

    return hraci

def main():
    vsichni = []
    for kat in KATEGORIE:
        print(f"\n{'='*40}")
        print(f"📡 {kat['slug']}")
        hraci = nacti_kategorii(kat)
        vsichni += hraci
        print(f"   Celkem: {len(hraci)} hráčů")

        # Ulož do Supabase po dávkách
        for i in range(0, len(hraci), 100):
            sb.table("hraci").upsert(hraci[i:i+100]).execute()
        time.sleep(1.0)

    print(f"\n✅ Celkem uloženo: {len(vsichni)} hráčů do Supabase")

if __name__ == "__main__":
    main()
