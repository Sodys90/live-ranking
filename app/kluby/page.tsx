"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import ThemeToggle from "../components/ThemeToggle"

const KATEGORIE = [
  { slug: "vse",           nazev: "Vše" },
  { slug: "mladsi-zaci",   nazev: "Ml. žáci" },
  { slug: "mladsi-zakyne", nazev: "Ml. žákyně" },
  { slug: "starsi-zaci",   nazev: "St. žáci" },
  { slug: "starsi-zakyne", nazev: "St. žákyně" },
  { slug: "dorostenci",    nazev: "Dorostenci" },
  { slug: "dorostenky",    nazev: "Dorostenky" },
  { slug: "muzi",          nazev: "Muži" },
  { slug: "zeny",          nazev: "Ženy" },
]

const SVAZY = [
  "Vše", "Pražský TS", "Středočeský TS", "Jihočeský TS",
  "Západočeský TS", "Severočeský TS", "Východočeský TS",
  "Jihomoravský TS", "Severomoravský TS"
]

type KlubRow = { klub: string; kategorie_slug: string; body_dv: number; body_ct: number; body_celkem: number; pocet: number; oblast: string; svaz: string }
type AggRow = { klub: string; body_dv: number; body_ct: number; body_celkem: number; pocet: number; oblast: string; svaz: string }

export default function KlubovyZebricek() {
  const [data, setData] = useState<KlubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [kategorie, setKategorie] = useState("vse")
  const [svaz, setSvaz] = useState("Vše")
  const [disciplina, setDisciplina] = useState("celkem")
  const [hledej, setHledej] = useState("")

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (kategorie !== "vse") params.set("kategorie", kategorie)
    if (svaz !== "Vše") params.set("svaz", svaz)
    fetch(`/api/kluby?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kategorie, svaz])

  const aggMap: Record<string, AggRow> = {}
  for (const r of data) {
    if (!aggMap[r.klub]) aggMap[r.klub] = { klub: r.klub, body_dv: 0, body_ct: 0, body_celkem: 0, pocet: 0, oblast: r.oblast, svaz: r.svaz }
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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
              <path d="M14 14 C36 26, 36 34, 14 46" stroke="white" strokeWidth="2.5" fill="none"/>
              <path d="M46 14 C24 26, 24 34, 46 46" stroke="white" strokeWidth="2.5" fill="none"/>
            </svg>
            <div>
              <span className="text-base font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Tenis<span style={{ color: '#FF3B3B' }}>CZ</span>
              </span>
              
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ color: 'var(--text-2)' }}>
              Hráči
            </Link>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
              Kluby
            </span>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {KATEGORIE.map(k => (
            <button key={k.slug} onClick={() => setKategorie(k.slug)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              style={kategorie === k.slug
                ? { background: '#00B14F', color: '#fff' }
                : { background: 'var(--bg-card)', color: 'var(--text-2)', border: '1px solid var(--border)' }
              }>
              {k.nazev}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {SVAZY.map(s => (
            <button key={s} onClick={() => setSvaz(s)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              style={svaz === s
                ? { background: 'var(--text)', color: 'var(--bg)' }
                : { background: 'var(--bg-card)', color: 'var(--text-3)', border: '1px solid var(--border)' }
              }>
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-0 sm:w-56 sm:flex-none">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Hledat klub..."
              value={hledej} onChange={e => setHledej(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[{ val: "celkem", label: "Celkem" }, { val: "dv", label: "2H" }, { val: "ct", label: "4H" }].map(d => (
              <button key={d.val} onClick={() => setDisciplina(d.val)}
                className="px-3 py-2 text-xs font-bold transition-all"
                style={disciplina === d.val
                  ? { background: '#00B14F', color: '#fff' }
                  : { background: 'var(--bg-card)', color: 'var(--text-2)' }
                }>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-32" style={{ color: 'var(--text-3)' }}>
            <div className="inline-block w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: 'var(--border)', borderTopColor: '#00B14F' }} />
            <p className="text-sm">Načítám kluby...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Klubů", value: radky.length },
                { label: "Top body", value: top },
                { label: "Hráčů celkem", value: radky.reduce((s, r) => s + r.pocet, 0) },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-black mono" style={{ color: '#00B14F' }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="hidden sm:grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: "3rem 1fr 8rem 4rem 4rem 4rem 5rem", background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <span>#</span><span>Klub</span><span>Svaz</span>
                <span className="text-right">Hráči</span><span className="text-right">2H</span>
                <span className="text-right">4H</span><span className="text-right">Body</span>
              </div>
              <div className="grid sm:hidden px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: "2.5rem 1fr auto", background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <span>#</span><span>Klub</span><span className="text-right">Body</span>
              </div>

              {radky.map((r, i) => {
                const isTop1 = i === 0
                const isTop2 = i === 1
                const isTop3 = i === 2
                const poradiColor = isTop1 ? '#00B14F' : isTop2 ? '#A7B1B5' : isTop3 ? '#F5A623' : 'var(--text-3)'
                const body = bodyKlubu(r)
                const pct = top > 0 ? (body / top) * 100 : 0
                return (
                  <div key={r.klub}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
                    <div className="hidden sm:grid gap-3 px-4 py-2.5 items-center relative overflow-hidden"
                      style={{ gridTemplateColumns: "3rem 1fr 8rem 4rem 4rem 4rem 5rem" }}>
                      <div className="absolute inset-y-0 left-0 opacity-30" style={{ width: `${pct}%`, background: 'var(--brand-dim)' }} />
                      <span className="text-sm font-black mono relative" style={{ color: poradiColor }}>{i + 1}</span>
                      <span className="text-sm font-semibold truncate relative" style={{ color: 'var(--text)' }}>{r.klub}</span>
                      <span className="text-xs truncate relative" style={{ color: 'var(--text-3)' }}>{r.svaz}</span>
                      <span className="text-xs text-right mono relative" style={{ color: 'var(--text-3)' }}>{r.pocet}</span>
                      <span className="text-sm text-right mono relative" style={{ color: 'var(--text-2)' }}>{r.body_dv}</span>
                      <span className="text-sm text-right mono relative" style={{ color: 'var(--text-2)' }}>{r.body_ct}</span>
                      <span className="text-sm font-black text-right mono relative" style={{ color: isTop1 ? '#00B14F' : 'var(--text)' }}>{body}</span>
                    </div>
                    <div className="grid sm:hidden gap-2 px-3 py-3 items-center"
                      style={{ gridTemplateColumns: "2.5rem 1fr auto" }}>
                      <span className="text-sm font-black mono" style={{ color: poradiColor }}>{i + 1}</span>
                      <div>
                        <span className="text-sm font-semibold block truncate" style={{ color: 'var(--text)' }}>{r.klub}</span>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>{r.svaz}</span>
                          <span style={{ color: 'var(--border)' }}>·</span>
                          <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>2H: {r.body_dv}</span>
                          <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>4H: {r.body_ct}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black mono" style={{ color: isTop1 ? '#00B14F' : 'var(--text)' }}>{body}</span>
                    </div>
                  </div>
                )
              })}
              {radky.length === 0 && (
                <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Žádné kluby nenalezeny</div>
              )}
            </div>
            <p className="text-[10px] mt-4 text-center" style={{ color: 'var(--text-3)' }}>* TE/ITF/ATP/WTA hráči nejsou zahrnuti v bodech klubu</p>
          </>
        )}
      </main>
    </div>
  )
}
