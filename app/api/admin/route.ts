import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("x-admin-password")
  return auth === ADMIN_PASSWORD
}

// GET - načti turnaje pro hráče
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const hrac_id = searchParams.get("hrac_id")
  const kategorie_slug = searchParams.get("kategorie_slug")

  let query = supabaseAdmin.from("mezinarodni_turnaje").select("*").order("datum", { ascending: false })
  if (hrac_id) query = query.eq("hrac_id", hrac_id)
  if (kategorie_slug) query = query.eq("kategorie_slug", kategorie_slug)

  const { data, error } = await query
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

// POST - přidej turnaj
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from("mezinarodni_turnaje")
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE - smaž turnaj
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("mezinarodni_turnaje")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
