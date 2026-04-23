"use client"
import { useState, useEffect } from "react"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Mladší žáci",   rocniky: [2014,2015,2016] },
  { slug: "mladsi-zakyne", nazev: "Mladší žákyně",  rocniky: [2014,2015,2016] },
  { slug: "starsi-zaci",   nazev: "Starší žáci",    rocniky: [2012,2013,2014,2015,2016] },
  { slug: "starsi-zakyne", nazev: "Starší žákyně",  rocniky: [2012,2013,2014,2015,2016] },
  { slug: "dorostenci",    nazev: "Dorostenci",     rocniky: [2008,2009,2010,2011,2012,2013,2014,2015,2016] },
  { slug: "dorostenky",    nazev: "Dorostenky",     rocniky: [2008,2009,2010,2011,2012,2013,2014,2015,2016] },
]

const TYP_PRIORITY = {"ATP": 0, "WTA": 0, "ITF": 1, "TE": 2}

export default function Home() {
  const [aktivni, setAktivni] = useState("mladsi-zaci")
  const [data, setData] = useState(null)
  const [hledej, setHledej] = useState("")
  const [loading, setLoading] = useState(true)
  const [disciplina, setDisciplina] = useState("celkem")
  const [rocnik, setRocnik] = useState("vse")

  useEffect(() => {
    setLoading(true)
    fetch("/api/zebricky")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const aktivniKat = KATEGORIE.find(k => k.slug === aktivni)
  const kat = data?.[aktivni]
  const vsichni = kat?.hraci ?? []

  const teItf = vsichni.filter(h => h.te_itf).sort((a, b) => {
    const pa = TYP_PRIORITY[a.te_itf_typ] ?? 9
    const pb = TYP_PRIORITY[b.te_itf_typ] ?? 9
    if (pa !== pb) return pa - pb
    return (a.te_itf_poradi ?? 999) - (b.te_itf_poradi ?? 999)
  })

  const cestiSerazeni = vsichni
    .filter(h => !h.te_itf)
    .sort((a, b) => {
      if (disciplina === "dv") return b.body_dv - a.body_dv
      if (disciplina === "ct") return b.body_ct - a.body_ct
      return b.body_celkem - a.body_celkem
    })
    .map((h, i) => ({ ...h, poradi_disc: i + 1 }))

  const cesteFiltr = cestiSerazeni.filter(h => {
    const matchHledej = h.jmeno.toLowerCase().includes(hledej.toLowerCase()) ||
      h.klub.toLowerCase().includes(hledej.toLowerCase())
    const matchRocnik = rocnik === "vse" || String(h.narozeni) === rocnik
    return matchHledej && matchRocnik
  })

  const hraci = hledej || rocnik !== "vse" ? cesteFiltr : [...teItf, ...cesteFiltr]

  const formatDatum = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
  }

  const badgeColor = (typ) => {
    if (typ === "ATP" || typ === "WTA") return "bg-purple-500/20 text-purple-300 border border-purple-500/30"
    if (typ === "ITF") return "bg-blue-500/20 text-blue-300 border border-blue-500/30"
    return "bg-[#e8ff3e]/20 text-[#e8ff3e] border border-[#e8ff3e]/30"
  }

  const bodySloupec = (h) => {
    if (h.te_itf) return "****"
    if (disciplina === "dv") return h.body_dv
    if (disciplina === "ct") return h.body_ct
    return h.body_celkem
  }

  const topBody = disciplina === "dv" ? (cesteFiltr[0]?.body_dv ?? 0)
    : disciplina === "ct" ? (cesteFiltr[0]?.body_ct ?? 0)
    : (cesteFiltr[0]?.body_celkem ?? 0)

  const prumer = Math.round(
    cesteFiltr.reduce((s, h) => s + (disciplina === "dv" ? h.body_dv : disciplina === "ct" ? h.body_ct : h.body_celkem), 0)
    / (cesteFiltr.length || 1)
  )

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-xs">LR</div>
            <div>
              <h1 className="text-base font-black tracking-tight">LIVE RANKING</h1>
              <p className="text-[10px] text-white/40">Český tenisový svaz · mládež</p>
            </div>
          </div>
          {kat && (
            <p className="text-xs text-white/40 hidden sm:block">
              Aktualizováno: {formatDatum(kat.aktualizace)}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Kategorie - scrollovatelné na mobilu */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {KATEGORIE.map((k) => (
            <button key={k.slug}
              onClick={() => { setAktivni(k.slug); setHledej(""); setRocnik("vse") }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                aktivni === k.slug ? "bg-[#e8ff3e] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}>
              {k.nazev}
            </button>
          ))}
        </div>

        {/* Filtry */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input type="text" placeholder="Hledat..."
            value={hledej} onChange={(e) => setHledej(e.target.value)}
            className="flex-1 min-w-0 sm:w-56 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50" />

          <select value={rocnik} onChange={e => setRocnik(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e8ff3e]/50">
            <option value="vse">Vše</option>
            {(aktivniKat?.rocniky ?? []).map(r => (
              <option key={r} value={String(r)}>{r}</option>
            ))}
          </select>

          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {[
              { val: "celkem", label: "Celkem" },
              { val: "dv",     label: "2H" },
              { val: "ct",     label: "4H" },
            ].map(d => (
              <button key={d.val} onClick={() => setDisciplina(d.val)}
                className={`px-3 py-2 text-xs font-semibold transition-all ${
                  disciplina === d.val ? "bg-[#e8ff3e] text-black" : "text-white/60 hover:text-white"
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-32 text-white/30">
            <p className="text-4xl mb-4">🎾</p>
            <p>Načítám žebříček...</p>
          </div>
        ) : !kat ? (
          <div className="text-center py-32 text-white/30">Data nejsou k dispozici</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Hráčů", value: vsichni.length },
                { label: "Top body", value: topBody },
                { label: "Průměr", value: prumer },
                { label: "Mez. žeb.", value: teItf.length },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xl font-black text-[#e8ff3e]">{s.value}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabulka */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              {/* Záhlaví - desktop */}
              <div className="hidden sm:grid gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase tracking-wider"
                style={{ gridTemplateColumns: "3rem 1fr 6rem 4rem 14rem 4rem 4rem 4rem 4rem" }}>
                <span>#</span>
                <span>Jméno</span>
                <span className="text-center">Mez.</span>
                <span className="text-center">Nar.</span>
                <span>Klub</span>
                <span className="text-right">2H</span>
                <span className="text-right">4H</span>
                <span className="text-right">Body</span>
                <span className="text-right">BH</span>
              </div>

              {/* Záhlaví - mobil */}
              <div className="grid sm:hidden gap-2 px-3 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase tracking-wider"
                style={{ gridTemplateColumns: "2.5rem 1fr auto" }}>
                <span>#</span>
                <span>Jméno</span>
                <span className="text-right">Body</span>
              </div>

              {hraci.map((h, i) => {
                const jeTeItf = h.te_itf
                const poradi = jeTeItf ? (teItf.indexOf(h) + 1) : (h.poradi_disc ?? i - teItf.length + 1)
                const poradiColor = jeTeItf ? "text-white/30" :
                  poradi === 1 ? "text-[#e8ff3e]" :
                  poradi === 2 ? "text-white/60" :
                  poradi === 3 ? "text-orange-400/70" : "text-white/30"

                return (
                  <div key={h.id} className={jeTeItf ? "bg-[#e8ff3e]/[0.03]" : ""}>
                    {/* Desktop řádek */}
                    <div className="hidden sm:grid gap-3 px-4 py-2 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
                      style={{ gridTemplateColumns: "3rem 1fr 6rem 4rem 14rem 4rem 4rem 4rem 4rem" }}>
                      <span className={`text-sm font-black ${poradiColor}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <a href={`https://cztenis.cz/hrac/${h.id}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm hover:text-[#e8ff3e] transition-colors truncate block">
                          {h.jmeno}
                        </a>
                      </div>
                      <div className="flex justify-center">
                        {jeTeItf ? (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap ${badgeColor(h.te_itf_typ)}`}>
                            {h.te_itf_typ} {h.te_itf_poradi}
                          </span>
                        ) : h.ma_mezinarodni ? (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold px-1.5 py-0.5 rounded">INT</span>
                        ) : <span className="text-white/10">—</span>}
                      </div>
                      <span className="text-xs text-white/50 text-center">{h.narozeni}</span>
                      <span className="text-xs text-white/40 truncate">{h.klub}</span>
                      <span className="text-sm text-right text-white/60">{jeTeItf ? "—" : h.body_dv}</span>
                      <span className="text-sm text-right text-white/60">{jeTeItf ? "—" : h.body_ct}</span>
                      <span className={`text-sm font-black text-right ${!jeTeItf && poradi === 1 ? "text-[#e8ff3e]" : jeTeItf ? "text-white/30" : "text-white"}`}>
                        {bodySloupec(h)}
                      </span>
                      <span className="text-sm text-right text-white/50">
                        {jeTeItf ? "—" : (h.bh ?? 0)}
                      </span>
                    </div>

                    {/* Mobil řádek */}
                    <div className="grid sm:hidden gap-2 px-3 py-2.5 border-b border-white/5 items-center"
                      style={{ gridTemplateColumns: "2.5rem 1fr auto" }}>
                      <span className={`text-sm font-black ${poradiColor}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <a href={`https://cztenis.cz/hrac/${h.id}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm hover:text-[#e8ff3e] transition-colors block truncate">
                          {h.jmeno}
                        </a>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-white/30">{h.narozeni}</span>
                          <span className="text-[10px] text-white/20">·</span>
                          <span className="text-[10px] text-white/30 truncate">{h.klub}</span>
                          {jeTeItf && (
                            <span className={`text-[9px] font-black px-1 py-0.5 rounded ${badgeColor(h.te_itf_typ)}`}>
                              {h.te_itf_typ} {h.te_itf_poradi}
                            </span>
                          )}
                          {h.ma_mezinarodni && !jeTeItf && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-1 py-0.5 rounded">INT</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">2H: {jeTeItf ? "—" : h.body_dv}</span>
                          <span className="text-[10px] text-white/30">4H: {jeTeItf ? "—" : h.body_ct}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black block ${!jeTeItf && poradi === 1 ? "text-[#e8ff3e]" : jeTeItf ? "text-white/30" : "text-white"}`}>
                          {bodySloupec(h)}
                        </span>
                        {!jeTeItf && (
                          <span className="text-[10px] text-white/40">BH {h.bh ?? 0}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {hraci.length === 0 && (
                <div className="text-center py-16 text-white/30">Žádní hráči nenalezeni</div>
              )}
            </div>

            <p className="text-xs text-white/20 mt-4 text-center">
              * Body z českých turnajů. INT = mezinárodní turnaje zadány.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
