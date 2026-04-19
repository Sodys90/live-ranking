#!/usr/bin/env python3
"""
Týdenní scraper přes turnaje
1. Načte seznam turnajů které skončily
2. Pro každý turnaj stáhne hráče
3. Aktualizuje jen tyto hráče v Supabase
4. Přepočítá žebříček
"""

import requests, time, re, os, json
from bs4 import BeautifulSoup
from datetime import date, datetime, timedelta
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

BASE_URL = "https://cztenis.cz"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
TOP_N    = 8

sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

KATEGORIE_URL = [
    {"slug": "mladsi-zaci",   "url": "mladsi-zactvo", "kat_id": "22"},
    {"slug": "mladsi-zakyne", "url": "mladsi-zactvo", "kat_id": "23"},
    {"slug": "starsi-zaci",   "url": "starsi-zactvo", "kat_id": "25"},
    {"slug": "starsi-zakyne", "url": "starsi-zactvo", "kat_id": "26"},
    {"slug": "dorostenci",    "url": "dorost",        "kat_id": "20"},
    {"slug": "dorostenky",    "url": "dorost",        "kat_id": "21"},
]

SEKCE_KLICOVA_SLOVA = {
    "22": "mladší žactvo", "23": "mladší žactvo",
    "25": "starší žactvo", "26": "starší žactvo",
    "20": "dorost",        "21": "dorost",
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
    raise Exception("429 Too Many Requests")

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

# ── 1) Načti turnaje které skončily ─────────────────────────────────────────
def get_turnaje_s_vysledky(url_base):
    url = f"{BASE_URL}/{url_base}/jednotlivci"
    soup = get_soup(url)
    turnaje = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/turnaj/" in href and "vysledky" in href:
            # Extrahuj kod a sezonu
            parts = href.split("/")
            try:
                idx = parts.index("turnaj")
                kod = parts[idx+1]
                sezona = parts[idx+3] if len(parts) > idx+3 else "L26"
                turnaje.append({
                    "kod": kod,
                    "sezona": sezona,
                    "url": BASE_URL + href,
                })
            except: pass
    # Deduplikuj
    seen = set()
    unique = []
    for t in turnaje:
        key = t["kod"]
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique

# ── 2) Načti hráče z turnaje ─────────────────────────────────────────────────
def get_hraci_z_turnaje(turnaj_url):
    soup = get_soup(turnaj_url)
    hraci = set()
    for a in soup.find_all("a", href=True):
        if "/hrac/" in a["href"]:
            hrac_id = a["href"].split("/hrac/")[1].split("/")[0]
            if hrac_id.isdigit():
                hraci.add(hrac_id)
    return list(hraci)

# ── 3) Načti body hráče ───────────────────────────────────────────────────────
def get_body_hrace(hrac_id, sezona, klic_slovo):
    url = f"{BASE_URL}/hrac/{hrac_id}"
    soup = get_soup(url, "post", {"volba": "1", "sezona": str(sezona)})
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
    dv_all, ct_all = [], []
    druz_dv_list, druz_ct_list = [], []
    for obdobi in OBDOBI:
        dv, ct, druz_dv, druz_ct = get_body_hrace(hrac_id, obdobi["sezona"], klic_slovo)
        time.sleep(0.5)
        dv_all += dv; ct_all += ct
        if druz_dv: druz_dv_list.append(druz_dv)
        if druz_ct: druz_ct_list.append(druz_ct)
    vse_dv = dv_all + druz_dv_list
    vse_ct = ct_all + druz_ct_list
    top_dv = sorted(vse_dv, reverse=True)[:TOP_N]
    top_ct = sorted(vse_ct, reverse=True)[:TOP_N]
    A = sum(top_dv)
    B = sum(top_ct)
    return A + B, A, B, top_dv, top_ct

# ── 4) Přepočítej žebříček a ulož JSON ───────────────────────────────────────
def prepocitej_zebricky():
    output = {}
    for kat in KATEGORIE_URL:
        res = sb.table("hraci").select("*").eq("kategorie_slug", kat["slug"]).execute()
        hraci = res.data if res.data else []

        # Přidej mezinárodní body
        mezi_res = sb.table("mezinarodni_turnaje").select("*").eq("kategorie_slug", kat["slug"]).execute()
        mezi = mezi_res.data if mezi_res.data else []

        for h in hraci:
            if h.get("te_itf"): continue
            h_mezi = [m for m in mezi if m["hrac_id"] == h["id"]]
            if h_mezi:
                akce_dv = list(h.get("akce_dv") or []) + [m["body_dv"] for m in h_mezi if m["body_dv"] > 0]
                akce_ct = list(h.get("akce_ct") or []) + [m["body_ct"] for m in h_mezi if m["body_ct"] > 0]
                h["body_dv"] = sum(sorted(akce_dv, reverse=True)[:TOP_N])
                h["body_ct"] = sum(sorted(akce_ct, reverse=True)[:TOP_N])
                h["body_celkem"] = h["body_dv"] + h["body_ct"]
                h["ma_mezinarodni"] = True

        # Seřaď
        hraci.sort(key=lambda x: (-x.get("body_celkem", 0), x.get("jmeno", "")))
        poradi = 1
        for i, h in enumerate(hraci):
            if h.get("te_itf"): continue
            if i > 0 and not hraci[i-1].get("te_itf") and h["body_celkem"] == hraci[i-1]["body_celkem"]:
                h["poradi_live"] = hraci[i-1]["poradi_live"]
            else:
                h["poradi_live"] = poradi
            poradi += 1

        output[kat["slug"]] = {
            "nazev":       kat["slug"],
            "aktualizace": datetime.now().isoformat(),
            "hraci":       hraci,
        }

    os.makedirs("public/data", exist_ok=True)
    with open("public/data/zebricky.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("✅ zebricky.json aktualizován")

# ── Hlavní logika ─────────────────────────────────────────────────────────────
def main():
    aktualizovano_hraci = set()

    for kat in KATEGORIE_URL:
        print(f"\n{'='*40}")
        print(f"📡 {kat['slug']}")

        turnaje = get_turnaje_s_vysledky(kat["url"])
        print(f"   Turnajů s výsledky: {len(turnaje)}")

        klic = SEKCE_KLICOVA_SLOVA[kat["kat_id"]]

        # Načti všechny zpracované turnaje najednou
        zpracovane_res = sb.table("turnaje").select("id").eq("zpracovano", True).execute()
        zpracovane = {r["id"] for r in (zpracovane_res.data or [])}
        nove_turnaje = [t for t in turnaje if t["kod"] not in zpracovane]
        print(f"   Nových turnajů ke zpracování: {len(nove_turnaje)}")

        for t in nove_turnaje:

            print(f"   Turnaj {t['kod']}...", end=" ", flush=True)

            try:
                hraci_ids = get_hraci_z_turnaje(t["url"])
                print(f"{len(hraci_ids)} hráčů", end=" ", flush=True)

                # Aktualizuj jen hráče kteří ještě nebyli aktualizováni
                for hrac_id in hraci_ids:
                    if hrac_id in aktualizovano_hraci:
                        continue
                    try:
                        csb, A, B, top_dv, top_ct = vypocti_body(hrac_id, klic)
                        sb.table("hraci").upsert({
                            "id":            hrac_id,
                            "kategorie_slug": kat["slug"],
                            "body_dv":       A,
                            "body_ct":       B,
                            "body_celkem":   csb,
                            "akce_dv":       top_dv,
                            "akce_ct":       top_ct,
                            "updated_at":    datetime.now().isoformat(),
                        }).execute()
                        aktualizovano_hraci.add(hrac_id)
                    except Exception as e:
                        print(f"\n    CHYBA hráč {hrac_id}: {e}")
                    time.sleep(1.0)

                # Označ turnaj jako zpracovaný
                sb.table("turnaje").upsert({
                    "id":            t["kod"],
                    "sezona":        t["sezona"],
                    "kategorie_slug": kat["slug"],
                    "vysledky_url":  t["url"],
                    "zpracovano":    True,
                }).execute()
                print("✓")

            except Exception as e:
                print(f"CHYBA: {e}")

            time.sleep(1.0)

    print(f"\n📊 Aktualizováno hráčů: {len(aktualizovano_hraci)}")
    prepocitej_zebricky()

if __name__ == "__main__":
    main()
