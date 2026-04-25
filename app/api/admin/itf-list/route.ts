import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-password")
  if (auth !== ADMIN_PASSWORD) return NextResponse.json([], { status: 401 })

  const { data } = await supabaseAdmin
    .from("itf_hrace")
    .select("*")
    .order("typ")
    .order("poradi")

  return NextResponse.json(data ?? [])
}
