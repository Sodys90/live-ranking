#!/usr/bin/env python3
"""
Scraper živého žebříčku ČTS
Kategorie: mladší žáci/žákyně, starší žáci/žákyně, dorostenci/dorostenky
Výstup: data/zebricky.json
"""

import requests, time, json, re, os
from bs4 import BeautifulSoup
from datetime import date, datetime

BASE_URL = "https://cztenis.cz"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
TOP_N    = 8

KATEGORIE = [
    {"id": "22", "slug": "mladsi-zaci",    "nazev": "Mladší žáci",    "url_base": "mladsi-zactvo"},
    {"id": "23", "slug": "mladsi-zakyne",  "nazev": "Mladší žákyně",  "url_base": "mladsi-zactvo"},
    {"id": "25", "slug": "starsi-zaci",    "nazev": "Starší žáci",    "url_base": "starsi-zactvo"},
    {"id": "26", "slug": "starsi-zakyne",  "nazev": "Starší žákyně",  "url_base": "starsi-zactvo"},
    {"id": "20", "slug": "dorostenci",     "nazev": "Dorostenci",     "url_base": "dorost"},
    {"id": "21", "slug": "dorostenky",     "nazev": "Dorostenky",     "url_base": "dorost"},
]

OBDOBI = [
    {"od": date(2025, 11, 1), "do": date(2026, 3, 31), "sezona": 2026},
    {"od": date(2025, 4,  1), "do": date(2025, 10, 31), "sezona": 2025},
]

# Povolené ročníky pro každou kategorii (aktualizovat po letní sezoně)
ROCNIKY = {
    "22": [2014, 2015, 2016],           # mladší žáci
    "23": [2014, 2015, 2016],           # mladší žákyně
    "25": [2012, 2013, 2014, 2015, 2016],  # starší žáci
    "26": [2012, 2013, 2014, 2015, 2016],  # starší žákyně
    "20": [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],  # dorostenci
    "21": [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],  # dorostenky
}

# Klíčová slova sekcí podle kategorie
SEKCE_KLICOVA_SLOVA = {
    "22": "mladší žactvo", "23": "mladší žactvo",
    "25": "starší žactvo", "26": "starší žactvo",
    "20": "dorost",        "21": "dorost",
}

def get_soup_get(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")

def get_soup_post(url, data):
    for attempt in range(3):
        r = requests.post(url, headers=HEADERS, data=data, timeout=15)
        if r.status_code == 429:
            wait = 30 * (attempt + 1)
            print(f"    429 - čekám {wait}s...")
            time.sleep(wait)
            continue
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    raise Exception("429 Too Many Requests po 3 pokusech")

def datum_je_platny(datum_str):
    if not datum_str:
        return True
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', datum_str)
    if not m:
        m2 = re.search(r'(\d{4})-(\d{2})-(\d{2})', datum_str)
        if not m2:
            return True
        d = date(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))
    else:
        d = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    return any(o["od"] <= d <= o["do"] for o in OBDOBI)

def parse_hraci_z_tabulky(soup):
    hraci = []
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if not rows: continue
        if "suma" not in rows[0].get_text().lower(): continue
        for row in rows[1:]:
            tds = row.find_all("td")
            if len(tds) < 8: continue
            link = tds[2].find("a")
            if not link: continue
            hrac_id = link["href"].split("/hrac/")[1].split("/")[0]
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
            hraci.append({
                "id":            hrac_id,
                "jmeno":         tds[2].get_text(strip=True),
                "narozeni":      tds[3].get_text(strip=True),
                "klub":          tds[4].get_text(strip=True),
                "dvouhra":       dvouhra_raw,
                "ctyrhra":       ctyrhra_raw,
                "suma_oficial":  suma_oficial,
                "te_itf":        te_itf,
                "te_itf_typ":    te_itf_typ,
                "te_itf_poradi": te_itf_poradi,
            })
        break
    return hraci

def get_hraci_ze_zebricky(url_base, kategorie_id):
    url   = f"{BASE_URL}/{url_base}/zebricky/"
    hraci = []
    limit = 0

    while True:
        print(f"    Stránka offset {limit}...", end=" ", flush=True)
        if limit == 0:
            soup = get_soup_post(url, {
                "volba": "1", "sezona": "2026-L",
                "kategorie": kategorie_id, "region": "-1", "hrac": "",
            })
        else:
            next_url = f"{BASE_URL}/post/1/volba/2/sezona/2026-L/kategorie/{kategorie_id}/region/-1/hrac/-/limit/{limit}/limit_next/1"
            soup = get_soup_get(next_url)

        nova_davka = parse_hraci_z_tabulky(soup)
        print(f"{len(nova_davka)} hráčů")

        if not nova_davka:
            break

        hraci += nova_davka

        # Zastav po první stránce (top 100)
        break

    return hraci

def get_body_hrace(hrac_id, sezona, klic_slovo):
    url  = f"{BASE_URL}/hrac/{hrac_id}"
    soup = get_soup_post(url, {"volba": "1", "sezona": str(sezona)})
    dv, ct = [], []
    druz_dv_radky, druz_ct_radky = [], []

    for h3 in soup.find_all("h3"):
        text = h3.get_text(strip=True).lower()
        if klic_slovo not in text: continue
        tabulka = h3.parent.find("table")
        if not tabulka: continue

        je_druzstvo = "družstva" in text
        je_ctyrhra  = "čtyřhra" in text
        je_dvouhra  = "dvouhra" in text

        for tr in tabulka.find_all("tr"):
            tds = tr.find_all("td")
            radek_text = tr.get_text(strip=True).lower()

            if je_druzstvo:
                if "celkem" in radek_text or "klasifikaci" in radek_text:
                    continue
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
                datum_text = tds[1].get_text(strip=True)
                if not datum_je_platny(datum_text): continue
                try:
                    b = int(tds[2].get_text(strip=True))
                    if je_dvouhra: dv.append(b)
                    elif je_ctyrhra: ct.append(b)
                except: pass

    druz_dv = sum(sorted(druz_dv_radky, reverse=True)[:4]) if druz_dv_radky else 0
    druz_ct = sum(sorted(druz_ct_radky, reverse=True)[:4]) if druz_ct_radky else 0
    return dv, ct, druz_dv, druz_ct

