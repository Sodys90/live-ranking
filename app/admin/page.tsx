"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Ml. žáci" },
  { slug: "mladsi-zakyne", nazev: "Ml. žákyně" },
  { slug: "starsi-zaci",   nazev: "St. žáci" },
  { slug: "starsi-zakyne", nazev: "St. žákyně" },
  { slug: "dorostenci",    nazev: "Dorostenci" },
  { slug: "dorostenky",    nazev: "Dorostenky" },
  { slug: "muzi",          nazev: "Muži" },
  { slug: "zeny",          nazev: "Ženy" },
]

const TYPY = ["TE", "ITF", "ATP", "WTA"]

export default function AdminPage() {
  const [heslo, setHeslo]         = useState("")
  const [authed, setAuthed]       = useState(false)
  const [chyba, setChyba]         = useState(false)
  const [aktivniKat, setAktivniKat] = useState("mladsi-zaci")
  const [hraci, setHraci]         = useState<any[]>([])
  const [hledej, setHledej]       = useState("")
  const [saving, setSaving]       = useState<string|null>(null)
  const [editHrac, setEditHrac]   = useState<any>(null)
  const [editTyp, setEditTyp]     = useState("")
  const [editPoradi, setEditPoradi] = useState("")

  const headers = { "x-admin-password": heslo, "Content-Type": "application/json" }

  const login = async () => {
    const r = await fetch("/api/admin", { headers: { "x-admin-password": heslo } })
    if (r.ok) { setAuthed(true); setChyba(false) }
    else setChyba(true)
  }

  useEffect(() => {
    if (!authed) return
    fetch("/api/zebricky")
      .then(r => r.json())
      .then(d => setHraci(d[aktivniKat]?.hraci ?? []))
  }, [authed, aktivniKat])

  const hraciFiltr = hraci.filter(h =>
    !hledej || h.jmeno.toLowerCase().includes(hledej.toLowerCase())
  )

  const ulozItf = async (hrac: any) => {
    setSaving(hrac.id)
    await fetch("/api/admin/itf", {
      method: "POST", headers,
      body: JSON.stringify({
        hrac_id: hrac.id, kategorie_slug: aktivniKat,
        te_itf: editTyp !== "" && editPoradi !== "",
        te_itf_typ: editTyp || null,
        te_itf_poradi: editPoradi ? parseInt(editPoradi) : null,
      })
    })
    const d = await fetch("/api/zebricky").then(r => r.json())
    setHraci(d[aktivniKat]?.hraci ?? [])
    setEditHrac(null); setEditTyp(""); setEditPoradi(""); setSaving(null)
  }

  const smazItf = async (hrac: any) => {
    setSaving(hrac.id)
    await fetch("/api/admin/itf", {
      method: "POST", headers,
      body: JSON.stringify({ hrac_id: hrac.id, kategorie_slug: aktivniKat, te_itf: false, te_itf_typ: null, te_itf_poradi: null })
    })
    const d = await fetch("/api/zebricky").then(r => r.json())
    setHraci(d[aktivniKat]?.hraci ?? [])
    setSaving(null)
  }

  const badgeStyle = (typ: string) => {
    if (typ === "ATP" || typ === "WTA") return { background:"#7C3AED18", color:"#9F7AEA", border:"1px solid #7C3AED30" }
    if (typ === "ITF") return { background:"#2563EB18", color:"#60A5FA", border:"1px solid #2563EB30" }
    return { background:"#FF3B3B18", color:"#FF3B3B", border:"1px solid #FF3B3B30" }
  }

  // Login screen
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"var(--bg)"}}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-8" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
        <div className="flex items-center gap-3 mb-8">
          <svg viewBox="0 0 60 60" className="w-10 h-10">
            <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
            <path d="M13 13 C37 25,37 35,13 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M47 13 C23 25,23 35,47 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </svg>
          <div>
            <span className="font-black text-lg" style={{color:"var(--text)"}}>Tenis<span style={{color:"#FF3B3B"}}>CZ</span></span>
            <p className="text-[11px]" style={{color:"var(--text-3)"}}>Admin panel</p>
          </div>
        </div>
        <div className="space-y-3">
          <input type="password" placeholder="Heslo" value={heslo}
            onChange={e => setHeslo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{background:"var(--bg)",border:`1px solid ${chyba?"#FF3B3B":"var(--border)"}`,color:"var(--text)"}} />
          {chyba && <p className="text-xs" style={{color:"#FF3B3B"}}>Špatné heslo</p>}
          <button onClick={login}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{background:"#FF3B3B",color:"#fff"}}>
            Přihlásit se
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:"var(--bg)"}}>

      {/* Header */}
      <header className="sticky top-0 z-50" style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 60 60" className="w-8 h-8">
              <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
              <path d="M13 13 C37 25,37 35,13 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M47 13 C23 25,23 35,47 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            </svg>
            <div>
              <span className="text-white font-black text-base">Tenis<span style={{color:"#FF3B3B"}}>CZ</span></span>
              <span className="text-xs ml-2" style={{color:"#6E7681"}}>Admin · TE/ITF/ATP/WTA</span>
            </div>
          </div>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{color:"#8B949E",border:"1px solid var(--header-border)"}}
            onMouseEnter={e=>(e.currentTarget.style.color="#E6EDF3")}
            onMouseLeave={e=>(e.currentTarget.style.color="#8B949E")}>
            ← Žebříček
          </Link>
        </div>
      </header>

      {/* Kategorie tabs */}
      <div style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {KATEGORIE.map(k => (
              <button key={k.slug}
                onClick={() => { setAktivniKat(k.slug); setHledej(""); setEditHrac(null) }}
                className="px-4 py-3 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-all"
                style={aktivniKat === k.slug
                  ? {color:"#FF3B3B",borderColor:"#FF3B3B"}
                  : {color:"#6E7681",borderColor:"transparent"}}>
                {k.nazev}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4 w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:"var(--text-3)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Hledat hráče..."
            value={hledej} onChange={e => setHledej(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none"
            style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}} />
        </div>

        {/* Tabulka */}
        <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
          <div className="hidden sm:grid gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
            style={{gridTemplateColumns:"1fr 3.5rem 8rem 9rem",background:"var(--bg-card)",borderBottom:"2px solid var(--border)",color:"var(--text-3)"}}>
            <span>Hráč</span>
            <span className="text-center">Nar.</span>
            <span className="text-center">Žeb. typ</span>
            <span className="text-center">Akce</span>
          </div>

          {hraciFiltr.map((h, i) => (
            <div key={`${h.id}-${aktivniKat}`}>
              <div
                className="grid gap-3 px-4 py-2.5 items-center transition-colors"
                style={{
                  gridTemplateColumns:"1fr 3.5rem 8rem 9rem",
                  borderBottom:"1px solid var(--border)",
                  background: h.te_itf ? "var(--brand-dim)" : i%2===0 ? "var(--bg-card)" : "var(--bg-stripe)"
                }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-hover)")}
                onMouseLeave={e=>(e.currentTarget.style.background=h.te_itf?"var(--brand-dim)":i%2===0?"var(--bg-card)":"var(--bg-stripe)")}>

                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{color:"var(--text)"}}>{h.jmeno}</p>
                  <p className="text-[10px] truncate" style={{color:"var(--text-3)"}}>{h.klub}</p>
                </div>

                <span className="text-xs text-center mono" style={{color:"var(--text-3)"}}>{h.narozeni}</span>

                <div className="flex justify-center">
                  {h.te_itf && h.te_itf_typ ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded" style={badgeStyle(h.te_itf_typ)}>
                      {h.te_itf_typ} {h.te_itf_poradi}
                    </span>
                  ) : <span style={{color:"var(--border)"}}>—</span>}
                </div>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => { setEditHrac(h); setEditTyp(h.te_itf_typ||""); setEditPoradi(h.te_itf_poradi?.toString()||"") }}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                    style={{background:"var(--bg-hover)",color:"var(--text-2)",border:"1px solid var(--border)"}}>
                    Upravit
                  </button>
                  {h.te_itf && (
                    <button onClick={() => smazItf(h)} disabled={saving===h.id}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                      style={{background:"#FF3B3B18",color:"#FF3B3B",border:"1px solid #FF3B3B30"}}>
                      {saving===h.id ? "..." : "Smazat"}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit */}
              {editHrac?.id === h.id && (
                <div className="px-4 py-3" style={{background:"#FF3B3B08",borderBottom:"1px solid var(--border)",borderLeft:"3px solid #FF3B3B"}}>
                  <p className="text-xs font-bold mb-3" style={{color:"#FF3B3B"}}>{h.jmeno}</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <select value={editTyp} onChange={e => setEditTyp(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                      style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}}>
                      <option value="">-- Typ --</option>
                      {TYPY.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="number" placeholder="Pořadí (např. 33)"
                      value={editPoradi} onChange={e => setEditPoradi(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs w-36 focus:outline-none"
                      style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}} />
                    <button onClick={() => ulozItf(h)}
                      disabled={!editTyp || !editPoradi || saving===h.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
                      style={{background:"#FF3B3B",color:"#fff"}}>
                      {saving===h.id ? "Ukládám..." : "Uložit"}
                    </button>
                    <button onClick={() => setEditHrac(null)}
                      className="px-3 py-1.5 text-xs rounded-lg transition-all hover:opacity-80"
                      style={{color:"var(--text-3)"}}>
                      Zrušit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {hraciFiltr.length === 0 && (
            <div className="text-center py-16 text-sm" style={{color:"var(--text-3)"}}>Žádní hráči nenalezeni</div>
          )}
        </div>
      </main>
    </div>
  )
}
