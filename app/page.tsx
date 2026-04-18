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
  const [disciplina, setDisciplina] = useState("celkem") // celkem | dv | ct
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

  // Seřaď české hráče podle vybrané disciplíny
  const cestiSerazeni = vsichni
    .filter(h => !h.te_itf)
    .sort((a, b) => {
      if (disciplina === "dv") return b.body_dv - a.body_dv
      if (disciplina === "ct") return b.body_ct - a.body_ct
      return b.body_celkem - a.body_celkem
    })
    .map((h, i) => ({ ...h, poradi_disc: i + 1 }))

  // Filtr hledání + ročník
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

  const cols = "3rem 1fr 6rem 4rem 14rem 5rem 5rem 5rem"

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-sm">LR</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">LIVE RANKING</h1>
              <p className="text-xs text-white/40">Český tenisový svaz · mládež</p>
            </div>
          </div>
          {kat && (
            <p className="text-xs text-white/40 hidden sm:block">
              Aktualizováno: {formatDatum(kat.aktualizace)}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Kategorie */}
        <div className="flex flex-wrap gap-2 mb-4">
          {KATEGORIE.map((k) => (
            <button key={k.slug}
              onClick={() => { setAktivni(k.slug); setHledej(""); setRocnik("vse") }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                aktivni === k.slug ? "bg-[#e8ff3e] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}>
              {k.nazev}
            </button>
          ))}
        </div>

        {/* Filtry */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Hledání */}
          <input type="text" placeholder="Hledat hráče nebo klub..."
            value={hledej} onChange={(e) => setHledej(e.target.value)}
            className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50" />

          {/* Ročník */}
          <select value={rocnik} onChange={e => setRocnik(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#e8ff3e]/50">
            <option value="vse">Všechny ročníky</option>
            {(aktivniKat?.rocniky ?? []).map(r => (
              <option key={r} value={String(r)}>{r}</option>
            ))}
          </select>

          {/* Disciplína */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {[
              { val: "celkem", label: "Celkem" },
              { val: "dv",     label: "Dvouhra" },
              { val: "ct",     label: "Čtyřhra" },
            ].map(d => (
              <button key={d.val} onClick={() => setDisciplina(d.val)}
                className={`px-4 py-2 text-sm font-semibold transition-all ${
                  disciplina === d.val ? "bg-[#e8ff3e] text-black" : "text-white/60 hover:text-white hover:bg-white/5"
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Hráčů celkem", value: vsichni.length },
                { label: "Top body", value: topBody },
                { label: "Průměr bodů", value: prumer },
                { label: "Mez. žebříček", value: teItf.length },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-2xl font-black text-[#e8ff3e]">{s.value}</p>
                  <p className="text-xs text-white/40 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase tracking-wider"
                style={{ gridTemplateColumns: cols }}>
                <span>#</span>
                <span>Jméno</span>
                <span className="text-center">Mez.</span>
                <span className="text-center">Nar.</span>
                <span>Klub</span>
                <span className="text-right">Dvouhra</span>
                <span className="text-right">Čtyřhra</span>
                <span className="text-right">{disciplina === "dv" ? "Dvouhra" : disciplina === "ct" ? "Čtyřhra" : "Body"}</span>
              </div>

              {hraci.map((h, i) => {
                const jeTeItf = h.te_itf
                const poradi = jeTeItf ? (teItf.indexOf(h) + 1) : (h.poradi_disc ?? i - teItf.length + 1)
                return (
                  <div key={h.id}
                    className={`grid gap-3 px-4 py-2 border-b border-white/5 hover:bg-white/5 transition-colors items-center ${jeTeItf ? "bg-[#e8ff3e]/[0.03]" : ""}`}
                    style={{ gridTemplateColumns: cols }}>
                    <span className={`text-sm font-black ${
                      jeTeItf ? "text-white/30" :
                      poradi === 1 ? "text-[#e8ff3e]" :
                      poradi === 2 ? "text-white/60" :
                      poradi === 3 ? "text-orange-400/70" :
                      "text-white/30"
                    }`}>
                      {i + 1}
                    </span>
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
                      ) : (
                        <span className="text-white/10">—</span>
                      )}
                    </div>
                    <span className="text-xs text-white/50 text-center">{h.narozeni}</span>
                    <span className="text-xs text-white/40 truncate block">{h.klub}</span>
                    <span className="text-sm text-right text-white/60">{jeTeItf ? "—" : h.body_dv}</span>
                    <span className="text-sm text-right text-white/60">{jeTeItf ? "—" : h.body_ct}</span>
                    <span className={`text-sm font-black text-right ${!jeTeItf && poradi === 1 ? "text-[#e8ff3e]" : jeTeItf ? "text-white/30" : "text-white"}`}>
                      {bodySloupec(h)}
                    </span>
                  </div>
                )
              })}

              {hraci.length === 0 && (
                <div className="text-center py-16 text-white/30">Žádní hráči nenalezeni</div>
              )}
            </div>

            <p className="text-xs text-white/20 mt-4 text-center">
              * Body jsou vypočítány z českých turnajů. INT = zadané mezinárodní turnaje.
              ATP/WTA/ITF/TE hráči jsou předřazeni dle mezinárodního žebříčku.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
