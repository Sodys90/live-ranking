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

const TOP_N = 8

function top8(akce: number[]) {
  return [...akce].sort((a, b) => b - a).slice(0, TOP_N)
}

export default function AdminPage() {
  const [heslo, setHeslo] = useState("")
  const [authed, setAuthed] = useState(false)
  const [chybaHesla, setChybaHesla] = useState(false)
  const [aktivniKat, setAktivniKat] = useState("mladsi-zaci")
  const [hraci, setHraci] = useState<any[]>([])
  const [hledejHrace, setHledejHrace] = useState("")
  const [vybranýHrac, setVybranyHrac] = useState<any>(null)
  const [turnaje, setTurnaje] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Formulář - rychlé zadání
  const [typTurnaje, setTypTurnaje] = useState("")
  const [umisteniDv, setUmisteniDv] = useState("")
  const [umisteniCt, setUmisteniCt] = useState("")
  const [nazevTurnaje, setNazevTurnaje] = useState("")
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0])

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

  const nactiTurnaje = async (hrac: any) => {
    setVybranyHrac(hrac)
    const r = await fetch(`/api/admin?hrac_id=${hrac.id}`, { headers })
    setTurnaje(await r.json())
  }

  const vybranyTyp = TYPY_TURNAJU.find(t => t.typ === typTurnaje && t.vk.includes(aktivniKat))
  const katTurnaje = vybranyTyp?.kategorie ?? 0
  const bodyDv = katTurnaje && umisteniDv ? getBody(katTurnaje, umisteniDv) : 0
  const bodyCt = katTurnaje && umisteniCt ? getBodyCtyrhra(katTurnaje, umisteniCt) : 0

  const ulozTurnaj = async () => {
    if (!vybranýHrac || !typTurnaje || !umisteniDv) return
    setSaving(true)
    const nazev = nazevTurnaje || typTurnaje
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
    const r = await fetch(`/api/admin?hrac_id=${vybranýHrac.id}`, { headers })
    setTurnaje(await r.json())
    setTypTurnaje(""); setUmisteniDv(""); setUmisteniCt(""); setNazevTurnaje("")
    setSaving(false)
  }

  const smazTurnaj = async (id: string) => {
    if (!confirm("Smazat?")) return
    await fetch(`/api/admin?id=${id}`, { method: "DELETE", headers })
    const r = await fetch(`/api/admin?hrac_id=${vybranýHrac.id}`, { headers })
    setTurnaje(await r.json())
  }

  // Výpočet top 8 pro zobrazení
  const akce_dv_ceske = vybranýHrac?.akce_dv ?? []
  const akce_ct_ceske = vybranýHrac?.akce_ct ?? []
  const mezi_dv = turnaje.map(t => t.body_dv).filter(b => b > 0)
  const mezi_ct = turnaje.map(t => t.body_ct).filter(b => b > 0)
  const vse_dv = [...akce_dv_ceske, ...mezi_dv]
  const vse_ct = [...akce_ct_ceske, ...mezi_ct]
  const top_dv = top8(vse_dv)
  const top_ct = top8(vse_ct)
  const celkem_dv = top_dv.reduce((s, b) => s + b, 0)
  const celkem_ct = top_ct.reduce((s, b) => s + b, 0)

  const dostupneTypy = TYPY_TURNAJU.filter(t => t.vk.includes(aktivniKat))
  const hraciFiltr = hraci.filter(h =>
    !hledejHrace || h.jmeno.toLowerCase().includes(hledejHrace.toLowerCase())
  )

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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e8ff3e] flex items-center justify-center text-black font-black text-xs">A</div>
            <h1 className="text-base font-black">ADMIN — Mezinárodní turnaje</h1>
          </div>
          <a href="/" className="text-xs text-white/40 hover:text-white">← Žebříček</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Kategorie */}
        <div className="flex flex-wrap gap-2 mb-6">
          {KATEGORIE.map(k => (
            <button key={k.slug} onClick={() => { setAktivniKat(k.slug); setVybranyHrac(null); setTurnaje([]) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${aktivniKat === k.slug ? "bg-[#e8ff3e] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              {k.nazev}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seznam hráčů */}
          <div>
            <input type="text" placeholder="Hledat hráče..."
              value={hledejHrace} onChange={e => setHledejHrace(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e8ff3e]/50 mb-3" />
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden max-h-[70vh] overflow-y-auto">
              {hraciFiltr.map((h, i) => (
                <button key={h.id} onClick={() => nactiTurnaje(h)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${vybranýHrac?.id === h.id ? "bg-[#e8ff3e]/10 border-l-2 border-l-[#e8ff3e]" : ""}`}>
                  <span className="text-xs text-white/30 w-5 shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{h.jmeno}</p>
                    <p className="text-[10px] text-white/30">{h.narozeni} · {h.klub?.substring(0,25)}</p>
                  </div>
                  <span className="text-xs text-[#e8ff3e] font-bold shrink-0">{h.body_celkem}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pravý panel */}
          {vybranýHrac ? (
            <div className="lg:col-span-2 space-y-4">
              {/* Hráč header */}
              <div className="bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-lg">{vybranýHrac.jmeno}</h2>
                  <p className="text-xs text-white/40">{vybranýHrac.narozeni} · {vybranýHrac.klub}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#e8ff3e]">{celkem_dv + celkem_ct}</p>
                  <p className="text-xs text-white/40">2H: {celkem_dv} · 4H: {celkem_ct}</p>
                </div>
              </div>

              {/* Top 8 přehled */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <p className="text-xs font-bold text-white/40 uppercase mb-2">Top 8 Dvouhra</p>
                  <div className="flex flex-wrap gap-1">
                    {vse_dv.sort((a,b) => b-a).map((b, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded font-bold ${i < TOP_N ? "bg-[#e8ff3e]/20 text-[#e8ff3e]" : "bg-white/5 text-white/30 line-through"}`}>
                        {b}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-white/40 mt-2">Součet top 8: <span className="text-white font-bold">{celkem_dv}</span></p>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <p className="text-xs font-bold text-white/40 uppercase mb-2">Top 8 Čtyřhra</p>
                  <div className="flex flex-wrap gap-1">
                    {vse_ct.sort((a,b) => b-a).map((b, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded font-bold ${i < TOP_N ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-white/30 line-through"}`}>
                        {b}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-white/40 mt-2">Součet top 8: <span className="text-white font-bold">{celkem_ct}</span></p>
                </div>
              </div>

              {/* Rychlé zadání */}
              <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
                <h3 className="text-sm font-bold text-[#e8ff3e] mb-3">+ Přidat mezinárodní turnaj</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={typTurnaje} onChange={e => setTypTurnaje(e.target.value)}
                    className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50 col-span-2">
                    <option value="">-- Typ turnaje --</option>
                    {dostupneTypy.map(t => (
                      <option key={t.typ} value={t.typ}>{t.typ} (kat. {t.kategorie})</option>
                    ))}
                  </select>
                  <select value={umisteniDv} onChange={e => setUmisteniDv(e.target.value)}
                    className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50">
                    <option value="">Dvouhra --</option>
                    {UMISTENI.map(u => <option key={u} value={u}>{UMISTENI_LABELS[u]}</option>)}
                  </select>
                  <select value={umisteniCt} onChange={e => setUmisteniCt(e.target.value)}
                    className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50">
                    <option value="">Čtyřhra (vol.)</option>
                    {UMISTENI.map(u => <option key={u} value={u}>{UMISTENI_LABELS[u]}</option>)}
                  </select>
                  <input type="text" placeholder="Název (volitelné)"
                    value={nazevTurnaje} onChange={e => setNazevTurnaje(e.target.value)}
                    className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e8ff3e]/50" />
                  <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
                    className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e8ff3e]/50" />
                </div>
                {(bodyDv > 0 || bodyCt > 0) && (
                  <div className="flex gap-2 mb-2">
                    {bodyDv > 0 && <span className="text-xs bg-[#e8ff3e]/20 text-[#e8ff3e] px-2 py-1 rounded font-bold">2H: {bodyDv} b.</span>}
                    {bodyCt > 0 && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded font-bold">4H: {bodyCt} b.</span>}
                  </div>
                )}
                <button onClick={ulozTurnaj}
                  disabled={saving || !typTurnaje || !umisteniDv}
                  className="w-full bg-[#e8ff3e] text-black font-bold py-2.5 rounded-xl hover:bg-[#d4eb35] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? "Ukládám..." : "Uložit"}
                </button>
              </div>

              {/* Seznam mezinárodních turnajů */}
              {turnaje.length > 0 && (
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/10 text-xs text-white/40 font-semibold uppercase">Zadané mezinárodní turnaje</div>
                  {turnaje.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                      <div>
                        <p className="text-sm font-semibold">{t.nazev}</p>
                        <p className="text-xs text-white/40">{t.datum} · kat. {t.kategorie_turnaje}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-[#e8ff3e] font-bold">2H: {t.body_dv}</span>
                          {t.body_ct > 0 && <span className="text-xs text-blue-300 font-bold ml-2">4H: {t.body_ct}</span>}
                        </div>
                        <button onClick={() => smazTurnaj(t.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center text-white/20 text-sm">
              ← Vyber hráče
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
