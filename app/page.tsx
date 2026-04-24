"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import ThemeToggle from "./components/ThemeToggle"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Ml. žáci",    rocniky: [2014,2015,2016] },
  { slug: "mladsi-zakyne", nazev: "Ml. žákyně",   rocniky: [2014,2015,2016] },
  { slug: "starsi-zaci",   nazev: "St. žáci",     rocniky: [2012,2013,2014,2015,2016] },
  { slug: "starsi-zakyne", nazev: "St. žákyně",   rocniky: [2012,2013,2014,2015,2016] },
  { slug: "dorostenci",    nazev: "Dorostenci",   rocniky: [2008,2009,2010,2011] },
  { slug: "dorostenky",    nazev: "Dorostenky",   rocniky: [2008,2009,2010,2011] },
  { slug: "muzi",          nazev: "Muži",         rocniky: [] },
  { slug: "zeny",          nazev: "Ženy",         rocniky: [] },
]

const TYP_PRIORITY: Record<string, number> = { "ATP": 0, "WTA": 0, "ITF": 1, "TE": 2 }

export default function Home() {
  const [aktivni, setAktivni] = useState("mladsi-zaci")
  const [data, setData] = useState<any>(null)
  const [hledej, setHledej] = useState("")
  const [loading, setLoading] = useState(true)
  const [disciplina, setDisciplina] = useState("celkem")
  const [rocnik, setRocnik] = useState("vse")

  useEffect(() => {
    setLoading(true)
    fetch("/api/zebricky")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const aktivniKat = KATEGORIE.find(k => k.slug === aktivni)
  const kat = data?.[aktivni]
  const vsichni = kat?.hraci ?? []

  const teItf = vsichni.filter((h: any) => h.te_itf).sort((a: any, b: any) => {
    const pa = TYP_PRIORITY[a.te_itf_typ] ?? 9
    const pb = TYP_PRIORITY[b.te_itf_typ] ?? 9
    if (pa !== pb) return pa - pb
    return (a.te_itf_poradi ?? 999) - (b.te_itf_poradi ?? 999)
  })

  const cestiSerazeni = vsichni
    .filter((h: any) => !h.te_itf)
    .sort((a: any, b: any) => {
      if (disciplina === "dv") return b.body_dv - a.body_dv
      if (disciplina === "ct") return b.body_ct - a.body_ct
      return b.body_celkem - a.body_celkem
    })
    .map((h: any, i: number) => ({ ...h, poradi_disc: i + 1 }))

  const cesteFiltr = cestiSerazeni.filter((h: any) => {
    const matchHledej = h.jmeno.toLowerCase().includes(hledej.toLowerCase()) ||
      h.klub.toLowerCase().includes(hledej.toLowerCase())
    const matchRocnik = rocnik === "vse" || String(h.narozeni) === rocnik
    return matchHledej && matchRocnik
  })

  const hraci = hledej || rocnik !== "vse" ? cesteFiltr : [...teItf, ...cesteFiltr]

  const formatDatum = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
  }

  const badgeStyle = (typ: string) => {
    if (typ === "ATP" || typ === "WTA") return { background: "#7C3AED22", color: "#7C3AED", border: "1px solid #7C3AED44" }
    if (typ === "ITF") return { background: "#2563EB22", color: "#2563EB", border: "1px solid #2563EB44" }
    return { background: "#00B14F22", color: "#00B14F", border: "1px solid #00B14F44" }
  }

  const bodySloupec = (h: any) => {
    if (h.te_itf) return "****"
    if (disciplina === "dv") return h.body_dv
    if (disciplina === "ct") return h.body_ct
    return h.body_celkem
  }

  const topBody = disciplina === "dv" ? (cesteFiltr[0]?.body_dv ?? 0)
    : disciplina === "ct" ? (cesteFiltr[0]?.body_ct ?? 0)
    : (cesteFiltr[0]?.body_celkem ?? 0)

  const prumer = Math.round(
    cesteFiltr.reduce((s: number, h: any) => s + (disciplina === "dv" ? h.body_dv : disciplina === "ct" ? h.body_ct : h.body_celkem), 0)
    / (cesteFiltr.length || 1)
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
              <path d="M14 14 C36 26, 36 34, 14 46" stroke="white" strokeWidth="2.5" fill="none"/>
              <path d="M46 14 C24 26, 24 34, 46 46" stroke="white" strokeWidth="2.5" fill="none"/>
            </svg>
            <div>
              <span className="text-base font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Tenis<span style={{ color: '#00B14F' }}>CZ</span>
              </span>
              <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-3)' }}>Živé žebříčky mládeže</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
              Hráči
            </span>
            <Link href="/kluby" className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ color: 'var(--text-2)' }}>
              Kluby
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {kat && (
              <span className="text-[10px] hidden md:block" style={{ color: 'var(--text-3)' }}>
                {formatDatum(kat.aktualizace)}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* Kategorie tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {KATEGORIE.map(k => (
            <button key={k.slug}
              onClick={() => { setAktivni(k.slug); setHledej(""); setRocnik("vse") }}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              style={aktivni === k.slug
                ? { background: '#00B14F', color: '#fff' }
                : { background: 'var(--bg-card)', color: 'var(--text-2)', border: '1px solid var(--border)' }
              }>
              {k.nazev}
            </button>
          ))}
        </div>

        {/* Filtry */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-0 sm:w-56 sm:flex-none">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Hledat hráče nebo klub..."
              value={hledej} onChange={e => setHledej(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          {aktivniKat && aktivniKat.rocniky.length > 0 && (
            <select value={rocnik} onChange={e => setRocnik(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="vse">Všechny ročníky</option>
              {aktivniKat.rocniky.map(r => <option key={r} value={String(r)}>{r}</option>)}
            </select>
          )}

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
            <p className="text-sm">Načítám žebříček...</p>
          </div>
        ) : !kat ? (
          <div className="text-center py-32 text-sm" style={{ color: 'var(--text-3)' }}>Data nejsou k dispozici</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Hráčů", value: vsichni.length },
                { label: "Top body", value: topBody },
                { label: "Průměr", value: prumer },
                { label: "Mez. žeb.", value: teItf.length },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-black mono" style={{ color: '#00B14F' }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabulka */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {/* Záhlaví desktop */}
              <div className="hidden sm:grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: "3rem 1fr 6rem 4rem 14rem 4rem 4rem 5rem 4rem", background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <span>#</span><span>Hráč</span><span className="text-center">Mez.</span>
                <span className="text-center">Nar.</span><span>Klub</span>
                <span className="text-right">2H</span><span className="text-right">4H</span>
                <span className="text-right">Body</span><span className="text-right">BH</span>
              </div>
              {/* Záhlaví mobil */}
              <div className="grid sm:hidden px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: "2.5rem 1fr auto", background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <span>#</span><span>Hráč</span><span className="text-right">Body</span>
              </div>

              {hraci.map((h: any, i: number) => {
                const jeTeItf = h.te_itf
                const poradi = jeTeItf ? (teItf.indexOf(h) + 1) : (h.poradi_disc ?? i - teItf.length + 1)
                const isTop1 = !jeTeItf && poradi === 1
                const isTop2 = !jeTeItf && poradi === 2
                const isTop3 = !jeTeItf && poradi === 3
                const poradiColor = isTop1 ? '#00B14F' : isTop2 ? '#A7B1B5' : isTop3 ? '#F5A623' : 'var(--text-3)'

                return (
                  <div key={h.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)', background: jeTeItf ? 'var(--brand-dim)' : 'var(--bg-card)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = jeTeItf ? 'var(--brand-dim)' : 'var(--bg-card)')}>

                    {/* Desktop */}
                    <div className="hidden sm:grid gap-3 px-4 py-2.5 items-center"
                      style={{ gridTemplateColumns: "3rem 1fr 6rem 4rem 14rem 4rem 4rem 5rem 4rem" }}>
                      <span className="text-sm font-black mono" style={{ color: poradiColor }}>{i + 1}</span>
                      <div className="min-w-0">
                        <a href={`https://cztenis.cz/hrac/${h.id}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm truncate block hover:underline"
                          style={{ color: 'var(--text)' }}>
                          {h.jmeno}
                        </a>
                      </div>
                      <div className="flex justify-center">
                        {jeTeItf ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={badgeStyle(h.te_itf_typ)}>
                            {h.te_itf_typ} {h.te_itf_poradi}
                          </span>
                        ) : h.ma_mezinarodni ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#2563EB22', color: '#2563EB', border: '1px solid #2563EB44' }}>INT</span>
                        ) : <span style={{ color: 'var(--border)' }}>—</span>}
                      </div>
                      <span className="text-xs text-center mono" style={{ color: 'var(--text-3)' }}>{h.narozeni}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{h.klub}</span>
                      <span className="text-sm text-right mono" style={{ color: 'var(--text-2)' }}>{jeTeItf ? "—" : h.body_dv}</span>
                      <span className="text-sm text-right mono" style={{ color: 'var(--text-2)' }}>{jeTeItf ? "—" : h.body_ct}</span>
                      <span className="text-sm font-black text-right mono" style={{ color: isTop1 ? '#00B14F' : jeTeItf ? 'var(--text-3)' : 'var(--text)' }}>
                        {bodySloupec(h)}
                      </span>
                      <span className="text-sm text-right mono" style={{ color: 'var(--text-3)' }}>
                        {jeTeItf ? "—" : (h.bh ?? 0)}
                      </span>
                    </div>

                    {/* Mobil */}
                    <div className="grid sm:hidden gap-2 px-3 py-3 items-center"
                      style={{ gridTemplateColumns: "2.5rem 1fr auto" }}>
                      <span className="text-sm font-black mono" style={{ color: poradiColor }}>{i + 1}</span>
                      <div className="min-w-0">
                        <a href={`https://cztenis.cz/hrac/${h.id}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm truncate block" style={{ color: 'var(--text)' }}>
                          {h.jmeno}
                        </a>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>{h.narozeni}</span>
                          <span style={{ color: 'var(--border)' }}>·</span>
                          <span className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{h.klub}</span>
                          {jeTeItf && (
                            <span className="text-[9px] font-black px-1 py-0.5 rounded" style={badgeStyle(h.te_itf_typ)}>
                              {h.te_itf_typ} {h.te_itf_poradi}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>2H: {jeTeItf ? "—" : h.body_dv}</span>
                          <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>4H: {jeTeItf ? "—" : h.body_ct}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black mono block" style={{ color: isTop1 ? '#00B14F' : jeTeItf ? 'var(--text-3)' : 'var(--text)' }}>
                          {bodySloupec(h)}
                        </span>
                        {!jeTeItf && <span className="text-[10px] mono" style={{ color: 'var(--text-3)' }}>BH {h.bh ?? 0}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}

              {hraci.length === 0 && (
                <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>Žádní hráči nenalezeni</div>
              )}
            </div>

            <p className="text-[10px] mt-4 text-center" style={{ color: 'var(--text-3)' }}>
              * Body z českých turnajů · INT = mezinárodní turnaje zadány
            </p>
          </>
        )}
      </main>
    </div>
  )
}
