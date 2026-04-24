import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data: datumy } = await supabase
    .from('historie_poradi')
    .select('datum')
    .order('datum', { ascending: false })
    .limit(100)

  if (!datumy || datumy.length === 0) return NextResponse.json({})

  const unique = [...new Set(datumy.map((d: any) => d.datum))]
  if (unique.length < 2) return NextResponse.json({})

  const aktualniDatum = unique[0]
  const predchoziDatum = unique[1]

  const [akt, pred] = await Promise.all([
    supabase.from('historie_poradi').select('hrac_id,kategorie_slug,poradi').eq('datum', aktualniDatum),
    supabase.from('historie_poradi').select('hrac_id,kategorie_slug,poradi').eq('datum', predchoziDatum),
  ])

  const predMap: Record<string, number> = {}
  for (const r of pred.data ?? []) {
    predMap[`${r.hrac_id}__${r.kategorie_slug}`] = r.poradi
  }

  const trend: Record<string, { trend: number; novy: boolean }> = {}
  for (const r of akt.data ?? []) {
    const key = `${r.hrac_id}__${r.kategorie_slug}`
    const p = predMap[key]
    trend[key] = p === undefined ? { trend: 0, novy: true } : { trend: p - r.poradi, novy: false }
  }

  return NextResponse.json(trend)
}
