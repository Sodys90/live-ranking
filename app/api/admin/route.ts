import { NextRequest, NextResponse } from "next/server"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-password")
  if (auth !== ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ ok: true })
}
