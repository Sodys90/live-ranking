#!/usr/bin/env python3
"""
Týdenní scraper přes turnaje
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

# Prefix turnaje → kategorie slug
TURNAJ_PREFIX = {
    "7": "mladsi-zaci",   "8": "mladsi-zakyne",
    "5": "starsi-zaci",   "6": "starsi-zakyne",
    "3": "dorostenci",    "4": "dorostenky",
}

OBDOBI = [
    {"od": date(2025, 11, 1), "do": date(2026, 3, 31), "sezona": 2026},
    {"od": date(2025, 4,  1), "do": date(2025, 10, 31), "sezona": 2025},
]

URLS = [
    {"url": "mladsi-zactvo", "katy": {"7": "mladsi-zaci",  "8": "mladsi-zakyne"}},
    {"url": "starsi-zactvo", "katy": {"5": "starsi-zaci",  "6": "starsi-zakyne"}},
    {"url": "dorost",        "katy": {"3": "dorostenci",   "4": "dorostenky"}},
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

def parse_datum_konec(datum_str):
    rok = date.today().year
    m = re.search(r'(\d{1,2})\.-(\d{1,2})\.(\d{2})\.', datum_str)
    if m:
        return date(rok, int(m.group(3)), int(m.group(2)))
    m2 = re.search(r'(\d{1,2})\.(\d{2})\.', datum_str)
    if m2:
        return date(rok, int(m2.group(2)), int(m2.group(1)))
    return None

def get_turnaje_s_vysledky(url_base):
    url = f"{BASE_URL}/{url_base}/jednotlivci"
    soup = get_soup(url)
    turnaje = []
    dnes = date.today()
    seen = set()
    aktualni_datum = None

    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 3: continue
        for row in rows[1:]:
            tds = row.find_all("td")
            if not tds: continue
            prvni = tds[0].get_text(strip=True)
            if re.search(r"\d{1,2}\..*\d{2}\.", prvni):
                aktualni_datum = parse_datum_konec(prvni)
            for td in tds:
                for a in td.find_all("a", href=True):
                    href = a["href"]
                    if "/turnaj/" in href and "vysledky" in href:
                        parts = href.split("/")
                        try:
                            idx = parts.index("turnaj")
                            kod = parts[idx+1]
                            sezona = parts[idx+3] if len(parts) > idx+3 else "L26"
                            if aktualni_datum and (dnes - aktualni_datum).days < 3:
                                continue
                            if kod not in seen:
                                seen.add(kod)
                                turnaje.append({
                                    "kod":    kod,
                                    "sezona": sezona,
                                    "url":    BASE_URL + href,
                                    "datum":  aktualni_datum.isoformat() if aktualni_datum else None,
                                })
                        except: pass
        break
    return turnaje

def get_hraci_z_turnaje(turnaj_url):
    soup = get_soup(turnaj_url)
    hraci = set()
    for a in soup.find_all("a", href=True):
        if "/hrac/" in a["href"]:
            hrac_id = a["href"].split("/hrac/")[1].split("/")[0]
            if hrac_id.isdigit():
                hraci.add(hrac_id)
    return list(hraci)

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
    return sum(top_dv) + sum(top_ct), sum(top_dv), sum(top_ct), top_dv, top_ct

def prepocitej_zebricky():
    output = {}
    for kat in KATEGORIE_URL:
        res = sb.table("hraci").select("*").eq("kategorie_slug", kat["slug"]).execute()
        hraci = res.data if res.data else []

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

def main():
    aktualizovano_hraci = set()

    for url_group in URLS:
        print(f"\n{'='*40}")
        print(f"📡 {url_group['url']}")

        turnaje = get_turnaje_s_vysledky(url_group["url"])
        print(f"   Turnajů celkem: {len(turnaje)}")

        for prefix, slug in url_group["katy"].items():
            kat_turnaje = [t for t in turnaje if t["kod"].startswith(prefix)]
            kat_id = next(k["kat_id"] for k in KATEGORIE_URL if k["slug"] == slug)
            klic = SEKCE_KLICOVA_SLOVA[kat_id]

            zpracovane_res = sb.table("turnaje").select("id").eq("zpracovano", True).eq("kategorie_slug", slug).execute()
            zpracovane = {r["id"] for r in (zpracovane_res.data or [])}
            nove = [t for t in kat_turnaje if f'{t["kod"]}_{slug}' not in zpracovane]
            print(f"   {slug}: {len(nove)} nových turnajů")

            for t in nove:
                print(f"     Turnaj {t['kod']}...", end=" ", flush=True)
                try:
                    hraci_ids = get_hraci_z_turnaje(t["url"])
                    print(f"{len(hraci_ids)} hráčů", end=" ", flush=True)

                    if not hraci_ids:
                        print("(přeskočeno)")
                        continue

                    for hrac_id in hraci_ids:
                        if hrac_id in aktualizovano_hraci:
                            continue
                        try:
                            csb, A, B, top_dv, top_ct = vypocti_body(hrac_id, klic)
                            existing = sb.table("hraci").select("id").eq("id", hrac_id).execute()
                            if existing.data:
                                sb.table("hraci").update({
                                    "body_dv":     A,
                                    "body_ct":     B,
                                    "body_celkem": csb,
                                    "akce_dv":     top_dv,
                                    "akce_ct":     top_ct,
                                    "updated_at":  datetime.now().isoformat(),
                                }).eq("id", hrac_id).execute()
                            else:
                                profil = get_soup(f"{BASE_URL}/hrac/{hrac_id}", "post", {"volba":"1","sezona":"2026"})
                                jmeno_tag = profil.find("h2")
                                jmeno = jmeno_tag.get_text(strip=True) if jmeno_tag else f"Hráč {hrac_id}"
                                nar_tag = profil.find("td", string=lambda t: t and "Rok narození" in t)
                                narozeni = nar_tag.find_next("td").get_text(strip=True) if nar_tag else ""
                                klub_tag = profil.find("td", string=lambda t: t and "Klub" in t)
                                klub = klub_tag.find_next("td").get_text(strip=True) if klub_tag else ""
                                # Urči správnou kategorii z prefixu turnaje
                            t_prefix = t["kod"][0]
                            spravny_slug = TURNAJ_PREFIX.get(t_prefix, slug)
                            sb.table("hraci").upsert({
                                    "id":            hrac_id,
                                    "jmeno":         jmeno,
                                    "narozeni":      narozeni,
                                    "klub":          klub,
                                    "kategorie_slug": spravny_slug,
                                    "body_dv":       A,
                                    "body_ct":       B,
                                    "body_celkem":   csb,
                                    "akce_dv":       top_dv,
                                    "akce_ct":       top_ct,
                                    "updated_at":    datetime.now().isoformat(),
                                }).execute()
                            aktualizovano_hraci.add(hrac_id)
                        except Exception as e:
                            print(f"\n      CHYBA hráč {hrac_id}: {e}")
                        time.sleep(1.0)

                    sb.table("turnaje").upsert({
                        "id":            f'{t["kod"]}_{slug}',
                        "sezona":        t["sezona"],
                        "kategorie_slug": slug,
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
