"use client"
import { useState, useEffect } from "react"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Mladší žáci" },
  { slug: "mladsi-zakyne", nazev: "Mladší žákyně" },
  { slug: "starsi-zaci",   nazev: "Starší žáci" },
  { slug: "starsi-zakyne", nazev: "Starší žákyně" },
  { slug: "dorostenci",    nazev: "Dorostenci" },
  { slug: "dorostenky",    nazev: "Dorostenky" },
]

const TYPY = ["TE", "ITF", "ATP", "WTA"]

export default function AdminPage() {
  const [heslo, setHeslo] = useState("")
  const [authed, setAuthed] = useState(false)
  const [chybaHesla, setChybaHesla] = useState(false)
  const [aktivniKat, setAktivniKat] = useState("mladsi-zaci")
  const [hraci, setHraci] = useState<any[]>([])
  const [hledej, setHledej] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [editHrac, setEditHrac] = useState<any>(null)
  const [editTyp, setEditTyp] = useState("")
  const [editPoradi, setEditPoradi] = useState("")

  const headers = { "x-admin-password": heslo, "Content-Type": "application/json" }

  const login = async () => {
    const r = await fetch("/api/admin", { headers: { "x-admin-password": heslo } })
    if (r.ok) { setAuthed(true); setChybaHesla(false) }
    else setChybaHesla(true)
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
      method: "POST",
      headers,
      body: JSON.stringify({
        hrac_id: hrac.id,
        kategorie_slug: aktivniKat,
        te_itf: editTyp !== "" && editPoradi !== "",
        te_itf_typ: editTyp || null,
        te_itf_poradi: editPoradi ? parseInt(editPoradi) : null,
      })
    })
    const r = await fetch("/api/zebricky")
    const d = await r.json()
    setHraci(d[aktivniKat]?.hraci ?? [])
    setEditHrac(null)
    setEditTyp("")
    setEditPoradi("")
    setSaving(null)
  }

  const smazItf = async (hrac: any) => {
    setSaving(hrac.id)
    await fetch("/api/admin/itf", {
      method: "POST",
      headers,
      body: JSON.stringify({
        hrac_id: hrac.id,
        kategorie_slug: aktivniKat,
        te_itf: false,
        te_itf_typ: null,
        te_itf_poradi: null,
      })
    })
    const r = await fetch("/api/zebricky")
    const d = await r.json()
    setHraci(d[aktivniKat]?.hraci ?? [])
    setSaving(null)
  }

  const badgeColor = (typ: string) => {
    if (typ === "ATP" || typ === "WTA") return "bg-purple-500/20 text-purple-300"
    if (typ === "ITF") return "bg-blue-500/20 text-blue-300"
    return "bg-[#e8ff3e]/20 text-[#e8ff3e]"
  }

  if (!authed) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="bg-white/5 rounded-2xl p-8 w-full max-w-sm border border-white/10">
        <div className="w-12 h-12 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-xl mb-6">A</div>
        <h1 className="text-xl font-black text-white mb-6">Admin</h1>
        <input type="password" placeholder="Heslo" value={heslo}
          onChange={e => setHeslo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50 mb-3" />
        {chybaHesla && <p className="text-red-400 text-xs mb-3">Špatné heslo</p>}
        <button onClick={login} className="w-full bg-[#e8ff3e] text-black font-bold py-3 rounded-xl">Přihlásit</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 bg-[#0a0f1e] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-xs">A</div>
            <h1 className="text-base font-black">ADMIN — TE/ITF/ATP/WTA</h1>
          </div>
          <a href="/" className="text-xs text-white/40 hover:text-white">← Žebříček</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Kategorie */}
        <div className="flex flex-wrap gap-2 mb-4">
          {KATEGORIE.map(k => (
            <button key={k.slug} onClick={() => { setAktivniKat(k.slug); setHledej(""); setEditHrac(null) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${aktivniKat === k.slug ? "bg-[#e8ff3e] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              {k.nazev}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Hledat hráče..."
          value={hledej} onChange={e => setHledej(e.target.value)}
          className="w-full sm:w-80 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50 mb-4" />

        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase"
            style={{ gridTemplateColumns: "1fr 5rem 8rem 8rem" }}>
            <span>Hráč</span>
            <span className="text-center">Nar.</span>
            <span className="text-center">Žeb. typ</span>
            <span className="text-center">Akce</span>
          </div>

          {hraciFiltr.map((h) => (
            <div key={`${h.id}-${aktivniKat}`}>
              <div className={`grid gap-3 px-4 py-2.5 border-b border-white/5 items-center ${h.te_itf ? "bg-[#e8ff3e]/[0.03]" : ""}`}
                style={{ gridTemplateColumns: "1fr 5rem 8rem 8rem" }}>
                <div>
                  <p className="text-sm font-semibold">{h.jmeno}</p>
                  <p className="text-xs text-white/30">{h.klub?.substring(0, 30)}</p>
                </div>
                <span className="text-xs text-white/50 text-center">{h.narozeni}</span>
                <div className="flex justify-center">
                  {h.te_itf && h.te_itf_typ ? (
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${badgeColor(h.te_itf_typ)}`}>
                      {h.te_itf_typ} {h.te_itf_poradi}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => { setEditHrac(h); setEditTyp(h.te_itf_typ || ""); setEditPoradi(h.te_itf_poradi?.toString() || "") }}
                    className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
                    Upravit
                  </button>
                  {h.te_itf && (
                    <button onClick={() => smazItf(h)}
                      disabled={saving === h.id}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors disabled:opacity-40">
                      {saving === h.id ? "..." : "Smazat"}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit */}
              {editHrac?.id === h.id && (
                <div className="px-4 py-3 bg-[#e8ff3e]/5 border-b border-white/5">
                  <p className="text-xs font-bold text-[#e8ff3e] mb-2">{h.jmeno}</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <select value={editTyp} onChange={e => setEditTyp(e.target.value)}
                      className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#e8ff3e]/50">
                      <option value="">-- Typ --</option>
                      {TYPY.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="number" placeholder="Pořadí (např. 33)"
                      value={editPoradi} onChange={e => setEditPoradi(e.target.value)}
                      className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:border-[#e8ff3e]/50" />
                    <button onClick={() => ulozItf(h)}
                      disabled={!editTyp || !editPoradi || saving === h.id}
                      className="bg-[#e8ff3e] text-black font-bold px-4 py-1.5 rounded-lg text-sm disabled:opacity-40">
                      {saving === h.id ? "Ukládám..." : "Uložit"}
                    </button>
                    <button onClick={() => setEditHrac(null)}
                      className="text-white/40 hover:text-white text-sm px-2 py-1.5">
                      Zrušit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
