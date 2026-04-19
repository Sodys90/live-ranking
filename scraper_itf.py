#!/usr/bin/env python3
"""
Scraper ITF žebříčku a výsledků českých juniorů
Stahuje z ITF API a ukládá mezinárodní turnaje do Supabase
"""

import requests, time, os, re
from datetime import datetime, date
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

BASE_URL = "https://www.itftennis.com/tennis/api"
HEADERS  = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}

# Mapování ITF kategorie → naše kategorie z Tabulky IV
ITF_KAT = {
    "J30": 12, "J60": 13, "J100": 14, "J200": 15,
    "J300": 16, "J500": 17, "J-A": 19, "GS": 21,
}

# Mapování kola → naše umístění
ROUND_MAP = {
    "Final": "F",
    "Semi-final": "SF",
    "Quarter-final": "8",
    "Round of 16": "16",
    "Round of 32": "32",
    "Round of 64": "64",
    "Round of 128": "128",
}

# Klasifikační období
OBDOBI_OD = date(2025, 4, 1)
OBDOBI_DO = date(2026, 3, 31)

def parse_datum(dates_str):
    """Parsuje '06 Apr to 11 Apr 2026' → date konce"""
    try:
        # Vezmi datum konce (po 'to')
        cast = dates_str.split(" to ")[-1].strip()
        return datetime.strptime(cast, "%d %b %Y").date()
    except:
        return None

def urcit_umisteni(events):
    """Z výsledků zápasů urči nejlepší umístění"""
    nejlepsi = None
    priorita = list(ROUND_MAP.keys())

    for event in events:
        for match in event.get("matches", []):
            kolo = match.get("roundGroup", {}).get("Value", "")
            result = match.get("resultCode", "")

            if result == "L" and kolo in ROUND_MAP:
                # Prohra v tomto kole = umístění odpovídá tomuto kolu
                idx = priorita.index(kolo) if kolo in priorita else 999
                if nejlepsi is None or idx < priorita.index(nejlepsi):
                    nejlepsi = kolo
            elif result == "W" and kolo == "Final":
                nejlepsi = "Final_win"

    if nejlepsi == "Final_win":
        return "V"
    if nejlepsi and nejlepsi in ROUND_MAP:
        return ROUND_MAP[nejlepsi]
    return None

def get_tabulka_iv(kat, umisteni):
    """Body z Tabulky IV"""
    TABULKA = {
        12: {"V":200,"F":138,"SF":96,"8":67,"16":47,"32":33,"64":23,"128":16},
        13: {"V":230,"F":159,"SF":110,"8":76,"16":53,"32":37,"64":26,"128":18},
        14: {"V":260,"F":180,"SF":125,"8":87,"16":60,"32":42,"64":29,"128":20},
        15: {"V":300,"F":207,"SF":143,"8":99,"16":69,"32":48,"64":34,"128":23},
        16: {"V":340,"F":235,"SF":163,"8":113,"16":78,"32":54,"64":38,"128":26},
        17: {"V":380,"F":263,"SF":182,"8":126,"16":87,"32":60,"64":42,"128":29},
        19: {"V":460,"F":318,"SF":220,"8":152,"16":105,"32":73,"64":51,"128":35},
        21: {"V":600,"F":414,"SF":286,"8":198,"16":137,"32":95,"64":66,"128":46},
    }
    return TABULKA.get(kat, {}).get(umisteni, 0)

def get_itf_poradi_czesi(player_type):
    """Načti české hráče z ITF žebříčku"""
    url = f"{BASE_URL}/PlayerRankApi/GetPlayerRankings"
    czesi = []
    skip = 0

    while True:
        params = {
            "circuitCode": "JT",
            "playerTypeCode": player_type,
            "ageCategoryCode": "",
            "juniorRankingType": "itf",
            "take": 100,
            "skip": skip,
            "isOrderAscending": "true",
            "nationCode": "CZE",
            "gender": player_type,
        }
        r = requests.get(url, params=params, headers=HEADERS, timeout=15)
        try:
            data = r.json()
        except:
            time.sleep(10)
            continue
        items = data.get("items", [])
        if not items: break
        czesi += items
        if len(items) < 100: break
        skip += 100
        time.sleep(0.5)

    return czesi

def get_activity(player_id, match_type="S"):
    """Načti výsledky turnajů hráče"""
    url = f"{BASE_URL}/PlayerApi/GetPlayerActivity"
    params = {
        "circuitCode": "JT",
        "matchTypeCode": match_type,
        "playerId": player_id,
        "skip": 0,
        "surfaceCode": "",
        "take": 100,
        "tourCategoryCode": "",
        "year": "",
    }
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=15)
            return r.json().get("items", [])
        except Exception as e:
            print(f"    retry {attempt+1}/3...")
            time.sleep(10 * (attempt + 1))
    return []