def vypocti_body(hrac_id, klic_slovo):
    csb, A, B, _, _ = vypocti_body_s_akcemi(hrac_id, klic_slovo)
    return csb, A, B

def vypocti_body_s_akcemi(hrac_id, klic_slovo):
    dv_all, ct_all = [], []
    druz_dv_list, druz_ct_list = [], []

    for obdobi in OBDOBI:
        dv, ct, druz_dv, druz_ct = get_body_hrace(hrac_id, obdobi["sezona"], klic_slovo)
        time.sleep(1.0)
        dv_all += dv
        ct_all += ct
        if druz_dv: druz_dv_list.append(druz_dv)
        if druz_ct: druz_ct_list.append(druz_ct)

    vse_dv = dv_all + druz_dv_list
    vse_ct = ct_all + druz_ct_list

    top_dv = sorted(vse_dv, reverse=True)[:TOP_N]
    top_ct = sorted(vse_ct, reverse=True)[:TOP_N]

    A = sum(top_dv)
    B = sum(top_ct)
    return A + B, A, B, top_dv, top_ct

def scrape_kategorie(kat):
    print(f"\n{'='*50}")
    print(f"📡 {kat['nazev']} (ID: {kat['id']})")

    hraci = get_hraci_ze_zebricky(kat["url_base"], kat["id"])
    print(f"   Načteno hráčů: {len(hraci)}")

    klic = SEKCE_KLICOVA_SLOVA[kat["id"]]
    povolene_rocniky = ROCNIKY.get(kat["id"], [])

    # Filtruj hráče podle ročníku
    if povolene_rocniky:
        pred = len(hraci)
        hraci = [h for h in hraci if h.get("narozeni") and int(h["narozeni"]) in povolene_rocniky]
        print(f"   Filtrováno dle ročníku: {pred} → {len(hraci)} hráčů")

    vysledky = []

    for i, h in enumerate(hraci, 1):
        print(f"  [{i:>3}/{len(hraci)}] {h['jmeno']:30}", end=" ", flush=True)
        try:
            csb, A, B, akce_dv, akce_ct = vypocti_body_s_akcemi(h["id"], klic)
            h["body_dv"] = A
            h["body_ct"] = B
            h["body_celkem"] = csb
            h["akce_dv"] = akce_dv
            h["akce_ct"] = akce_ct
            print(f"dv:{A} ct:{B} = {csb}")
        except Exception as e:
            print(f"CHYBA: {e}")
            h["body_dv"] = h["body_ct"] = h["body_celkem"] = 0
            h["akce_dv"] = []
            h["akce_ct"] = []
        vysledky.append(h)
        time.sleep(1.5)

    # Při shodě bodů seřaď abecedně (Článek 26)
    vysledky.sort(key=lambda x: (-x["body_celkem"], x["jmeno"]))
    poradi = 1
    for i, h in enumerate(vysledky):
        if i > 0 and vysledky[i]["body_celkem"] == vysledky[i-1]["body_celkem"]:
            h["poradi_live"] = vysledky[i-1]["poradi_live"]  # stejné pořadí
        else:
            h["poradi_live"] = poradi
        poradi += 1

    return vysledky

def main():
    os.makedirs("public/data", exist_ok=True)
    output = {}

    for kat in KATEGORIE:
        try:
            hraci = scrape_kategorie(kat)
            output[kat["slug"]] = {
                "nazev":       kat["nazev"],
                "aktualizace": datetime.now().isoformat(),
                "hraci":       hraci,
            }
            # Uložit průběžně
            with open("public/data/zebricky.json", "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"CHYBA kategorie {kat['nazev']}: {e}")

    print(f"\n✅ Hotovo: data/zebricky.json")
    uloz_historii(output)

if __name__ == "__main__":
    main()

# ── Uložení historie pořadí do Supabase ──────────────────────────────────────
def uloz_historii(output: dict):
    try:
        from supabase import create_client
        import os
        from dotenv import load_dotenv
        load_dotenv(".env.local")

        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            print("⚠ Supabase klíče nenalezeny, historie neuložena")
            return

        sb = create_client(url, key)
        dnes = datetime.now().date().isoformat()
        zaznamy = []

        for slug, kat in output.items():
            for h in kat.get("hraci", []):
                if h.get("te_itf"):
                    continue
                zaznamy.append({
                    "hrac_id":       h["id"],
                    "kategorie_slug": slug,
                    "poradi":        h.get("poradi_live", 0),
                    "body_celkem":   h.get("body_celkem", 0),
                    "body_dv":       h.get("body_dv", 0),
                    "body_ct":       h.get("body_ct", 0),
                    "datum":         dnes,
                })

        if zaznamy:
            # Smaž dnešní záznamy (při opakovaném spuštění)
            sb.table("historie_poradi").delete().eq("datum", dnes).execute()
            # Vlož nové po 100
            for i in range(0, len(zaznamy), 100):
                sb.table("historie_poradi").insert(zaznamy[i:i+100]).execute()
            print(f"✅ Historie uložena: {len(zaznamy)} záznamů")
    except Exception as e:
        print(f"⚠ Chyba při ukládání historie: {e}")
