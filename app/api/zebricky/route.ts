import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import fs from "fs"
import path from "path"

const TOP_N = 8

export async function GET() {
  // Načti JSON data
  const jsonPath = path.join(process.cwd(), "public/data/zebricky.json")
  const raw = fs.readFileSync(jsonPath, "utf-8")
  const data = JSON.parse(raw)

  // Načti všechny mezinárodní turnaje z Supabase
  const { data: mezinarodni } = await supabaseAdmin
    .from("mezinarodni_turnaje")
    .select("*")

  if (!mezinarodni || mezinarodni.length === 0) {
    return NextResponse.json(data)
  }

  // Pro každou kategorii přepočítej body hráčů s mezinárodními turnaji
  for (const slug of Object.keys(data)) {
    const kat = data[slug]
    if (!kat?.hraci) continue

    const turnajeTeto = mezinarodni.filter(t => t.kategorie_slug === slug)
    if (turnajeTeto.length === 0) continue

    const hraciSMezi = new Set(turnajeTeto.map(t => t.hrac_id))

    kat.hraci = kat.hraci.map(hrac => {
      if (!hraciSMezi.has(hrac.id)) return hrac

      const hracTurnaje = turnajeTeto.filter(t => t.hrac_id === hrac.id)

      // Vezmi uložené české akce + přidej mezinárodní
      const akce_dv = [...(hrac.akce_dv ?? []), ...hracTurnaje.map(t => t.body_dv).filter(b => b > 0)]
      const akce_ct = [...(hrac.akce_ct ?? []), ...hracTurnaje.map(t => t.body_ct).filter(b => b > 0)]

      // Přepočítej top 8
      const A = akce_dv.sort((a, b) => b - a).slice(0, TOP_N).reduce((s, b) => s + b, 0)
      const B = akce_ct.sort((a, b) => b - a).slice(0, TOP_N).reduce((s, b) => s + b, 0)

      return {
        ...hrac,
        body_dv: A,
        body_ct: B,
        body_celkem: A + B,
        ma_mezinarodni: true,
      }
    })

    // Přeseřaď
    kat.hraci.sort((a, b) => b.body_celkem - a.body_celkem)
    kat.hraci.forEach((h, i) => { h.poradi_live = i + 1 })
  }

  return NextResponse.json(data)
}
