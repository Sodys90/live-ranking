#!/usr/bin/env python3
"""
Jednorázové stažení VŠECH hráčů ze žebříčku včetně bodů do Supabase
Spusť jednou - trvá hodiny ale pak máš kompletní databázi
"""

import requests, time, re, os, json
from bs4 import BeautifulSoup
from datetime import date, datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

BASE_URL = "https://cztenis.cz"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
TOP_N    = 8

sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

KATEGORIE = [
    {"id": "22", "slug": "mladsi-zaci",   "url_base": "mladsi-zactvo", "klic": "mladší žactvo"},
    {"id": "23", "slug": "mladsi-zakyne", "url_base": "mladsi-zactvo", "klic": "mladší žactvo"},
    {"id": "25", "slug": "starsi-zaci",   "url_base": "starsi-zactvo", "klic": "starší žactvo"},
    {"id": "26", "slug": "starsi-zakyne", "url_base": "starsi-zactvo", "klic": "starší žactvo"},
    {"id": "20", "slug": "dorostenci",    "url_base": "dorost",        "klic": "dorost"},
    {"id": "21", "slug": "dorostenky",    "url_base": "dorost",        "klic": "dorost"},
]

ROCNIKY = {
    "22": [2014,2015,2016], "23": [2014,2015,2016],
    "25": [2012,2013,2014,2015,2016], "26": [2012,2013,2014,2015,2016],
    "20": [2008,2009,2010,2011,2012,2013,2014,2015,2016],
    "21": [2008,2009,2010,2011,2012,2013,2014,2015,2016],
}

OBDOBI = [
    {"od": date(2025, 11, 1), "do": date(2026, 3, 31), "sezona": 2026},
    {"od": date(2025, 4,  1), "do": date(2025, 10, 31), "sezona": 2025},
]

def get_soup(url, method="get", data=None):
    for attempt in range(3):
        if method == "post":
            r = requests.post(url, headers=HEADERS, data=data, timeout=15)
        else:
            r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 429:
            print(f"    429 - čekám 30s...")
            time.sleep(30)
            continue
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    raise Exception("429")

def datum_je_platny(datum_str):
    if not datum_str: return True
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', datum_str)
    if not m:
        m2 = re.search(r'(\d{4})-(\d{2})-(\d{2})', datum_str)
        if not m2: return True
        d = date(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))
    else:
        d = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    return any(o["od"] <= d <= o["do"] for o in OBDOBI)

def nacti_hraci_ze_zebricky(kat):
    url = f"{BASE_URL}/{kat['url_base']}/zebricky/"
    hraci = []
    limit = 0
    povolene = ROCNIKY.get(kat["id"], [])

    while True:
        print(f"    offset {limit}...", end=" ", flush=True)
        if limit == 0:
            soup = get_soup(url, "post", {"volba":"1","sezona":"2026-L","kategorie":kat["id"],"region":"-1","hrac":""})
        else:
            soup = get_soup(f"{BASE_URL}/post/1/volba/2/sezona/2026-L/kategorie/{kat['id']}/region/-1/hrac/-/limit/{limit}/limit_next/1")

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
                if povolene and narozeni and int(narozeni) not in povolene: continue
                dvouhra_raw = tds[5].get_text(strip=True)
                ctyrhra_raw = tds[6].get_text(strip=True)
                suma_raw    = tds[7].get_text(strip=True)
                try:
                    suma = int(suma_raw); te_itf = False; te_itf_typ = None; te_itf_poradi = None
                except:
                    suma = 0; te_itf = True
                    te_itf_typ = dvouhra_raw if dvouhra_raw in ["TE","ITF","ATP","WTA"] else None
                    try: te_itf_poradi = int(ctyrhra_raw)
                    except: te_itf_poradi = None
                davka.append({
                    "id": hrac_id, "jmeno": tds[2].get_text(strip=True),
                    "narozeni": narozeni, "klub": tds[4].get_text(strip=True),
                    "kategorie_slug": kat["slug"], "suma_oficial": suma,
                    "te_itf": te_itf, "te_itf_typ": te_itf_typ, "te_itf_poradi": te_itf_poradi,
                })
            break

        print(f"{len(davka)} hráčů")
        if not davka: break
        hraci += davka
        dalsi = soup.find("a", href=lambda h: h and "limit_next" in str(h))
        if not dalsi: break
        limit += 100
        time.sleep(1.0)

    return hraci

