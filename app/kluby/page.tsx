"use client"
import { useState, useEffect, useRef } from "react"
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
type AggRow  = { klub: string; body_dv: number; body_ct: number; body_celkem: number; pocet: number; oblast: string; svaz: string }

const nextMonday = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = day===1 ? 7 : (8-day)%7||7
  d.setDate(d.getDate()+diff)
  return d.toLocaleDateString("cs-CZ",{day:"numeric",month:"long"})
}

const lastMonday = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = day===1 ? 0 : (day+6)%7
  d.setDate(d.getDate()-diff)
  return d.toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"})
}

export default function KlubovyZebricek() {
  const [katScroll, setKatScroll] = useState({left: false, right: true})
  const [svazScroll, setSvazScroll] = useState({left: false, right: true})
  const katRef = useRef<HTMLDivElement>(null)
  const svazRef = useRef<HTMLDivElement>(null)
  const [data, setData]           = useState<KlubRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [kategorie, setKategorie] = useState("vse")
  const [svaz, setSvaz]           = useState("Vše")
  const [disciplina, setDisciplina] = useState("celkem")
  const [hledej, setHledej]       = useState("")
  const [aktualizace, setAktualizace] = useState<string|null>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (kategorie !== "vse") params.set("kategorie", kategorie)
    if (svaz !== "Vše") params.set("svaz", svaz)
    Promise.all([
      fetch(`/api/kluby?${params}`).then(r => r.json()),
      fetch('/api/zebricky').then(r => r.json()),
    ]).then(([d, z]) => {
      setData(d)
      const kat = Object.values(z)[0] as any
      if (kat?.aktualizace) setAktualizace(kat.aktualizace)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [kategorie, svaz])

  const aggMap: Record<string, AggRow> = {}
  for (const r of data) {
    if (!aggMap[r.klub]) aggMap[r.klub] = { klub: r.klub, body_dv: 0, body_ct: 0, body_celkem: 0, pocet: 0, oblast: r.oblast, svaz: r.svaz }
    aggMap[r.klub].body_dv     += r.body_dv
    aggMap[r.klub].body_ct     += r.body_ct
    aggMap[r.klub].body_celkem += r.body_celkem
    aggMap[r.klub].pocet       += r.pocet
  }

  const radky = Object.values(aggMap)
    .filter(r => r.klub.toLowerCase().includes(hledej.toLowerCase()))
    .sort((a, b) => {
      if (disciplina === "dv") return b.body_dv - a.body_dv
      if (disciplina === "ct") return b.body_ct - a.body_ct
      return b.body_celkem - a.body_celkem
    })

  const bodyKlubu = (r: AggRow) => disciplina === "dv" ? r.body_dv : disciplina === "ct" ? r.body_ct : r.body_celkem
  const top = radky.length > 0 ? bodyKlubu(radky[0]) : 0

  return (
    <div className="min-h-screen" style={{background:"var(--bg)"}}>

      {/* HEADER */}
      <header className="sticky top-0 z-50" style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <svg viewBox="0 0 60 60" className="w-8 h-8">
              <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
              <path d="M13 13 C37 25,37 35,13 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M47 13 C23 25,23 35,47 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            </svg>
            <span className="text-white font-black text-lg tracking-tight">
              Tenis<span style={{color:"#FF3B3B"}}>CZ</span>
            </span>
          </div>

          <nav className="hidden sm:flex items-center">
            <Link href="/" className="px-4 py-4 text-xs font-semibold border-b-2 transition-all" style={{color:"#6E7681",borderColor:"transparent"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#E6EDF3"}}
              onMouseLeave={e=>{e.currentTarget.style.color="#6E7681"}}>
              Hráči
            </Link>
            <span className="px-4 py-4 text-xs font-semibold border-b-2 transition-all" style={{color:"#FF3B3B",borderColor:"#FF3B3B",background:"var(--bg-2)"}}>Kluby</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{background:"#FFFFFF10",border:"1px solid #FFFFFF20"}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF60" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <span className="text-[10px] font-semibold" style={{color:"#FFFFFF70"}}>Data aktualizována: {aktualizace ? new Date(aktualizace).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"}) : "..."}</span>
              <span className="text-[10px]" style={{color:"#FFFFFF30"}}>·</span>
              <span className="text-[10px] font-semibold" style={{color:"#FFFFFF40"}}>Další: {nextMonday()}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* KATEGORIE TABS */}
      <div style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-7xl mx-auto px-4 relative">
          {katScroll.left && (
            <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none sm:hidden flex items-center justify-start pl-1 z-10" style={{background:"linear-gradient(to left, transparent, var(--header-bg))"}}>
              <span className="text-white/50 text-sm font-bold">‹</span>
            </div>
          )}
          {katScroll.right && (
            <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none sm:hidden flex items-center justify-end pr-1 z-10" style={{background:"linear-gradient(to right, transparent, var(--header-bg))"}}>
              <span className="text-white/50 text-sm font-bold animate-pulse">›</span>
            </div>
          )}
          <div ref={katRef} className="flex gap-0 overflow-x-auto scrollbar-hide"
            onScroll={() => {
              const el = katRef.current
              if (!el) return
              setKatScroll({left: el.scrollLeft > 10, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 10})
            }}>
            {KATEGORIE.map(k => (
              <button key={k.slug} onClick={() => setKategorie(k.slug)}
                className="px-4 py-3 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-all"
                style={kategorie === k.slug
                  ? {color:"#FF3B3B",borderColor:"#FF3B3B",background:"var(--bg-2)"}
                  : {color:"#6E7681",borderColor:"transparent",background:"transparent"}
                }>
                {k.nazev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVAZY TABS */}
      <div style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)"}}>
        <div className="max-w-7xl mx-auto px-4 relative">
          {svazScroll.left && (
            <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none sm:hidden flex items-center justify-start pl-1 z-10" style={{background:"linear-gradient(to left, transparent, var(--bg-card))"}}>
              <span className="text-sm font-bold" style={{color:"var(--text-3)"}}>‹</span>
            </div>
          )}
          {svazScroll.right && (
            <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none sm:hidden flex items-center justify-end pr-1 z-10" style={{background:"linear-gradient(to right, transparent, var(--bg-card))"}}>
              <span className="text-sm font-bold animate-pulse" style={{color:"var(--text-3)"}}>›</span>
            </div>
          )}
          <div ref={svazRef} className="flex gap-0 overflow-x-auto scrollbar-hide"
            onScroll={() => {
              const el = svazRef.current
              if (!el) return
              setSvazScroll({left: el.scrollLeft > 10, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 10})
            }}>
            {SVAZY.map(s => (
              <button key={s} onClick={() => setSvaz(s)}
                className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-all"
                style={svaz === s
                  ? {color:"var(--text)",borderColor:"var(--text)",background:"var(--bg-2)"}
                  : {color:"var(--text-3)",borderColor:"transparent",background:"transparent"}
                }>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-4">

        {/* FILTRY */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:"var(--text-3)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Hledat klub..."
              value={hledej} onChange={e => setHledej(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg text-xs w-48 focus:outline-none"
              style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}} />
          </div>

          <div className="flex rounded-xl p-1 shrink-0" style={{background:"var(--bg-hover)"}}>
            {[{val:"celkem",label:"Celkem"},{val:"dv",label:"2H"},{val:"ct",label:"4H"}].map(d => (
              <button key={d.val} onClick={() => setDisciplina(d.val)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={disciplina === d.val
                  ? {background:"#FF3B3B",color:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}
                  : {background:"transparent",color:"var(--text-3)"}}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4" style={{color:"var(--text-3)"}}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#FF3B3B"}}/>
            <span className="text-sm">Načítám kluby...</span>
          </div>
        ) : (
          <>
            {/* STATS */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 mb-4">
              {[
                {label:"Klubů",    value:radky.length,          tip:"Počet klubů"},
                {label:"Top body", value:top,                   tip:"Nejvyšší počet bodů"},
                {label:"Hráčů",    value:radky.reduce((s,r)=>s+r.pocet,0), tip:"Celkem hráčů"},
              ].map(s => (
                <div key={s.label} title={s.tip}
                  className="flex items-baseline gap-2 px-3 py-2 rounded-lg cursor-help justify-center sm:justify-start"
                  style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
                  <span className="text-base font-black mono" style={{color:"#FF3B3B"}}>{s.value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{color:"var(--text-3)"}}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* TABULKA */}
            <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
              {/* Záhlaví desktop */}
              <div className="hidden sm:grid gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{gridTemplateColumns:"3rem minmax(0,1fr) 9rem 4rem 4rem 4rem 5rem",background:"var(--bg-card)",borderBottom:"2px solid var(--border)",color:"var(--text-3)"}}>
                <span>#</span>
                <span>Klub</span>
                <span>Svaz</span>
                <span className="text-right cursor-help" title="Počet hráčů v kategorii">Hráči</span>
                <span className="text-right cursor-help" title="Body získané z dvouhry">2H</span>
                <span className="text-right cursor-help" title="Body získané ze čtyřhry">4H</span>
                <span className="text-right cursor-help" title="Celkový součet bodů klubu">Body</span>
              </div>
              {/* Záhlaví mobil */}
              <div className="grid sm:hidden gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                style={{gridTemplateColumns:"2.5rem 1fr auto",background:"var(--bg-card)",borderBottom:"2px solid var(--border)",color:"var(--text-3)"}}>
                <span>#</span><span>Klub</span><span className="text-right">Body</span>
              </div>

              {radky.map((r, i) => {
                const isTop1 = i === 0
                const isTop2 = i === 1
                const isTop3 = i === 2
                const rankColor = isTop1?"#D4A017":isTop2?"#9BA3AC":isTop3?"#A0522D":"var(--text-3)"
                const body = bodyKlubu(r)
                const pct  = top > 0 ? (body/top)*100 : 0
                const rowBg = i%2===0?"var(--bg-card)":"var(--bg-stripe)"

                return (
                  <div key={r.klub}
                    style={{borderBottom:"1px solid var(--border)",background:rowBg,borderLeft:isTop1?"3px solid #D4A017":isTop2?"3px solid #9BA3AC":isTop3?"3px solid #A0522D":"3px solid transparent"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="var(--bg-hover)"}}
                    onMouseLeave={e=>{e.currentTarget.style.background=rowBg}}>

                    {/* Desktop */}
                    <div className="hidden sm:grid gap-3 px-4 py-[7px] items-center relative overflow-hidden"
                      style={{gridTemplateColumns:"3rem minmax(0,1fr) 9rem 4rem 4rem 4rem 5rem"}}>
                      <div className="absolute inset-y-0 left-12 opacity-20 pointer-events-none rounded"
                        style={{width:`${pct*0.4}%`,background:"#FF3B3B15"}}/>
                      <span className="text-xs font-black mono relative" style={{color:rankColor}}>{i+1}</span>
                      <span className="text-sm font-semibold truncate relative" style={{color:"var(--text)"}}>{r.klub}</span>
                      <span className="text-xs truncate relative" style={{color:"var(--text-3)"}}>{r.svaz}</span>
                      <span className="text-xs text-right mono relative" style={{color:"var(--text-3)"}}>{r.pocet}</span>
                      <span className="text-xs text-right mono relative" style={{color:"var(--text-2)"}}>{r.body_dv}</span>
                      <span className="text-xs text-right mono relative" style={{color:"var(--text-2)"}}>{r.body_ct}</span>
                      <span className="text-sm font-black text-right mono relative" style={{color:isTop1?"#D4A017":"var(--text)"}}>{body}</span>
                    </div>

                    {/* Mobil */}
                    <div className="grid sm:hidden gap-1.5 px-3 py-2 items-center"
                      style={{gridTemplateColumns:"2rem 1fr auto"}}>
                      <span className="text-xs font-black mono" style={{color:rankColor}}>{i+1}</span>
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold block" style={{color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"calc(100vw - 120px)"}}>
                          {r.klub.length > 22 ? r.klub.substring(0,22)+"…" : r.klub}
                        </span>
                        <div className="flex gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>{r.svaz.replace(" TS","")}</span>
                          <span style={{color:"var(--border)"}}>·</span>
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>2H {r.body_dv}</span>
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>4H {r.body_ct}</span>
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>{r.pocet} hr.</span>
                        </div>
                      </div>
                      <span className="text-sm font-black mono shrink-0" style={{color:isTop1?"#D4A017":"var(--text)"}}>{body}</span>
                    </div>
                  </div>
                )
              })}

              {radky.length === 0 && (
                <div className="text-center py-16 text-sm" style={{color:"var(--text-3)"}}>Nenašli jsme žádné výsledky. Zkus jiné jméno.</div>
              )}
            </div>
            <p className="text-[10px] mt-3 text-center" style={{color:"var(--text-3)"}}>
              * TE/ITF/ATP/WTA hráči nejsou zahrnuti v bodech klubu
            </p>
          </>
        )}
      </main>
    {/* Mobilní bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 sm:hidden z-50 flex"
        style={{background:"var(--header-bg)",borderTop:"1px solid var(--header-border)"}}>
        <a href="/" className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
          style={{color:"#6E7681"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span className="text-[10px] font-bold">Hráči</span>
        </a>
        <a href="/kluby" className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
          style={{color:"#FF3B3B"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-bold">Kluby</span>
        </a>
      </nav>
      <div className="h-16 sm:hidden"/>
    </div>
  )
}
