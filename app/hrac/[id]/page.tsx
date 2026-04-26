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
  const [hraci, setHraci] = useState<any[]>([])
  const [aktivniKat, setAktivniKat] = useState<string | null>(null)
  const [turnaje, setTurnaje] = useState<any[]>([])
  const [zapasy, setZapasy] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aktivniTab, setAktivniTab] = useState<"turnaje" | "zapasy">("turnaje")
  const [aktivniSezona, setAktivniSezona] = useState<string>("vse")
  const [aktivniTyp, setAktivniTyp] = useState<"vse" | "ind" | "druz">("vse")

  useEffect(() => {
    if (!id) return
    Promise.all([
      sb("hraci", `id=eq.${id}&order=body_celkem.desc`),
      sb("turnaje_hrace", `hrac_id=eq.${id}&order=datum_str.desc`),
      sb("zapasy_hrace", `hrac_id=eq.${id}&order=id.desc`),
    ]).then(([h, t, z]) => {
      setHrac(h[0])
      setHraci(h)
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

  const aktivniHrac = hraci.find(h => h.kategorie_slug === aktivniKat) ?? hrac

  if (!hrac) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div style={{ color: "var(--text-3)" }}>Hráč nenalezen</div>
    </div>
  )

  const sezony = Array.from(new Set(turnaje.map(t => t.sezona))).sort().reverse()
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

  // Sety per pozice (1. set, 2. set, 3. set)
  const setPerPozice: { vyhrane: number; prohrane: number }[] = [
    { vyhrane: 0, prohrane: 0 },
    { vyhrane: 0, prohrane: 0 },
    { vyhrane: 0, prohrane: 0 },
  ]
  let celkemVyhraneSet = 0, celkemProhraneSet = 0
  indZapasy.forEach(z => {
    if (!z.vysledek) return
    z.vysledek.split(" ").forEach((set: string, idx: number) => {
      const [h, s] = set.split(":").map(Number)
      if (isNaN(h) || isNaN(s)) return
      if (h > s) { celkemVyhraneSet++; if (idx < 3) setPerPozice[idx].vyhrane++ }
      else { celkemProhraneSet++; if (idx < 3) setPerPozice[idx].prohrane++ }
    })
  })
  const setWinRate = (celkemVyhraneSet + celkemProhraneSet) > 0
    ? Math.round(celkemVyhraneSet / (celkemVyhraneSet + celkemProhraneSet) * 100) : 0
  const setPctPozice = setPerPozice.map(s =>
    (s.vyhrane + s.prohrane) > 0 ? Math.round(s.vyhrane / (s.vyhrane + s.prohrane) * 100) : null
  )

  // Průměr setů na zápas
  const zapasySeSetem = indZapasy.filter(z => z.vysledek && z.vysledek.trim())
  const celkemSetu = zapasySeSetem.reduce((acc, z) => acc + z.vysledek.trim().split(" ").length, 0)
  const prumerSetu = zapasySeSetem.length > 0 ? (celkemSetu / zapasySeSetem.length).toFixed(1) : "—"

  // H2H — nejčastější soupeři
  const h2hMap: Record<string, { jmeno: string; id: number | null; vyhry: number; prohry: number }> = {}
  indZapasy.forEach(z => {
    if (!z.souper_jmeno) return
    const key = z.souper_jmeno
    if (!h2hMap[key]) h2hMap[key] = { jmeno: z.souper_jmeno, id: z.souper_id, vyhry: 0, prohry: 0 }
    if (z.vyhral) h2hMap[key].vyhry++
    else h2hMap[key].prohry++
  })
  const h2h = Object.values(h2hMap)
    .sort((a, b) => (b.vyhry + b.prohry) - (a.vyhry + a.prohry))
    .slice(0, 3)

  // Povrch — výhry/prohry per povrch
  const povrchMap: Record<string, { vyhry: number; prohry: number }> = {}
  indTurnaje.forEach(t => {
    if (!t.povrch) return
    const p = t.povrch.trim()
    if (!povrchMap[p]) povrchMap[p] = { vyhry: 0, prohry: 0 }
    // Najdi zápasy tohoto turnaje
    const turnajZapasy = indZapasy.filter(z => z.turnaj_kod === t.turnaj_kod)
    turnajZapasy.forEach(z => {
      if (z.vyhral) povrchMap[p].vyhry++
      else povrchMap[p].prohry++
    })
  })
  const povrchStats = Object.entries(povrchMap)
    .map(([nazev, s]) => ({ nazev, ...s, total: s.vyhry + s.prohry, pct: Math.round(s.vyhry / (s.vyhry + s.prohry) * 100) }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)

  // Sezónní srovnání
  const sezonySrovnani = sezony.map(s => {
    const st = indTurnaje.filter(t => t.sezona === s)
    const sz = indZapasy.filter(z => z.sezona === s)
    return {
      sezona: s,
      turnaju: st.length,
      body: st.reduce((acc, t) => acc + t.body_dv + t.body_ct, 0),
      vyhry: sz.filter(z => z.vyhral).length,
      zapasy: sz.length,
    }
  })

  // Průměrná kategorie turnajů
  const kats = indTurnaje.filter(t => t.kategorie_dv).map(t => t.kategorie_dv)
  const prumerKat = kats.length > 0 ? (kats.reduce((a: number, b: number) => a + b, 0) / kats.length).toFixed(1) : null

  // Aktivita per měsíc
  const MESICE = ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"]
  const mesicMap: Record<string, { turnaju: number; body: number; label: string }> = {}
  indTurnaje.forEach(t => {
    if (!t.datum_str) return
    const parts = t.datum_str.split(".")
    if (parts.length < 3) return
    const m = parseInt(parts[1].trim())
    const r = parts[2].trim()
    if (isNaN(m) || m < 1 || m > 12) return
    const key = `${r}-${String(m).padStart(2,"0")}`
    if (!mesicMap[key]) mesicMap[key] = { turnaju: 0, body: 0, label: `${MESICE[m-1]} ${r}` }
    mesicMap[key].turnaju++
    mesicMap[key].body += t.body_dv + t.body_ct
  })
  const mesicData = Object.entries(mesicMap).sort(([a],[b]) => b.localeCompare(a)).map(([,v]) => v)
  const maxMesicBody = Math.max(...mesicData.map(m => m.body), 1)

  // Forma — posledních 10 zápasů jednotlivců (nejnovější první)
  const formaZapasy = [...indZapasy].slice(0, 10)

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
                {aktivniHrac.bh > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#FF3B3B18", color: "#FF3B3B", border: "1px solid #FF3B3B30" }}>BH {aktivniHrac.bh}</span>
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
              <div className="text-3xl font-black mono" style={{ color: "#FF3B3B" }}>{aktivniHrac.body_celkem}</div>
              <div className="text-xs" style={{ color: "var(--text-3)" }}>bodů celkem</div>
              {aktivniHrac.poradi_live > 0 && <div className="text-sm font-bold mt-1" style={{ color: "var(--text-2)" }}>#{aktivniHrac.poradi_live}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>DVOUHRA</div>
              <div className="text-xl font-black mono" style={{ color: "var(--text)" }}>{aktivniHrac.body_dv}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Top akce: {aktivniHrac.akce_dv?.slice(0, 3).join(", ")}</div>
            </div>
            <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>ČTYŘHRA</div>
              <div className="text-xl font-black mono" style={{ color: "var(--text)" }}>{aktivniHrac.body_ct}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Top akce: {aktivniHrac.akce_ct?.slice(0, 3).join(", ")}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Turnajů", value: indTurnaje.length },
            { label: "Výher", value: `${vyhry}/${indZapasy.length}` },
            { label: "Win rate", value: `${winRate}%` },
            { label: "Titulů", value: vitezstvi },
            { label: "Prům. sety", value: prumerSetu },
          ].map(s => (
            <div key={s.label} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="text-2xl font-black mono" style={{ color: "#FF3B3B" }}>{s.value}</div>
              <div className="text-xs font-medium uppercase tracking-widest mt-0.5" style={{ color: "var(--text-2)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Forma */}
        {formaZapasy.length > 0 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold" style={{ color: "var(--text)" }}>Forma</div>
              <div className="text-xs" style={{ color: "var(--text-3)" }}>posledních {formaZapasy.length} zápasů</div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {formaZapasy.map((z, i) => (
                <div key={i} title={`${z.vyhral ? "V" : "P"} vs ${z.souper_jmeno} ${z.vysledek}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black cursor-help transition-transform hover:scale-110"
                  style={{ background: z.vyhral ? "#22c55e" : "#FF3B3B", color: "#fff" }}>
                  {z.vyhral ? "V" : "P"}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* H2H */}
        {h2h.length > 0 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Nejčastější soupeři</div>
            <div className="space-y-2">
              {h2h.map((s, i) => {
                const total = s.vyhry + s.prohry
                const pct = Math.round(s.vyhry / total * 100)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-sm font-semibold w-32 truncate shrink-0" style={{ color: "var(--text)" }}>
                      {s.id ? <a href={`/hrac/${s.id}`} className="hover:underline">{s.jmeno}</a> : s.jmeno}
                    </div>
                    <div className="flex-1 rounded-full overflow-hidden h-5" style={{ background: "var(--bg-2)" }}>
                      <div className="h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${pct}%`, background: pct >= 50 ? "#22c55e" : "#FF3B3B", minWidth: "1.5rem" }}>
                        <span className="text-[10px] font-bold text-white">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-xs w-10 text-right shrink-0 font-mono" style={{ color: "var(--text-3)" }}>
                      {s.vyhry}/{total}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Povrch */}
        {povrchStats.length > 0 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Výsledky podle povrchu</div>
            <div className="space-y-2">
              {povrchStats.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-xs font-semibold w-20 shrink-0" style={{ color: "var(--text-3)" }}>{p.nazev}</div>
                  <div className="flex-1 rounded-full overflow-hidden h-5" style={{ background: "var(--bg-2)" }}>
                    <div className="h-full rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${p.pct}%`, background: p.pct >= 60 ? "#22c55e" : p.pct >= 40 ? "#FF3B3B" : "#888", minWidth: "1.5rem" }}>
                      <span className="text-[10px] font-bold text-white">{p.pct}%</span>
                    </div>
                  </div>
                  <div className="text-xs w-10 text-right shrink-0 font-mono" style={{ color: "var(--text-3)" }}>
                    {p.vyhry}/{p.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sezónní srovnání */}
        {sezonySrovnani.length > 1 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Sezónní srovnání</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sezonySrovnani.length}, 1fr)` }}>
              {sezonySrovnani.map((s, i) => (
                <div key={i} className="rounded-lg px-3 py-3 text-center" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <div className="text-xs font-bold mb-2" style={{ color: "#FF3B3B" }}>{s.sezona}</div>
                  <div className="text-xl font-black mono" style={{ color: "var(--text)" }}>{s.body}</div>
                  <div className="text-xs mb-2" style={{ color: "var(--text-3)" }}>bodů</div>
                  <div className="text-sm font-bold" style={{ color: "var(--text-2)" }}>{s.vyhry}/{s.zapasy}</div>
                  <div className="text-xs" style={{ color: "var(--text-3)" }}>zápasů</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{s.turnaju} turnajů</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aktivita per měsíc */}
        {mesicData.length > 0 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Aktivita podle měsíce</div>
            <div className="space-y-2">
              {mesicData.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-xs w-16 shrink-0 font-semibold" style={{ color: "var(--text-3)" }}>{m.label}</div>
                  <div className="flex-1 rounded-full overflow-hidden h-5" style={{ background: "var(--bg-2)" }}>
                    <div className="h-full rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.round(m.body / maxMesicBody * 100)}%`, minWidth: "1.5rem",
                        background: m.body >= maxMesicBody * 0.66 ? "#22c55e" : m.body >= maxMesicBody * 0.33 ? "#FF8C00" : "#FF3B3B" }}>
                      <span className="text-[10px] font-bold text-white">{m.body}b</span>
                    </div>
                  </div>
                  <div className="text-xs w-14 text-right shrink-0" style={{ color: "var(--text-3)" }}>
                    {m.turnaju} turn.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Průměrná kategorie */}
        {prumerKat && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Průměrná kategorie turnajů</div>
            <div className="flex items-end gap-3">
              <div className="text-4xl font-black mono" style={{ color: "#FF3B3B" }}>{prumerKat}</div>
              <div className="pb-1">
                <div className="text-xs" style={{ color: "var(--text-3)" }}>z {kats.length} turnajů</div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>
                  {Number(prumerKat) >= 14 ? "Převážně MČR/A* turnaje" : Number(prumerKat) >= 12 ? "Převážně A turnaje" : Number(prumerKat) >= 8 ? "Převážně B turnaje" : Number(prumerKat) >= 3 ? "Převážně C turnaje" : "Převážně D turnaje"}
                </div>
              </div>
              <div className="flex-1 ml-4">
                <div className="flex gap-1 flex-wrap">
                  {[...Array(21)].map((_, i) => {
                    const kat = i + 1
                    const count = kats.filter((k: number) => k === kat).length
                    if (count === 0) return null
                    return (
                      <div key={kat} title={`Kategorie ${kat}: ${count}×`}
                        className="rounded text-[10px] font-bold px-1.5 py-0.5"
                        style={{ background: kat >= 14 ? "#FF3B3B" : kat >= 12 ? "#FF8C00" : kat >= 8 ? "#3B82F6" : "var(--text-3)", color: "#fff" }}>
                        {kat}×{count}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Per-set statistika */}
        {setPctPozice.some(p => p !== null) && (
          <div className="rounded-xl p-5 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Úspěšnost podle setu</div>
            <div className="space-y-3">
              {[["1. set", 0], ["2. set", 1], ["3. set", 2]].map(([label, idx]) => {
                const pct = setPctPozice[idx as number]
                const s = setPerPozice[idx as number]
                if (pct === null) return null
                return (
                  <div key={label as string} className="flex items-center gap-3">
                    <div className="text-xs font-semibold w-12 shrink-0" style={{ color: "var(--text-3)" }}>{label}</div>
                    <div className="flex-1 rounded-full overflow-hidden h-5" style={{ background: "var(--bg-2)" }}>
                      <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${pct}%`, background: pct >= 60 ? "#22c55e" : pct >= 40 ? "#FF3B3B" : "#888", minWidth: "2rem" }}>
                        <span className="text-[10px] font-bold text-white">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-xs w-12 text-right shrink-0" style={{ color: "var(--text-3)" }}>
                      {s.vyhrane}/{s.vyhrane + s.prohrane}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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