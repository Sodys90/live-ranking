import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-password")
  if (auth !== ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { hrac_id, jmeno, kategorie_slug, te_itf, te_itf_typ, te_itf_poradi } = await req.json()

  if (te_itf) {
    // Uložit do itf_hrace tabulky
    await supabaseAdmin
      .from("itf_hrace")
      .upsert({
        hrac_id, jmeno, kategorie_slug,
        typ: te_itf_typ,
        poradi: te_itf_poradi,
        aktivni: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "hrac_id,kategorie_slug" })
  } else {
    // Deaktivovat v itf_hrace
    await supabaseAdmin
      .from("itf_hrace")
      .update({ aktivni: false, updated_at: new Date().toISOString() })
      .eq("hrac_id", hrac_id)
      .eq("kategorie_slug", kategorie_slug)
  }

  // Také aktualizuj hraci tabulku pro okamžitý efekt
  await supabaseAdmin
    .from("hraci")
    .update({
      te_itf,
      te_itf_typ: te_itf ? te_itf_typ : null,
      te_itf_poradi: te_itf ? te_itf_poradi : null,
    })
    .eq("id", hrac_id)
    .eq("kategorie_slug", kategorie_slug)

  return NextResponse.json({ ok: true })
}
