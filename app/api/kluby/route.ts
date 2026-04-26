import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const kategorie = searchParams.get('kategorie')
  const svazRaw = searchParams.get('svaz')
  const SVAZ_MAP: Record<string,string> = {
    "Praha": "Pražský TS",
    "Středočeský": "Středočeský TS",
    "Jihočeský": "Jihočeský TS",
    "Západočeský": "Západočeský TS",
    "Severočeský": "Severočeský TS",
    "Východočeský": "Východočeský TS",
    "Jihomoravský": "Jihomoravský TS",
    "Severomoravský": "Severomoravský TS",
  }
  const svaz = svazRaw ? (SVAZ_MAP[svazRaw] ?? svazRaw) : null
  const MLADEZ = ["mladsi-zaci","mladsi-zakyne","starsi-zaci","starsi-zakyne","dorostenci","dorostenky"]

  const vsechnaData: any[] = []
  let from = 0
  while (true) {
    let query = supabase
      .from('hraci')
      .select('klub, kategorie_slug, body_dv, body_ct, body_celkem, te_itf')
      .not('klub', 'is', null)
      .range(from, from + 999)
    if (kategorie === 'mladez') query = query.in('kategorie_slug', MLADEZ)
    else if (kategorie) query = query.eq('kategorie_slug', kategorie)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    vsechnaData.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const { data: klubyData } = await supabase
    .from('kluby')
    .select('nazev, oblast, kraj, svaz')
  const klubInfo: Record<string, { oblast: string; kraj: string; svaz: string }> = {}
  for (const k of klubyData ?? []) {
    klubInfo[k.nazev] = { oblast: k.oblast, kraj: k.kraj, svaz: k.svaz }
  }

  const map: Record<string, {
    klub: string; kategorie_slug: string
    body_dv: number; body_ct: number; body_celkem: number; pocet: number
    oblast: string; svaz: string
  }> = {}

  for (const h of vsechnaData) {
    if (!h.klub) continue
    const info = klubInfo[h.klub] ?? { oblast: 'Neznámá', kraj: 'Neznámá', svaz: 'Neznámý' }
    if (svaz && svaz !== 'Vše' && info.svaz !== svaz) continue
    const key = `${h.klub}__${h.kategorie_slug}`
    if (!map[key]) map[key] = {
      klub: h.klub, kategorie_slug: h.kategorie_slug,
      body_dv: 0, body_ct: 0, body_celkem: 0, pocet: 0,
      oblast: info.oblast, svaz: info.svaz
    }
    map[key].body_dv += h.body_dv ?? 0
    map[key].body_ct += h.body_ct ?? 0
    map[key].body_celkem += h.body_celkem ?? 0
    map[key].pocet += 1
  }

  const result = Object.values(map).sort((a, b) => b.body_celkem - a.body_celkem)
  return NextResponse.json(result)
}
