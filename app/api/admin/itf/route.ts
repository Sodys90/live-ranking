import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-password")
  if (auth !== ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { hrac_id, kategorie_slug, te_itf, te_itf_typ, te_itf_poradi } = await req.json()

  const { error } = await supabaseAdmin
    .from("hraci")
    .update({ te_itf, te_itf_typ, te_itf_poradi })
    .eq("id", hrac_id)
    .eq("kategorie_slug", kategorie_slug)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
