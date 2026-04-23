import os
import time
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"])
GEO_KEY = os.environ["GOOGLE_GEOCODING_API_KEY"]

KRAJ_OBLAST = {
    "Praha": "Praha",
    "Středočeský": "Středočeský",
    "Jihočeský": "Jihočeský",
    "Plzeňský": "Plzeňský",
    "Karlovarský": "Karlovarský",
    "Ústecký": "Ústecký",
    "Liberecký": "Liberecký",
    "Královéhradecký": "Východočeský",
    "Pardubický": "Východočeský",
    "Vysočina": "Vysočina",
    "Jihomoravský": "Jihomoravský",
    "Olomoucký": "Olomoucký",
    "Zlínský": "Zlínský",
    "Moravskoslezský": "Moravskoslezský",
}

# Extrahuj město z názvu klubu
# TK Sparta Praha → Praha, LTC Pardubice → Pardubice
import re

def extrahuj_mesto(nazev):
    # Odstraň právní formy
    n = re.sub(r'\b(z\.s\.|o\.s\.|s\.r\.o\.|a\.s\.|p\.s\.|spolek|klub|academy|tennis|tenis|TC|TK|LTC|SK|TJ|AC|FC|DTK|BTK|HTK|ITS|NTC)\b', '', nazev, flags=re.IGNORECASE)
    n = re.sub(r'[,.]', ' ', n)
    n = ' '.join(n.split())
    return n.strip()

def geocode(nazev):
    mesto = extrahuj_mesto(nazev)
    if not mesto:
        return None, None, None, None
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": f"{mesto}, Czech Republic", "key": GEO_KEY, "language": "cs", "region": "cz"}
    r = requests.get(url, params=params, timeout=10)
    data = r.json()
    
    if data["status"] != "OK" or not data["results"]:
        return None, None, None, None
    
    result = data["results"][0]
    lat = result["geometry"]["location"]["lat"]
    lng = result["geometry"]["location"]["lng"]
    kraj = None
    oblast = None
    
    for comp in result["address_components"]:
        if "administrative_area_level_1" in comp["types"]:
            kraj_raw = comp["long_name"].replace(" kraj", "").replace(" Region", "").strip()
            kraj = kraj_raw
            for k, v in KRAJ_OBLAST.items():
                if k.lower() in kraj_raw.lower():
                    oblast = v
                    break
            if not oblast:
                oblast = kraj_raw
    
    return lat, lng, kraj, oblast

# Načti kluby
print("Načítám kluby z DB...")
vsechna_data = []
from_idx = 0
while True:
    data = sb.table("hraci").select("klub").range(from_idx, from_idx + 999).execute()
    if not data.data: break
    vsechna_data.extend(data.data)
    if len(data.data) < 1000: break
    from_idx += 1000

kluby = sorted(set(h["klub"] for h in vsechna_data if h.get("klub")))
print(f"Nalezeno {len(kluby)} klubů")

zpracovane = set()
existujici = sb.table("kluby").select("nazev, oblast").execute()
for r in existujici.data:
    if r.get("oblast"):
        zpracovane.add(r["nazev"])
print(f"Již zpracováno: {len(zpracovane)}")

for i, klub in enumerate(kluby):
    if klub in zpracovane:
        print(f"[{i+1}/{len(kluby)}] SKIP {klub}")
        continue
    lat, lng, kraj, oblast = geocode(klub)
    row = {"nazev": klub, "lat": lat, "lng": lng, "kraj": kraj, "oblast": oblast}
    sb.table("kluby").upsert(row, on_conflict="nazev").execute()
    status = f"✅ {oblast}" if oblast else "❌ nenalezen"
    print(f"[{i+1}/{len(kluby)}] {klub} → {status}")
    time.sleep(0.05)

print("\nHotovo!")
