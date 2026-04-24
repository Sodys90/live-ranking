import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('historie_poradi')
    .select('hrac_id, kategorie_slug, poradi')

  if (error) return NextResponse.json({}, { status: 500 })

  const nmk: Record<string, number> = {}
  for (const r of data ?? []) {
    const key = `${r.hrac_id}__${r.kategorie_slug}`
    if (!nmk[key] || r.poradi < nmk[key]) nmk[key] = r.poradi
  }

  return NextResponse.json(nmk)
}