def get_body_hrace(hrac_id, sezona, klic):
    soup = get_soup(f"{BASE_URL}/hrac/{hrac_id}", "post", {"volba":"1","sezona":str(sezona)})
    dv, ct = [], []
    druz_dv_radky, druz_ct_radky = [], []

    for h3 in soup.find_all("h3"):
        text = h3.get_text(strip=True).lower()
        if klic not in text: continue
        tabulka = h3.parent.find("table")
        if not tabulka: continue

        je_druzstvo = "družstva" in text
        je_ctyrhra  = "čtyřhra" in text
        je_dvouhra  = "dvouhra" in text

        for tr in tabulka.find_all("tr"):
            tds = tr.find_all("td")
            radek_text = tr.get_text(strip=True).lower()
            if je_druzstvo:
                if "celkem" in radek_text or "klasifikaci" in radek_text: continue
                if len(tds) >= 2:
                    datum_text = tds[1].get_text(strip=True) if len(tds) > 1 else ""
                    if not datum_je_platny(datum_text): continue
                    try:
                        b = int(tds[-1].get_text(strip=True))
                        if je_dvouhra: druz_dv_radky.append(b)
                        elif je_ctyrhra: druz_ct_radky.append(b)
                    except: pass
            else:
                if len(tds) < 3: continue
                if "celkem" in radek_text: continue
                if not datum_je_platny(tds[1].get_text(strip=True)): continue
                try:
                    b = int(tds[2].get_text(strip=True))
                    if je_dvouhra: dv.append(b)
                    elif je_ctyrhra: ct.append(b)
                except: pass

    druz_dv = sum(sorted(druz_dv_radky, reverse=True)[:4]) if druz_dv_radky else 0
    druz_ct = sum(sorted(druz_ct_radky, reverse=True)[:4]) if druz_ct_radky else 0

    vse_dv = dv + ([druz_dv] if druz_dv else [])
    vse_ct = ct + ([druz_ct] if druz_ct else [])

    top_dv = sorted(vse_dv, reverse=True)[:TOP_N]
    top_ct = sorted(vse_ct, reverse=True)[:TOP_N]

    A = sum(top_dv)
    B = sum(top_ct)
    return A + B, A, B, top_dv, top_ct

def main():
    for kat in KATEGORIE:
        print(f"\n{'='*40}")
        print(f"📡 {kat['slug']}")

        hraci = nacti_hraci_ze_zebricky(kat)
        print(f"   Celkem hráčů: {len(hraci)}")

        for i, h in enumerate(hraci, 1):
            if h.get("te_itf"):
                # TE/ITF hráči - ulož bez bodů
                sb.table("hraci").upsert({
                    "id": h["id"], "jmeno": h["jmeno"],
                    "narozeni": h["narozeni"], "klub": h["klub"],
                    "kategorie_slug": h["kategorie_slug"],
                    "te_itf": True, "te_itf_typ": h["te_itf_typ"],
                    "te_itf_poradi": h["te_itf_poradi"],
                    "body_celkem": 0, "body_dv": 0, "body_ct": 0,
                    "updated_at": datetime.now().isoformat(),
                }).execute()
                print(f"  [{i:>3}/{len(hraci)}] {h['jmeno']:30} TE/ITF {h['te_itf_typ']} {h['te_itf_poradi']}")
                continue

            print(f"  [{i:>3}/{len(hraci)}] {h['jmeno']:30}", end=" ", flush=True)
            try:
                csb, A, B, top_dv, top_ct = get_body_hrace(h["id"], OBDOBI[0]["sezona"], kat["klic"])
                time.sleep(0.5)
                csb2, A2, B2, top_dv2, top_ct2 = get_body_hrace(h["id"], OBDOBI[1]["sezona"], kat["klic"])
                time.sleep(0.5)

                # Spoj obě sezony
                vse_dv = top_dv + top_dv2
                vse_ct = top_ct + top_ct2
                fin_dv = sorted(vse_dv, reverse=True)[:TOP_N]
                fin_ct = sorted(vse_ct, reverse=True)[:TOP_N]
                fin_A = sum(fin_dv)
                fin_B = sum(fin_ct)

                sb.table("hraci").upsert({
                    "id": h["id"], "jmeno": h["jmeno"],
                    "narozeni": h["narozeni"], "klub": h["klub"],
                    "kategorie_slug": h["kategorie_slug"],
                    "body_dv": fin_A, "body_ct": fin_B,
                    "body_celkem": fin_A + fin_B,
                    "akce_dv": fin_dv, "akce_ct": fin_ct,
                    "te_itf": False, "updated_at": datetime.now().isoformat(),
                }, on_conflict="id,kategorie_slug").execute()
                print(f"dv:{fin_A} ct:{fin_B} = {fin_A+fin_B}")
            except Exception as e:
                print(f"CHYBA: {e}")
            time.sleep(1.0)

    print("\n✅ Hotovo!")

if __name__ == "__main__":
    main()
