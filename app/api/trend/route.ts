import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  // Načti unikátní data se stránkováním
  const vsechnaData: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('historie_poradi')
      .select('hrac_id, kategorie_slug, poradi, datum')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    vsechnaData.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const datumy = [...new Set(vsechnaData.map(d => d.datum))].sort().reverse()
  if (datumy.length < 2) return NextResponse.json({})

  const aktualniDatum = datumy[0]
  const predchoziDatum = datumy[1]

  const predMap: Record<string, number> = {}
  for (const r of vsechnaData.filter(r => r.datum === predchoziDatum)) {
    predMap[`${r.hrac_id}__${r.kategorie_slug}`] = r.poradi
  }

  const trend: Record<string, { trend: number; novy: boolean }> = {}
  for (const r of vsechnaData.filter(r => r.datum === aktualniDatum)) {
    const key = `${r.hrac_id}__${r.kategorie_slug}`
    const pred = predMap[key]
    trend[key] = pred === undefined
      ? { trend: 0, novy: true }
      : { trend: pred - r.poradi, novy: false }
  }

  return NextResponse.json(trend)
}
