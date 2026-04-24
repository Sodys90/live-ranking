"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import ThemeToggle from "./components/ThemeToggle"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Ml. žáci",    full: "Mladší žáci",    rocniky: [2014,2015,2016] },
  { slug: "mladsi-zakyne", nazev: "Ml. žákyně",  full: "Mladší žákyně",  rocniky: [2014,2015,2016] },
  { slug: "starsi-zaci",   nazev: "St. žáci",    full: "Starší žáci",    rocniky: [2012,2013,2014,2015,2016] },
  { slug: "starsi-zakyne", nazev: "St. žákyně",  full: "Starší žákyně",  rocniky: [2012,2013,2014,2015,2016] },
  { slug: "dorostenci",    nazev: "Dorostenci",  full: "Dorostenci",     rocniky: [2008,2009,2010,2011] },
  { slug: "dorostenky",    nazev: "Dorostenky",  full: "Dorostenky",     rocniky: [2008,2009,2010,2011] },
  { slug: "muzi",          nazev: "Muži",        full: "Muži",           rocniky: [] },
  { slug: "zeny",          nazev: "Ženy",        full: "Ženy",           rocniky: [] },
]

const TYP_PRIORITY: Record<string,number> = { ATP:0, WTA:0, ITF:1, TE:2 }

export default function Home() {
  const [aktivni, setAktivni]     = useState("mladsi-zaci")
  const [data, setData]           = useState<any>(null)
  const [hledej, setHledej]       = useState("")
  const [loading, setLoading]     = useState(true)
  const [disciplina, setDisciplina] = useState("celkem")
  const [rocnik, setRocnik]       = useState("vse")
  const [trend, setTrend]         = useState<Record<string,{trend:number,novy:boolean}>>({})
  const [nmk, setNmk]             = useState<Record<string,number>>({})
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/zebricky").then(r => r.json()),
      fetch("/api/trend").then(r => r.json()),
      fetch("/api/nmk").then(r => r.json()),
    ]).then(([d, t, n]) => { setData(d); setTrend(t); setNmk(n); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const aktivniKat = KATEGORIE.find(k => k.slug === aktivni)
  const kat        = data?.[aktivni]
  const vsichni    = kat?.hraci ?? []

  const teItf = vsichni.filter((h:any) => h.te_itf).sort((a:any,b:any) => {
    const pa = TYP_PRIORITY[a.te_itf_typ]??9, pb = TYP_PRIORITY[b.te_itf_typ]??9
    return pa!==pb ? pa-pb : (a.te_itf_poradi??999)-(b.te_itf_poradi??999)
  })

  const cestiSerazeni = vsichni
    .filter((h:any) => !h.te_itf)
    .sort((a:any,b:any) => {
      if (disciplina==="dv") return b.body_dv-a.body_dv
      if (disciplina==="ct") return b.body_ct-a.body_ct
      return b.body_celkem-a.body_celkem
    })
    .map((h:any,i:number) => ({...h, poradi_disc:i+1}))

  const cesteFiltr = cestiSerazeni.filter((h:any) => {
    const mH = h.jmeno.toLowerCase().includes(hledej.toLowerCase()) || h.klub.toLowerCase().includes(hledej.toLowerCase())
    const mR = rocnik==="vse" || String(h.narozeni)===rocnik
    return mH && mR
  })

  const hraci = hledej||rocnik!=="vse" ? cesteFiltr : [...teItf,...cesteFiltr]
  const hasMez = vsichni.some((h:any) => h.te_itf||h.ma_mezinarodni)

  // Pořadí v klubu
  const klubCounter: Record<string, number> = {}
  const klubPoradi: Record<string, number> = {}
  cestiSerazeni.forEach((h:any) => {
    if (!klubCounter[h.klub]) klubCounter[h.klub] = 0
    klubCounter[h.klub]++
    klubPoradi[h.id] = klubCounter[h.klub]
  })

  const getBody  = (h:any) => disciplina==="dv"?h.body_dv:disciplina==="ct"?h.body_ct:h.body_celkem
  const sHraci   = cesteFiltr.filter((h:any) => getBody(h)>0)
  const topBody  = sHraci[0] ? getBody(sHraci[0]) : 0
  const prumer   = Math.round(sHraci.reduce((s:number,h:any)=>s+getBody(h),0)/(sHraci.length||1))

  const formatDatum = (iso:string) => new Date(iso).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"})
  const nextMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = day===1 ? 7 : (8-day)%7||7
    d.setDate(d.getDate()+diff)
    return d.toLocaleDateString("cs-CZ",{day:"numeric",month:"long"})
  }

  const badgeStyle = (typ:string) => {
    if (typ==="ATP"||typ==="WTA") return {background:"#7C3AED18",color:"#9F7AEA",border:"1px solid #7C3AED30"}
    if (typ==="ITF") return {background:"#2563EB18",color:"#60A5FA",border:"1px solid #2563EB30"}
    return {background:"#FF3B3B18",color:"#FF3B3B",border:"1px solid #FF3B3B30"}
  }

  const bodySloupec = (h:any) => {
    if (h.te_itf) return "****"
    return getBody(h)
  }

  const cols = hasMez
    ? "3rem 2.2rem minmax(0,1fr) 5rem 3rem minmax(0,1fr) 3.5rem 3.5rem 5rem 3rem"
    : "3rem 2.2rem minmax(0,1fr) 3rem minmax(0,1fr) 3.5rem 3.5rem 5rem 3rem"

  return (
    <div className="min-h-screen" style={{background:"var(--bg)"}}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50" style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-8 h-8">
              <svg viewBox="0 0 60 60" className="w-8 h-8">
                <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
                <path d="M13 13 C37 25,37 35,13 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M47 13 C23 25,23 35,47 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-white font-black text-lg tracking-tight">
              Tenis<span style={{color:"#FF3B3B"}}>CZ</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-0.5">
            <span className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{background:"#FF3B3B20",color:"#FF3B3B"}}>Hráči</span>
            <Link href="/kluby" className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors" style={{color:"#8B949E"}}
              onMouseEnter={e=>(e.currentTarget.style.color="#E6EDF3")}
              onMouseLeave={e=>(e.currentTarget.style.color="#8B949E")}>
              Kluby
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {kat && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{background:"#FFFFFF10",border:"1px solid #FFFFFF20"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF60" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span className="text-[10px] font-semibold" style={{color:"#FFFFFF70"}}>Aktualizován: {formatDatum(kat.aktualizace)}</span>
                <span className="text-[10px]" style={{color:"#FFFFFF30"}}>·</span>
                <span className="text-[10px] font-semibold" style={{color:"#FFFFFF40"}}>Další: {nextMonday()}</span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── KATEGORIE TABS ── */}
      <div style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-7xl mx-auto px-4">
          <div ref={tabsRef} className="flex gap-0 overflow-x-auto scrollbar-hide">
            {KATEGORIE.map(k => (
              <button key={k.slug}
                onClick={()=>{setAktivni(k.slug);setHledej("");setRocnik("vse")}}
                className="px-4 py-3 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-all"
                style={aktivni===k.slug
                  ? {color:"#FF3B3B",borderColor:"#FF3B3B",background:"transparent"}
                  : {color:"#6E7681",borderColor:"transparent",background:"transparent"}
                }>
                {k.nazev}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-4">

        {/* ── FILTRY ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:"var(--text-3)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Hledat hráče nebo klub..."
              value={hledej} onChange={e=>setHledej(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg text-xs w-56 focus:outline-none focus:ring-1"
              style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}} />
          </div>

          {aktivniKat && aktivniKat.rocniky.length>0 && (
            <select value={rocnik} onChange={e=>setRocnik(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs focus:outline-none"
              style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}}>
              <option value="vse">Všechny ročníky</option>
              {aktivniKat.rocniky.map(r=><option key={r} value={String(r)}>{r}</option>)}
            </select>
          )}

          <div className="flex rounded-full p-0.5" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
            {[{val:"celkem",label:"Celkem"},{val:"dv",label:"2H"},{val:"ct",label:"4H"}].map(d=>(
              <button key={d.val} onClick={()=>setDisciplina(d.val)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={disciplina===d.val
                  ? {background:"#FF3B3B",color:"#fff",boxShadow:"0 1px 3px #FF3B3B40"}
                  : {background:"transparent",color:"var(--text-3)"}}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4" style={{color:"var(--text-3)"}}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#FF3B3B"}}/>
            <span className="text-sm">Načítám žebříček...</span>
          </div>
        ) : !kat ? (
          <div className="text-center py-40 text-sm" style={{color:"var(--text-3)"}}>Data nejsou k dispozici</div>
        ) : (
          <>
            {/* ── STATS ── */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {label:"Hráčů",value:sHraci.length,tip:"Hráčů s alespoň 1 bodem"},
                {label:"Top body",value:topBody,tip:"Nejvyšší počet bodů v kategorii"},
                {label:"Průměr",value:prumer,tip:"Průměrný počet bodů"},
                ...(teItf.length>0?[{label:"Mez. žeb.",value:teItf.length,tip:"Počet hráčů na mezinárodním žebříčku"}]:[]),
              ].map(s=>(
                <div key={s.label} title={s.tip}
                  className="flex items-baseline gap-2 px-3 py-2 rounded-lg cursor-help justify-center sm:justify-start"
                  style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
                  <span className="text-base font-black mono leading-none" style={{color:"#FF3B3B"}}>{s.value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{color:"var(--text-3)"}}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* ── TABULKA ── */}
            <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>

              {/* Záhlaví desktop */}
              <div className="hidden sm:grid gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{gridTemplateColumns:cols,background:"var(--bg-card)",borderBottom:"2px solid var(--border)",color:"var(--text-3)"}}>
                <span>#</span>
                <span className="cursor-help" title="Nejlepší historické umístění">NH</span>
                <span>Hráč</span>
                {hasMez && <span className="text-center cursor-help" title="Mezinárodní žebříček">Mez.</span>}
                <span className="text-center">Nar.</span>
                <span>Klub</span>
                <span className="text-right cursor-help" title="Body získané z dvouhry">2H</span>
                <span className="text-right cursor-help" title="Body získané ze čtyřhry">4H</span>
                <span className="text-right cursor-help" title="Součet 8 nejlepších akcí">Body</span>
                <span className="text-right cursor-help" title="Bonusová hodnota">BH</span>
              </div>

              {/* Záhlaví mobil */}
              <div className="grid sm:hidden gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                style={{gridTemplateColumns:"2.5rem 1fr auto",background:"var(--bg-card)",borderBottom:"2px solid var(--border)",color:"var(--text-3)"}}>
                <span>#</span><span>Hráč</span><span className="text-right">Body</span>
              </div>

              {hraci.map((h:any,i:number) => {
                const jeTeItf = h.te_itf
                const poradi  = jeTeItf ? (teItf.indexOf(h)+1) : (h.poradi_disc??i-teItf.length+1)
                const isTop1  = !jeTeItf && poradi===1
                const isTop2  = !jeTeItf && poradi===2
                const isTop3  = !jeTeItf && poradi===3

                const rankColor = isTop1?"#D4A017":isTop2?"#9BA3AC":isTop3?"#A0522D":"var(--text-3)"
                const rowBg = jeTeItf?"var(--brand-dim)" : i%2===0?"var(--bg-card)":"var(--bg-stripe)"

                return (
                  <div key={h.id}
                    style={{borderBottom:"1px solid var(--border)",background:rowBg,borderLeft:isTop1?"3px solid #D4A017":isTop2?"3px solid #9BA3AC":isTop3?"3px solid #A0522D":"3px solid transparent"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="var(--bg-hover)";e.currentTarget.style.transition="background 0.1s"}}
                    onMouseLeave={e=>{e.currentTarget.style.background=rowBg}}>

                    {/* Desktop */}
                    <div className="hidden sm:grid gap-3 px-4 py-[7px] items-center"
                      style={{gridTemplateColumns:cols}}>

                      {/* # */}
                      <span className="text-xs font-black mono" style={{color:rankColor}}>{i+1}</span>

                      {/* MK badge */}
                      {(() => {
                        if (jeTeItf) return <span/>
                        const key = `${h.id}__${aktivni}`
                        const best = nmk[key]
                        if (!best) return <span/>
                        const diff = h.poradi_live - best
                        if (diff === 0) return (
                          <span className="text-[9px] font-black w-6 h-5 flex items-center justify-center rounded" style={{background:"#F5A623",color:"#fff"}}>
                            {best}
                          </span>
                        )
                        if (diff <= 5) return (
                          <span className="text-[9px] font-black w-6 h-5 flex items-center justify-center rounded" style={{background:"#00B14F",color:"#fff"}}>
                            {best}
                          </span>
                        )
                        if (diff <= 30) return (
                          <span className="text-[9px] font-black w-6 h-5 flex items-center justify-center rounded" style={{background:"#6E7681",color:"#fff"}}>
                            {best}
                          </span>
                        )
                        return (
                          <span className="text-[9px] font-black w-6 h-5 flex items-center justify-center rounded" style={{background:"#0D1117",color:"#fff",border:"1px solid #30363D"}}>
                            {best}
                          </span>
                        )
                      })()}

                      {/* Jméno */}
                      <div className="min-w-0 group flex items-center gap-2">
                        <a href={`https://cztenis.cz/hrac/${h.id}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm truncate flex items-center gap-1 hover:underline"
                          style={{color:"var(--text)"}}>
                          <span className="truncate">{h.jmeno}</span>
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity text-xs shrink-0">↗</span>
                        </a>
                        {(() => {
                          const t = trend[`${h.id}__${aktivni}`]
                          if (!t) return null
                          if (t.novy) return <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0" style={{background:"#FF3B3B15",color:"#FF3B3B"}}>NEW</span>
                          if (t.trend > 0) return <span className="text-[10px] font-bold shrink-0" style={{color:"#00B14F"}}>↑{t.trend}</span>
                          if (t.trend < 0) return <span className="text-[10px] font-bold shrink-0" style={{color:"#FF3B3B"}}>↓{Math.abs(t.trend)}</span>
                          return <span className="text-[10px] shrink-0" style={{color:"var(--text-3)"}}>—</span>
                        })()}
                      </div>

                      {/* Mez */}
                      {hasMez && (
                        <div className="flex justify-center">
                          {jeTeItf ? (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={badgeStyle(h.te_itf_typ)}>
                              {h.te_itf_typ} {h.te_itf_poradi}
                            </span>
                          ) : h.ma_mezinarodni ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:"#2563EB18",color:"#60A5FA",border:"1px solid #2563EB30"}}>INT</span>
                          ) : null}
                        </div>
                      )}

                      <span className="text-xs text-center mono" style={{color:"var(--text-3)"}}>{h.narozeni}</span>
                      <span className="text-xs truncate cursor-help" title={h.klub} style={{color:"var(--text-2)"}}>
                        {h.klub}{!jeTeItf && klubPoradi[h.id] ? <sub className="mono font-bold" style={{color:"var(--text-3)",fontSize:"9px"}}>{klubPoradi[h.id]}</sub> : null}
                      </span>
                      <span className="text-xs text-right mono" style={{color:"var(--text-2)"}}>{jeTeItf?"—":h.body_dv}</span>
                      <span className="text-xs text-right mono" style={{color:"var(--text-2)"}}>{jeTeItf?"—":h.body_ct}</span>
                      <span className="text-sm font-black text-right mono" style={{color:isTop1?"#D4A017":jeTeItf?"var(--text-3)":"var(--text)"}}>
                        {bodySloupec(h)}
                      </span>
                      <span className="text-xs text-right mono" style={{color:"var(--text-3)"}}>{jeTeItf?"—":(h.bh??0)}</span>
                    </div>

                    {/* Mobil */}
                    <div className="grid sm:hidden gap-1.5 px-3 py-2 items-center"
                      style={{gridTemplateColumns:"2rem auto 1fr auto"}}>
                      <span className="text-xs font-black mono" style={{color:rankColor}}>{i+1}</span>

                      {/* NH badge mobil */}
                      {(() => {
                        if (jeTeItf) return <span/>
                        const key = `${h.id}__${aktivni}`
                        const best = nmk[key]
                        if (!best) return <span/>
                        const diff = (h.poradi_live||0) - best
                        const bg = diff===0?"#F5A623":diff<=5?"#00B14F":diff<=30?"#6E7681":"#0D1117"
                        const border = diff>30?"1px solid #30363D":"none"
                        return <span className="text-[9px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0" style={{background:bg,color:"#fff",border}}>{best}</span>
                      })()}

                      <div className="min-w-0">
                        <a href={`https://cztenis.cz/hrac/${h.id}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-[13px] truncate block" style={{color:"var(--text)"}}>
                          {h.jmeno}
                        </a>
                        <div className="flex gap-1.5 mt-0.5 items-center">
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>{h.narozeni}</span>
                          <span style={{color:"var(--border)"}}>·</span>
                          <span className="text-[10px] truncate" style={{color:"var(--text-3)"}}>{h.klub}{!jeTeItf && klubPoradi[h.id] ? <sub className="mono font-bold" style={{color:"var(--text-3)",fontSize:"8px"}}>{klubPoradi[h.id]}</sub> : null}</span>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>2H {jeTeItf?"—":h.body_dv}</span>
                          <span className="text-[10px] mono" style={{color:"var(--text-3)"}}>4H {jeTeItf?"—":h.body_ct}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black mono" style={{color:isTop1?"#D4A017":jeTeItf?"var(--text-3)":"var(--text)"}}>
                          {bodySloupec(h)}
                        </span>
                        {!jeTeItf && <div className="text-[10px] mono" style={{color:"var(--text-3)"}}>BH {h.bh??0}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}

              {hraci.length===0 && (
                <div className="text-center py-16 text-sm" style={{color:"var(--text-3)"}}>Žádní hráči nenalezeni</div>
              )}
            </div>

            <p className="text-[10px] mt-3 text-center" style={{color:"var(--text-3)"}}>
              Body z českých turnajů · INT = mezinárodní turnaje zadány · BH = bonusová hodnota
            </p>
          </>
        )}
      </main>
    {/* Mobilní bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 sm:hidden z-50 flex"
        style={{background:"var(--header-bg)",borderTop:"1px solid var(--header-border)"}}>
        <a href="/" className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
          style={{color:"#FF3B3B"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span className="text-[10px] font-bold">Hráči</span>
        </a>
        <a href="/kluby" className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
          style={{color:"#6E7681"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-bold">Kluby</span>
        </a>
      </nav>

      {/* Padding pro bottom nav na mobilu */}
      <div className="h-16 sm:hidden"/>
    </div>
  )
}
