"use client"
import { useState, useEffect } from "react"
import { TYPY_TURNAJU, UMISTENI, UMISTENI_LABELS, getBody, getBodyCtyrhra } from "@/lib/body"

const KATEGORIE = [
  { slug: "mladsi-zaci",   nazev: "Mladší žáci" },
  { slug: "mladsi-zakyne", nazev: "Mladší žákyně" },
  { slug: "starsi-zaci",   nazev: "Starší žáci" },
  { slug: "starsi-zakyne", nazev: "Starší žákyně" },
  { slug: "dorostenci",    nazev: "Dorostenci" },
  { slug: "dorostenky",    nazev: "Dorostenky" },
]

export default function AdminPage() {
  const [heslo, setHeslo] = useState("")
  const [authed, setAuthed] = useState(false)
  const [chybaHesla, setChybaHesla] = useState(false)
  const [aktivniKat, setAktivniKat] = useState("mladsi-zaci")
  const [hraci, setHraci] = useState([])
  const [vybranýHrac, setVybranyHrac] = useState(null)
  const [turnaje, setTurnaje] = useState([])
  const [loading, setLoading] = useState(false)

  // Formulář
  const [datum, setDatum] = useState("")
  const [nazev, setNazev] = useState("")
  const [typTurnaje, setTypTurnaje] = useState("")
  const [umisteniDv, setUmisteniDv] = useState("")
  const [umisteniCt, setUmisteniCt] = useState("")
  const [saving, setSaving] = useState(false)

  const headers = { "x-admin-password": heslo, "Content-Type": "application/json" }

  const login = async () => {
    const r = await fetch("/api/admin", { headers: { "x-admin-password": heslo } })
    if (r.ok) { setAuthed(true); setChybaHesla(false) }
    else setChybaHesla(true)
  }

  useEffect(() => {
    if (!authed) return
    fetch("/data/zebricky.json")
      .then(r => r.json())
      .then(d => setHraci(d[aktivniKat]?.hraci ?? []))
  }, [authed, aktivniKat])

  const nactiTurnaje = async (hrac: any) => {
    setVybranyHrac(hrac)
    const r = await fetch(`/api/admin?hrac_id=${hrac.id}`, { headers })
    const d = await r.json()
    setTurnaje(d)
  }

  // Vypočítej kategorii turnaje podle typu
  const vybranyTyp = TYPY_TURNAJU.find(t => t.typ === typTurnaje && t.vk.includes(aktivniKat))
  const katTurnaje = vybranyTyp?.kategorie ?? 0

  // Body podle umístění
  const bodyDv = katTurnaje && umisteniDv ? getBody(katTurnaje, umisteniDv) : 0
  const bodyCt = katTurnaje && umisteniCt ? getBodyCtyrhra(katTurnaje, umisteniCt) : 0

  const ulozTurnaj = async () => {
    if (!vybranýHrac || !datum || !nazev || !typTurnaje || !umisteniDv) return
    setSaving(true)
    await fetch("/api/admin", {
      method: "POST",
      headers,
      body: JSON.stringify({
        hrac_id: vybranýHrac.id,
        hrac_jmeno: vybranýHrac.jmeno,
        kategorie_slug: aktivniKat,
        datum,
        nazev,
        typ: typTurnaje,
        kategorie_turnaje: katTurnaje,
        umisteni_dv: umisteniDv,
        body_dv: bodyDv,
        umisteni_ct: umisteniCt || null,
        body_ct: bodyCt,
      })
    })
    await nactiTurnaje(vybranýHrac)
    setDatum(""); setNazev(""); setTypTurnaje(""); setUmisteniDv(""); setUmisteniCt("")
    setSaving(false)
  }

  const smazTurnaj = async (id) => {
    if (!confirm("Smazat turnaj?")) return
    await fetch(`/api/admin?id=${id}`, { method: "DELETE", headers })
    await nactiTurnaje(vybranýHrac)
  }

  // Typy pro aktuální kategorii
  const dostupneTypy = TYPY_TURNAJU.filter(t => t.vk.includes(aktivniKat))

  if (!authed) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="bg-white/5 rounded-2xl p-8 w-full max-w-sm border border-white/10">
        <div className="w-12 h-12 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-xl mb-6">A</div>
        <h1 className="text-xl font-black text-white mb-6">Admin přihlášení</h1>
        <input
          type="password"
          placeholder="Heslo"
          value={heslo}
          onChange={e => setHeslo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50 mb-3"
        />
        {chybaHesla && <p className="text-red-400 text-xs mb-3">Špatné heslo</p>}
        <button onClick={login} className="w-full bg-[#e8ff3e] text-black font-bold py-3 rounded-xl hover:bg-[#d4eb35] transition-colors">
          Přihlásit se
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 bg-[#0a0f1e] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black">A</div>
            <div>
              <h1 className="text-lg font-black">ADMIN</h1>
              <p className="text-xs text-white/40">Mezinárodní turnaje</p>
            </div>
          </div>
          <a href="/" className="text-xs text-white/40 hover:text-white transition-colors">← Zpět na žebříček</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Kategorie */}
        <div className="flex flex-wrap gap-2 mb-8">
          {KATEGORIE.map(k => (
            <button key={k.slug} onClick={() => { setAktivniKat(k.slug); setVybranyHrac(null); setTurnaje([]) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${aktivniKat === k.slug ? "bg-[#e8ff3e] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              {k.nazev}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Levý panel - seznam hráčů */}
          <div>
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Vyber hráče</h2>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden max-h-[600px] overflow-y-auto">
              {hraci.map((h, i) => (
                <button key={h.id} onClick={() => nactiTurnaje(h)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${vybranýHrac?.id === h.id ? "bg-[#e8ff3e]/10 border-l-2 border-l-[#e8ff3e]" : ""}`}>
                  <span className="text-xs text-white/30 w-6">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{h.jmeno}</p>
                    <p className="text-xs text-white/30 truncate">{h.klub}</p>
                  </div>
                  <span className="text-xs text-[#e8ff3e] font-bold">{h.body_celkem}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pravý panel - turnaje hráče */}
          <div>
            {vybranýHrac ? (
              <>
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">
                  {vybranýHrac.jmeno} — mezinárodní turnaje
                </h2>

                {/* Formulář */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-4">
                  <h3 className="text-sm font-bold mb-4 text-[#e8ff3e]">Přidat turnaj</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Datum</label>
                      <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Název turnaje</label>
                      <input type="text" placeholder="např. TEJT Praha" value={nazev} onChange={e => setNazev(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e8ff3e]/50" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-xs text-white/40 mb-1 block">Typ turnaje</label>
                    <select value={typTurnaje} onChange={e => setTypTurnaje(e.target.value)}
                      className="w-full bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50">
                      <option value="">-- Vyber typ --</option>
                      {dostupneTypy.map(t => (
                        <option key={t.typ} value={t.typ}>{t.typ} (kat. {t.kategorie})</option>
                      ))}
                    </select>
                  </div>

                  {katTurnaje > 0 && (
                    <div className="bg-[#e8ff3e]/10 rounded-lg px-3 py-2 text-xs text-[#e8ff3e] mb-3">
                      Kategorie turnaje: <strong>{katTurnaje}</strong>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Umístění dvouhra</label>
                      <select value={umisteniDv} onChange={e => setUmisteniDv(e.target.value)}
                        className="w-full bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50">
                        <option value="">-- Vyber --</option>
                        {UMISTENI.map(u => (
                          <option key={u} value={u}>{UMISTENI_LABELS[u]}</option>
                        ))}
                      </select>
                      {bodyDv > 0 && <p className="text-xs text-[#e8ff3e] mt-1">→ {bodyDv} bodů</p>}
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Umístění čtyřhra (volitelné)</label>
                      <select value={umisteniCt} onChange={e => setUmisteniCt(e.target.value)}
                        className="w-full bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50">
                        <option value="">-- Nevyplňovat --</option>
                        {UMISTENI.map(u => (
                          <option key={u} value={u}>{UMISTENI_LABELS[u]}</option>
                        ))}
                      </select>
                      {bodyCt > 0 && <p className="text-xs text-[#e8ff3e] mt-1">→ {bodyCt} bodů</p>}
                    </div>
                  </div>

                  <button onClick={ulozTurnaj} disabled={saving || !datum || !nazev || !typTurnaje || !umisteniDv}
                    className="w-full bg-[#e8ff3e] text-black font-bold py-2.5 rounded-xl hover:bg-[#d4eb35] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {saving ? "Ukládám..." : "Uložit turnaj"}
                  </button>
                </div>

                {/* Seznam turnajů */}
                <div className="space-y-2">
                  {turnaje.length === 0 ? (
                    <p className="text-sm text-white/30 text-center py-4">Žádné mezinárodní turnaje</p>
                  ) : turnaje.map(t => (
                    <div key={t.id} className="bg-white/5 rounded-xl border border-white/10 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t.nazev}</p>
                        <p className="text-xs text-white/40">{t.datum} · {t.typ} · kat. {t.kategorie_turnaje}</p>
                        <p className="text-xs text-[#e8ff3e]">
                          Dvouhra: {t.umisteni_dv} ({t.body_dv} b.)
                          {t.umisteni_ct && ` · Čtyřhra: ${t.umisteni_ct} (${t.body_ct} b.)`}
                        </p>
                      </div>
                      <button onClick={() => smazTurnaj(t.id)} className="text-red-400 hover:text-red-300 text-xs ml-4 transition-colors">
                        Smazat
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-white/20 text-sm">
                ← Vyber hráče ze seznamu
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