def urci_kategorii_slug(gender, birth_year):
    """Urči kategorii dle pohlaví a ročníku"""
    if gender == "M":
        if birth_year in [2008,2009,2010,2011,2012,2013,2014,2015,2016]:
            if birth_year in [2008,2009,2010,2011]: return "dorostenci"
            if birth_year in [2012,2013]: return "starsi-zaci"
            return "mladsi-zaci"
    else:
        if birth_year in [2008,2009,2010,2011,2012,2013,2014,2015,2016]:
            if birth_year in [2008,2009,2010,2011]: return "dorostenky"
            if birth_year in [2012,2013]: return "starsi-zakyne"
            return "mladsi-zakyne"
    return None

def main():
    print("🎾 ITF scraper — čeští junioři")

    for gender, label, player_type in [("M", "Muži", "B"), ("F", "Ženy", "G")]:
        print(f"\n{'='*40}")
        print(f"📡 {label}")

        czesi = get_itf_poradi_czesi(player_type)
        print(f"   Českých hráčů v ITF žebříčku: {len(czesi)}")

        for hrac in czesi:
            player_id = hrac["playerId"]
            jmeno = f"{hrac['playerGivenName']} {hrac['playerFamilyName']}"
            itf_poradi = hrac["rank"]
            birth_year = hrac.get("birthYear")
            kat_slug = urci_kategorii_slug(gender, birth_year)

            if not kat_slug:
                print(f"  SKIP {jmeno} (ročník {birth_year} — mimo kategorie)")
                continue

            print(f"  {jmeno} (ITF #{itf_poradi}, {birth_year}) → {kat_slug}")

            # Aktualizuj ITF pořadí v tabulce hraci
            existing = sb.table("hraci").select("id").eq("id", str(player_id)).execute()
            if existing.data:
                sb.table("hraci").update({
                    "te_itf": True,
                    "te_itf_typ": "ITF",
                    "te_itf_poradi": itf_poradi,
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", str(player_id)).execute()
                print(f"    ITF #{itf_poradi} aktualizováno v hraci")

            # Načti výsledky turnajů
            turnaje_dv = get_activity(player_id, "S")
            turnaje_ct = get_activity(player_id, "D")
            time.sleep(0.5)

            ulozeno = 0
            for t in turnaje_dv:
                datum_konec = parse_datum(t.get("dates", ""))
                if not datum_konec: continue
                if not (OBDOBI_OD <= datum_konec <= OBDOBI_DO): continue

                typ = t.get("tourCode", "")
                kat_turnaje = ITF_KAT.get(typ)
                if not kat_turnaje: continue

                umisteni_dv = urcit_umisteni(t.get("events", []))
                if not umisteni_dv: continue

                body_dv = get_tabulka_iv(kat_turnaje, umisteni_dv)

                # Najdi stejný turnaj v čtyřhře
                body_ct = 0
                umisteni_ct = None
                for tc in turnaje_ct:
                    if tc.get("tournamentName") == t.get("tournamentName"):
                        umisteni_ct = urcit_umisteni(tc.get("events", []))
                        if umisteni_ct:
                            # Čtyřhra = o 2 kola zpět
                            umisteni_list = ["V","F","SF","8","16","32","64","128"]
                            idx = umisteni_list.index(umisteni_ct) if umisteni_ct in umisteni_list else -1
                            if idx >= 0:
                                idx_ct = idx + 2
                                if idx_ct < len(umisteni_list):
                                    body_ct = get_tabulka_iv(kat_turnaje, umisteni_list[idx_ct])
                        break

                # Ulož do mezinarodni_turnaje
                nazev_t = t.get("tournamentName", typ)
                ex = sb.table("mezinarodni_turnaje").select("id").eq("hrac_id", str(player_id)).eq("nazev", nazev_t).execute()
                if ex.data:
                    sb.table("mezinarodni_turnaje").update({"umisteni_dv": umisteni_dv, "body_dv": body_dv, "umisteni_ct": umisteni_ct, "body_ct": body_ct}).eq("id", ex.data[0]["id"]).execute()
                else:
                    sb.table("mezinarodni_turnaje").insert({"hrac_id": str(player_id), "hrac_jmeno": jmeno, "kategorie_slug": kat_slug, "datum": datum_konec.isoformat(), "nazev": nazev_t, "typ": typ, "kategorie_turnaje": kat_turnaje, "umisteni_dv": umisteni_dv, "body_dv": body_dv, "umisteni_ct": umisteni_ct, "body_ct": body_ct}).execute()
                ulozeno += 1
                print(f"    ✓ {t.get('tournamentName')} {datum_konec} → {umisteni_dv} ({body_dv}b dv, {body_ct}b ct)")

            if ulozeno == 0:
                print(f"    Žádné relevantní turnaje")

            time.sleep(1.0)

    print("\n✅ ITF scraper hotov")

if __name__ == "__main__":
    main()
