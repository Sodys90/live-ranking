import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-password")
  if (auth !== ADMIN_PASSWORD) return NextResponse.json([], { status: 401 })

  const q = req.nextUrl.searchParams.get("q") || ""
  if (q.length < 2) return NextResponse.json([])

  const { data } = await supabaseAdmin
    .from("hraci")
    .select("id, jmeno, klub, kategorie_slug")
    .ilike("jmeno", `%${q}%`)
    .limit(20)

  return NextResponse.json(data ?? [])
}
