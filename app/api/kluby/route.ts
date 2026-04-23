import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const kategorie = searchParams.get('kategorie')

  // Stránkování — Supabase má limit 1000 řádků per request
  const vsechnaData: any[] = []
  let from = 0
  const PAGE = 1000

  while (true) {
    let query = supabase
      .from('hraci')
      .select('klub, kategorie_slug, body_dv, body_ct, body_celkem, te_itf')
      .not('klub', 'is', null)
      .range(from, from + PAGE - 1)

    if (kategorie) query = query.eq('kategorie_slug', kategorie)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break

    vsechnaData.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  const map: Record<string, { klub: string; kategorie_slug: string; body_dv: number; body_ct: number; body_celkem: number; pocet: number }> = {}

  for (const h of vsechnaData) {
    if (!h.klub) continue
    const key = `${h.klub}__${h.kategorie_slug}`
    if (!map[key]) map[key] = { klub: h.klub, kategorie_slug: h.kategorie_slug, body_dv: 0, body_ct: 0, body_celkem: 0, pocet: 0 }
    if (!h.te_itf) {
      map[key].body_dv += h.body_dv ?? 0
      map[key].body_ct += h.body_ct ?? 0
      map[key].body_celkem += h.body_celkem ?? 0
    }
    map[key].pocet += 1
  }

  const result = Object.values(map).sort((a, b) => b.body_celkem - a.body_celkem)
  return NextResponse.json(result)
}
