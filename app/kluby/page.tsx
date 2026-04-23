"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

const KATEGORIE = [
  { slug: "vse",           nazev: "Vše" },
  { slug: "mladsi-zaci",   nazev: "Mladší žáci" },
  { slug: "mladsi-zakyne", nazev: "Mladší žákyně" },
  { slug: "starsi-zaci",   nazev: "Starší žáci" },
  { slug: "starsi-zakyne", nazev: "Starší žákyně" },
  { slug: "dorostenci",    nazev: "Dorostenci" },
  { slug: "dorostenky",    nazev: "Dorostenky" },
]

type KlubRow = { klub: string; kategorie_slug: string; body_dv: number; body_ct: number; body_celkem: number; pocet: number }
type AggRow = { klub: string; body_dv: number; body_ct: number; body_celkem: number; pocet: number }

export default function KlubovyZebricek() {
  const [data, setData] = useState<KlubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [kategorie, setKategorie] = useState("vse")
  const [disciplina, setDisciplina] = useState("celkem")
  const [hledej, setHledej] = useState("")

  useEffect(() => {
    setLoading(true)
    const url = kategorie === "vse" ? "/api/kluby" : `/api/kluby?kategorie=${kategorie}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kategorie])

  // Agreguj přes kategorie pokud "vse"
  const aggMap: Record<string, AggRow> = {}
  for (const r of data) {
    if (!aggMap[r.klub]) aggMap[r.klub] = { klub: r.klub, body_dv: 0, body_ct: 0, body_celkem: 0, pocet: 0 }
    aggMap[r.klub].body_dv += r.body_dv
    aggMap[r.klub].body_ct += r.body_ct
    aggMap[r.klub].body_celkem += r.body_celkem
    aggMap[r.klub].pocet += r.pocet
  }

  const radky = Object.values(aggMap)
    .filter(r => r.klub.toLowerCase().includes(hledej.toLowerCase()))
    .sort((a, b) => {
      if (disciplina === "dv") return b.body_dv - a.body_dv
      if (disciplina === "ct") return b.body_ct - a.body_ct
      return b.body_celkem - a.body_celkem
    })

  const bodyKlubu = (r: AggRow) => {
    if (disciplina === "dv") return r.body_dv
    if (disciplina === "ct") return r.body_ct
    return r.body_celkem
  }

  const top = radky.length > 0 ? bodyKlubu(radky[0]) : 0

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-xs">LR</div>
            <div>
              <h1 className="text-base font-black tracking-tight">LIVE RANKING</h1>
              <p className="text-[10px] text-white/40">Klubový žebříček · mládež</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-white/40 hover:text-[#e8ff3e] transition-colors">← Hráči</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Kategorie */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {KATEGORIE.map(k => (
            <button key={k.slug} onClick={() => setKategorie(k.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                kategorie === k.slug ? "bg-[#e8ff3e] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}>
              {k.nazev}
            </button>
          ))}
        </div>

        {/* Filtry */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input type="text" placeholder="Hledat klub..."
            value={hledej} onChange={e => setHledej(e.target.value)}
            className="flex-1 min-w-0 sm:w-56 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50" />
          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {[{ val: "celkem", label: "Celkem" }, { val: "dv", label: "2H" }, { val: "ct", label: "4H" }].map(d => (
              <button key={d.val} onClick={() => setDisciplina(d.val)}
                className={`px-3 py-2 text-xs font-semibold transition-all ${disciplina === d.val ? "bg-[#e8ff3e] text-black" : "text-white/60 hover:text-white"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-32 text-white/30">
            <p className="text-4xl mb-4">🎾</p>
            <p>Načítám kluby...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Klubů", value: radky.length },
                { label: "Top body", value: top },
                { label: "Hráčů celkem", value: radky.reduce((s, r) => s + r.pocet, 0) },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xl font-black text-[#e8ff3e]">{s.value}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabulka */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              {/* Záhlaví desktop */}
              <div className="hidden sm:grid gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase tracking-wider"
                style={{ gridTemplateColumns: "3rem 1fr 4rem 4rem 4rem 4rem" }}>
                <span>#</span><span>Klub</span><span className="text-right">Hráči</span>
                <span className="text-right">2H</span><span className="text-right">4H</span><span className="text-right">Body</span>
              </div>
              {/* Záhlaví mobil */}
              <div className="grid sm:hidden gap-2 px-3 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase tracking-wider"
                style={{ gridTemplateColumns: "2.5rem 1fr auto" }}>
                <span>#</span><span>Klub</span><span className="text-right">Body</span>
              </div>

              {radky.map((r, i) => {
                const poradiColor = i === 0 ? "text-[#e8ff3e]" : i === 1 ? "text-white/60" : i === 2 ? "text-orange-400/70" : "text-white/30"
                const body = bodyKlubu(r)
                const pct = top > 0 ? (body / top) * 100 : 0
                return (
                  <div key={r.klub}>
                    {/* Desktop */}
                    <div className="hidden sm:grid gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors items-center relative overflow-hidden"
                      style={{ gridTemplateColumns: "3rem 1fr 4rem 4rem 4rem 4rem" }}>
                      <div className="absolute inset-0 bg-[#e8ff3e]/[0.03]" style={{ width: `${pct}%` }} />
                      <span className={`text-sm font-black relative ${poradiColor}`}>{i + 1}</span>
                      <span className="text-sm font-semibold relative truncate">{r.klub}</span>
                      <span className="text-xs text-white/40 text-right relative">{r.pocet}</span>
                      <span className="text-sm text-white/60 text-right relative">{r.body_dv}</span>
                      <span className="text-sm text-white/60 text-right relative">{r.body_ct}</span>
                      <span className={`text-sm font-black text-right relative ${i === 0 ? "text-[#e8ff3e]" : "text-white"}`}>{body}</span>
                    </div>
                    {/* Mobil */}
                    <div className="grid sm:hidden gap-2 px-3 py-2.5 border-b border-white/5 items-center"
                      style={{ gridTemplateColumns: "2.5rem 1fr auto" }}>
                      <span className={`text-sm font-black ${poradiColor}`}>{i + 1}</span>
                      <div>
                        <span className="text-sm font-semibold block truncate">{r.klub}</span>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">2H: {r.body_dv}</span>
                          <span className="text-[10px] text-white/30">4H: {r.body_ct}</span>
                          <span className="text-[10px] text-white/30">{r.pocet} hráčů</span>
                        </div>
                      </div>
                      <span className={`text-sm font-black ${i === 0 ? "text-[#e8ff3e]" : "text-white"}`}>{body}</span>
                    </div>
                  </div>
                )
              })}
              {radky.length === 0 && (
                <div className="text-center py-16 text-white/30">Žádné kluby nenalezeny</div>
              )}
            </div>
            <p className="text-xs text-white/20 mt-4 text-center">* TE/ITF/ATP/WTA hráči nejsou zahrnuti v bodech klubu</p>
          </>
        )}
      </main>
    </div>
  )
}
