"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function sb(table: string, params: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  return res.json()
}

const UMISTENI_LABEL: Record<string, string> = {
  V: "Vítěz", F: "Finále", SF: "Semifinále",
  "8": "Čtvrtfinále", "16": "Osmifinále", "32": "2. kolo", "64": "1. kolo", "128": "1. kolo"
}

const UMISTENI_COLOR: Record<string, string> = {
  V: "#FFD700", F: "#C0C0C0", SF: "#CD7F32",
  "8": "#FF3B3B", "16": "#FF6B6B", "32": "#888", "64": "#666", "128": "#555"
}

export default function HracProfil() {
  const params = useParams()
  const id = params?.id as string

  const [hrac, setHrac] = useState<any>(null)
  const [turnaje, setTurnaje] = useState<any[]>([])
  const [zapasy, setZapasy] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aktivniTab, setAktivniTab] = useState<"turnaje" | "zapasy">("turnaje")
  const [aktivniSezona, setAktivniSezona] = useState<string>("vse")
  const [aktivniTyp, setAktivniTyp] = useState<"vse" | "ind" | "druz">("vse")

  useEffect(() => {
    if (!id) return
    Promise.all([
      sb("hraci", `id=eq.${id}&limit=1`),
      sb("turnaje_hrace", `hrac_id=eq.${id}&order=datum_str.desc`),
      sb("zapasy_hrace", `hrac_id=eq.${id}&order=id.desc`),
    ]).then(([h, t, z]) => {
      setHrac(h[0])
      setTurnaje(t)
      setZapasy(z)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#FF3B3B" }} />
    </div>
  )

  if (!hrac) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div style={{ color: "var(--text-3)" }}>Hráč nenalezen</div>
    </div>
  )

  const sezony = [...new Set(turnaje.map(t => t.sezona))].sort().reverse()
  const filtTurnaje = turnaje.filter(t => {
    if (aktivniSezona !== "vse" && t.sezona !== aktivniSezona) return false
    if (aktivniTyp === "ind" && t.je_druzstvo) return false
    if (aktivniTyp === "druz" && !t.je_druzstvo) return false
    return true
  })

  const indTurnaje = turnaje.filter(t => !t.je_druzstvo)
  const vitezstvi = indTurnaje.filter(t => t.umisteni_dv === "V" || t.umisteni_ct === "V").length
  const finale = indTurnaje.filter(t => t.umisteni_dv === "F" || t.umisteni_ct === "F").length
  const semifinale = indTurnaje.filter(t => t.umisteni_dv === "SF" || t.umisteni_ct === "SF").length
  const indZapasy = zapasy.filter(z => !z.je_druzstvo)
  const vyhry = indZapasy.filter(z => z.vyhral).length
  const prohry = indZapasy.filter(z => !z.vyhral).length
  const winRate = indZapasy.length > 0 ? Math.round(vyhry / indZapasy.length * 100) : 0

  const grafData = [...indTurnaje].sort((a, b) => (b.body_dv + b.body_ct) - (a.body_dv + a.body_ct)).slice(0, 10)
  const maxBody = Math.max(...grafData.map(t => t.body_dv + t.body_ct), 1)

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
              <path d="M15 15 C35 25, 35 35, 15 45" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M45 15 C25 25, 25 35, 45 45" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
            <span className="font-bold text-sm" style={{ color: "var(--text)" }}>Tenis<span style={{ color: "#FF3B3B" }}>CZ</span></span>
          </Link>
          <span style={{ color: "var(--border)" }}>›</span>
          <Link href="/" className="text-sm" style={{ color: "var(--text-3)" }}>Žebříček</Link>
          <span style={{ color: "var(--border)" }}>›</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{hrac.jmeno}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--bg-2)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
                  {hrac.kategorie_slug?.replace(/-/g, " ")}
                </span>
                {hrac.bh > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#FF3B3B18", color: "#FF3B3B", border: "1px solid #FF3B3B30" }}>BH {hrac.bh}</span>
                )}
              </div>
              <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>{hrac.jmeno}</h1>
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-3)" }}>
                <span>{hrac.klub}</span>
                <span>•</span>
                <span>* {hrac.narozeni}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-black mono" style={{ color: "#FF3B3B" }}>{hrac.body_celkem}</div>
              <div className="text-xs" style={{ color: "var(--text-3)" }}>bodů celkem</div>
              {hrac.poradi_live > 0 && <div className="text-sm font-bold mt-1" style={{ color: "var(--text-2)" }}>#{hrac.poradi_live}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>DVOUHRA</div>
              <div className="text-xl font-black mono" style={{ color: "var(--text)" }}>{hrac.body_dv}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Top akce: {hrac.akce_dv?.slice(0, 3).join(", ")}</div>
            </div>
            <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>ČTYŘHRA</div>
              <div className="text-xl font-black mono" style={{ color: "var(--text)" }}>{hrac.body_ct}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Top akce: {hrac.akce_ct?.slice(0, 3).join(", ")}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Turnajů", value: indTurnaje.length },
            { label: "Výher", value: `${vyhry}/${indZapasy.length}` },
            { label: "Win rate", value: `${winRate}%` },
            { label: "Titulů", value: vitezstvi },
          ].map(s => (
            <div key={s.label} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="text-2xl font-black mono" style={{ color: "#FF3B3B" }}>{s.value}</div>
              <div className="text-xs font-medium uppercase tracking-widest mt-0.5" style={{ color: "var(--text-2)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {grafData.length > 0 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Nejlepší turnaje — body</div>
            <div className="space-y-2">
              {grafData.map((t, i) => {
                const total = t.body_dv + t.body_ct
                const pct = Math.round(total / maxBody * 100)
                const nazevKratky = t.nazev?.replace(/\s*\(.*\)/, "").trim() || "—"
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xs w-32 truncate shrink-0" style={{ color: "var(--text-3)" }} title={t.nazev}>{nazevKratky}</div>
                    <div className="flex-1 rounded-full overflow-hidden h-5 relative" style={{ background: "var(--bg-2)" }}>
                      <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? "#FF3B3B" : "var(--text-3)", minWidth: "2rem" }}>
                        <span className="text-[10px] font-bold text-white">{total}b</span>
                      </div>
                    </div>
                    <div className="text-xs w-8 text-right shrink-0" style={{ color: UMISTENI_COLOR[t.umisteni_dv] || "var(--text-3)" }}>
                      {t.umisteni_dv || "—"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Umístění v turnajích</div>
          <div className="flex gap-3 flex-wrap">
            {[
              { key: "V", label: "🏆 Tituly", count: vitezstvi },
              { key: "F", label: "🥈 Finále", count: finale },
              { key: "SF", label: "🥉 Semifinále", count: semifinale },
              { key: "8", label: "⚡ Čtvrtfinále", count: indTurnaje.filter(t => t.umisteni_dv === "8").length },
            ].map(u => (
              <div key={u.key} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <span className="text-sm">{u.label}</span>
                <span className="text-lg font-black mono" style={{ color: u.count > 0 ? UMISTENI_COLOR[u.key] : "var(--text-3)" }}>{u.count}×</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex rounded-full p-0.5 shrink-0" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {([["turnaje", "Turnaje"], ["zapasy", "Zápasy"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setAktivniTab(val)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={aktivniTab === val ? { background: "#FF3B3B", color: "#fff" } : { background: "transparent", color: "var(--text-3)" }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-full p-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {(["vse", ...sezony] as string[]).map(s => (
                <button key={s} onClick={() => setAktivniSezona(s)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                  style={aktivniSezona === s ? { background: "#FF3B3B", color: "#fff" } : { background: "transparent", color: "var(--text-3)" }}>
                  {s === "vse" ? "Vše" : s}
                </button>
              ))}
            </div>
            <div className="flex rounded-full p-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {([["vse", "Vše"], ["ind", "Jednotlivci"], ["druz", "Družstva"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setAktivniTyp(val)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                  style={aktivniTyp === val ? { background: "#FF3B3B", color: "#fff" } : { background: "transparent", color: "var(--text-3)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {aktivniTab === "turnaje" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="grid text-xs font-bold uppercase px-4 py-2.5"
              style={{ gridTemplateColumns: "1fr 3rem 5rem 5rem 5rem", background: "var(--bg-card)", borderBottom: "2px solid var(--border)", color: "var(--text-3)" }}>
              <span>Turnaj</span><span className="text-center">Kat.</span><span className="text-center">Umístění</span>
              <span className="text-right">DV</span><span className="text-right">CT</span>
            </div>
            {filtTurnaje.length === 0 && (
              <div className="text-center py-10 text-sm" style={{ color: "var(--text-3)", background: "var(--bg-card)" }}>Žádné turnaje</div>
            )}
            {filtTurnaje.map((t, i) => (
              <div key={i} className="grid items-center px-4 py-3 transition-colors"
                style={{ gridTemplateColumns: "1fr 3rem 5rem 5rem 5rem", background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-stripe)", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "var(--bg-card)" : "var(--bg-stripe)" }}>
                <div>
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {t.turnaj_url ? <a href={t.turnaj_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{t.nazev}</a> : t.nazev}
                  </div>
                  <div className="text-xs mt-0.5 flex gap-2" style={{ color: "var(--text-3)" }}>
                    <span>{t.datum_str}</span>
                    {t.sezona && <span>• {t.sezona}</span>}
                    {t.povrch && <span>• {t.povrch}</span>}
                    {t.je_druzstvo && <span className="font-semibold" style={{ color: "#FF3B3B" }}>• Družstva</span>}
                  </div>
                </div>
                <div className="text-center text-sm font-mono" style={{ color: "var(--text-2)" }}>{t.kategorie_dv || "—"}</div>
                <div className="text-center">
                  {t.umisteni_dv
                    ? <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: UMISTENI_COLOR[t.umisteni_dv] || "var(--text-3)", background: "var(--bg-2)" }}>
                        {UMISTENI_LABEL[t.umisteni_dv] || t.umisteni_dv}
                      </span>
                    : <span style={{ color: "var(--text-3)" }}>—</span>}
                </div>
                <div className="text-right text-sm font-mono font-bold" style={{ color: t.body_dv > 0 ? "var(--text)" : "var(--text-3)" }}>{t.body_dv > 0 ? t.body_dv : "—"}</div>
                <div className="text-right text-sm font-mono font-bold" style={{ color: t.body_ct > 0 ? "var(--text)" : "var(--text-3)" }}>{t.body_ct > 0 ? t.body_ct : "—"}</div>
              </div>
            ))}
          </div>
        )}

        {aktivniTab === "zapasy" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="grid text-xs font-bold uppercase px-4 py-2.5"
              style={{ gridTemplateColumns: "4rem 1fr 6rem 2rem", background: "var(--bg-card)", borderBottom: "2px solid var(--border)", color: "var(--text-3)" }}>
              <span>Kolo</span><span>Soupeř</span><span className="text-center">Výsledek</span><span></span>
            </div>
            {zapasy.filter(z => {
              if (aktivniSezona !== "vse" && z.sezona !== aktivniSezona) return false
              if (aktivniTyp === "ind" && z.je_druzstvo) return false
              if (aktivniTyp === "druz" && !z.je_druzstvo) return false
              return true
            }).map((z, i) => (
              <div key={i} className="grid items-center px-4 py-2.5 transition-colors"
                style={{ gridTemplateColumns: "4rem 1fr 6rem 2rem", background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-stripe)", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "var(--bg-card)" : "var(--bg-stripe)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text-3)" }}>{z.kolo}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {z.souper_id ? <a href={`/hrac/${z.souper_id}`} className="hover:underline">{z.souper_jmeno}</a> : z.souper_jmeno || "—"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-3)" }}>{z.sezona}</div>
                </div>
                <div className="text-center text-xs font-mono font-bold" style={{ color: z.vyhral ? "#22c55e" : "var(--text-3)" }}>{z.vysledek || "—"}</div>
                <div className="text-center text-sm">{z.vyhral ? "✓" : "✗"}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 text-center">
          <a href={`https://cesky-tenis.cz/hrac/${id}`} target="_blank" rel="noopener noreferrer"
            className="text-xs hover:underline" style={{ color: "var(--text-3)" }}>
            Zobrazit na cesky-tenis.cz ↗
          </a>
        </div>
      </div>
    </div>
  )
}