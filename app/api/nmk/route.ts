import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const nmk: Record<string, number> = {}
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('historie_poradi')
      .select('hrac_id, kategorie_slug, poradi')
      .range(from, from + 999)

    if (error) return NextResponse.json({}, { status: 500 })
    if (!data || data.length === 0) break

    for (const r of data) {
      const key = `${r.hrac_id}__${r.kategorie_slug}`
      if (!nmk[key] || r.poradi < nmk[key]) nmk[key] = r.poradi
    }

    if (data.length < 1000) break
    from += 1000
  }

  return NextResponse.json(nmk)
}
