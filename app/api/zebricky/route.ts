import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Mladší žáci" },
  { slug: "mladsi-zakyne", nazev: "Mladší žákyně" },
  { slug: "starsi-zaci",   nazev: "Starší žáci" },
  { slug: "starsi-zakyne", nazev: "Starší žákyně" },
  { slug: "dorostenci",    nazev: "Dorostenci" },
  { slug: "dorostenky",    nazev: "Dorostenky" },
  { slug: "muzi",          nazev: "Muži" },
  { slug: "zeny",          nazev: "Ženy" },
]

const TYP_PRIORITY: Record<string,number> = { ATP:0, WTA:0, ITF:1, TE:2 }

function vypocitejBH(poradi: number, pocetSBody: number): number {
  if (pocetSBody <= 0) return 1
  const bs = [
    [5,60],[7,45],[9,35],[12,30],[27,25],[28,20],[42,15],[70,12],[100,9]
  ] as [number,number][]
  let hranice = 0
  for (const [pocet, bh] of bs) {
    hranice += pocet
    if (poradi <= hranice) return bh
  }
  const zbyvajici = pocetSBody - hranice
  if (zbyvajici <= 0) return 1
  const tretina = Math.max(1, Math.floor(zbyvajici / 3))
  if (poradi <= hranice + tretina) return 6
  if (poradi <= hranice + 2 * tretina) return 4
  if (poradi <= hranice + 3 * tretina) return 3
  return 1
}

export async function GET() {
  // Načti všechny hráče ze Supabase se stránkováním
  const vsichniHraci: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("hraci")
      .select("*")
      .range(from, from + 999)
    if (error || !data || data.length === 0) break
    vsichniHraci.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  // Načti aktivní ITF hráče
  const { data: itfData } = await supabaseAdmin
    .from("itf_hrace")
    .select("*")
    .eq("aktivni", true)

  const itfMap: Record<string,any> = {}
  for (const r of itfData ?? []) {
    itfMap[`${r.hrac_id}__${r.kategorie_slug}`] = r
  }

  // Načti datum poslední aktualizace
  const { data: posledni } = await supabaseAdmin
    .from("hraci")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
  const aktualizace = posledni?.[0]?.updated_at ?? new Date().toISOString()

  const output: Record<string,any> = {}

  for (const kat of KATEGORIE) {
    const hraci = vsichniHraci
      .filter(h => h.kategorie_slug === kat.slug)
      .map(h => {
        const itf = itfMap[`${h.id}__${kat.slug}`]
        if (itf) {
          return { ...h, te_itf: true, te_itf_typ: itf.typ, te_itf_poradi: itf.poradi }
        }
        return h
      })

    // Seřaď
    hraci.sort((a, b) => {
      if (a.te_itf && b.te_itf) {
        const pa = TYP_PRIORITY[a.te_itf_typ] ?? 9
        const pb = TYP_PRIORITY[b.te_itf_typ] ?? 9
        if (pa !== pb) return pa - pb
        return (a.te_itf_poradi ?? 999) - (b.te_itf_poradi ?? 999)
      }
      if (a.te_itf) return -1
      if (b.te_itf) return 1
      return (b.body_celkem ?? 0) - (a.body_celkem ?? 0)
    })

    // Přiřaď pořadí a BH - pouze pro ne-ITF hráče
    const pocetSBody = hraci.filter(h => !h.te_itf && (h.body_celkem ?? 0) > 0).length
    const cestiHraci = hraci.filter(h => !h.te_itf)
    let poradi = 1
    for (let i = 0; i < cestiHraci.length; i++) {
      const h = cestiHraci[i]
      if (i > 0 && cestiHraci[i-1].body_celkem === h.body_celkem) {
        h.poradi_live = cestiHraci[i-1].poradi_live
      } else {
        h.poradi_live = poradi
      }
      h.bh = (h.body_celkem ?? 0) === 0 ? 1 : vypocitejBH(h.poradi_live, pocetSBody)
      poradi++
    }
    // ITF hráči
    for (const h of hraci.filter(h => h.te_itf)) {
      h.poradi_live = 0; h.bh = 0
    }

    output[kat.slug] = { nazev: kat.slug, aktualizace, hraci }
  }

  return NextResponse.json(output)
}
