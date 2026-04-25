"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

const TYPY = ["TE", "ITF", "ATP", "WTA"]

const KATEGORIE_NAZVY: Record<string, string> = {
  "mladsi-zaci": "Ml. žáci",
  "mladsi-zakyne": "Ml. žákyně",
  "starsi-zaci": "St. žáci",
  "starsi-zakyne": "St. žákyně",
  "dorostenci": "Dorostenci",
  "dorostenky": "Dorostenky",
  "muzi": "Muži",
  "zeny": "Ženy",
}

export default function AdminPage() {
  const [heslo, setHeslo]         = useState("")
  const [authed, setAuthed]       = useState(false)
  const [chyba, setChyba]         = useState(false)
  const [hledej, setHledej]       = useState("")
  const [vysledky, setVysledky]   = useState<any[]>([])
  const [hledaLoading, setHledaLoading] = useState(false)
  const [ulozeni, setUlozeni]     = useState<any[]>([])
  const [editId, setEditId]       = useState<number|null>(null)
  const [editTyp, setEditTyp]     = useState("")
  const [editPoradi, setEditPoradi] = useState("")
  const [saving, setSaving]       = useState(false)

  const headers = { "x-admin-password": heslo, "Content-Type": "application/json" }

  const login = async () => {
    const r = await fetch("/api/admin", { headers: { "x-admin-password": heslo } })
    if (r.ok) { setAuthed(true); setChyba(false); nactiUlozene() }
    else setChyba(true)
  }

  const nactiUlozene = async () => {
    const r = await fetch("/api/admin/itf-list", { headers: { "x-admin-password": heslo } })
    if (r.ok) setUlozeni(await r.json())
  }

  // Vyhledávání hráčů s debounce
  useEffect(() => {
    if (!authed || hledej.length < 2) { setVysledky([]); return }
    const t = setTimeout(async () => {
      setHledaLoading(true)
      const r = await fetch(`/api/admin/search?q=${encodeURIComponent(hledej)}`, { headers: { "x-admin-password": heslo } })
      if (r.ok) setVysledky(await r.json())
      setHledaLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [hledej, authed])

  const pridejHrace = async (hrac: any) => {
    setSaving(true)
    await fetch("/api/admin/itf", {
      method: "POST", headers,
      body: JSON.stringify({
        hrac_id: hrac.id, jmeno: hrac.jmeno,
        kategorie_slug: hrac.kategorie_slug,
        te_itf: true, te_itf_typ: editTyp,
        te_itf_poradi: parseInt(editPoradi),
        use_new_table: true,
      })
    })
    setHledej(""); setVysledky([]); setEditTyp(""); setEditPoradi("")
    await nactiUlozene()
    setSaving(false)
  }

  const ulozZmenu = async (zaznam: any) => {
    setSaving(true)
    await fetch("/api/admin/itf", {
      method: "POST", headers,
      body: JSON.stringify({
        hrac_id: zaznam.hrac_id, jmeno: zaznam.jmeno,
        kategorie_slug: zaznam.kategorie_slug,
        te_itf: true, te_itf_typ: editTyp || zaznam.typ,
        te_itf_poradi: editPoradi ? parseInt(editPoradi) : zaznam.poradi,
        use_new_table: true,
      })
    })
    setEditId(null); setEditTyp(""); setEditPoradi("")
    await nactiUlozene()
    setSaving(false)
  }

  const deaktivuj = async (zaznam: any) => {
    setSaving(true)
    await fetch("/api/admin/itf", {
      method: "POST", headers,
      body: JSON.stringify({
        hrac_id: zaznam.hrac_id, jmeno: zaznam.jmeno,
        kategorie_slug: zaznam.kategorie_slug,
        te_itf: false, te_itf_typ: null, te_itf_poradi: null,
        use_new_table: true,
      })
    })
    await nactiUlozene()
    setSaving(false)
  }

  const badgeStyle = (typ: string) => {
    if (typ === "ATP" || typ === "WTA") return { background:"#7C3AED18", color:"#9F7AEA", border:"1px solid #7C3AED30" }
    if (typ === "ITF") return { background:"#2563EB18", color:"#60A5FA", border:"1px solid #2563EB30" }
    return { background:"#FF3B3B18", color:"#FF3B3B", border:"1px solid #FF3B3B30" }
  }

  // Login
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
        <input type="password" placeholder="Heslo" value={heslo}
          onChange={e => setHeslo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none mb-3"
          style={{background:"var(--bg)",border:`1px solid ${chyba?"#FF3B3B":"var(--border)"}`,color:"var(--text)"}} />
        {chyba && <p className="text-xs mb-3" style={{color:"#FF3B3B"}}>Špatné heslo</p>}
        <button onClick={login} className="w-full py-3 rounded-xl font-bold text-sm hover:opacity-90"
          style={{background:"#FF3B3B",color:"#fff"}}>
          Přihlásit se
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:"var(--bg)"}}>
      <header className="sticky top-0 z-50" style={{background:"var(--header-bg)",borderBottom:"1px solid var(--header-border)"}}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 60 60" className="w-8 h-8">
              <circle cx="30" cy="30" r="28" fill="#FF3B3B"/>
              <path d="M13 13 C37 25,37 35,13 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M47 13 C23 25,23 35,47 47" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            </svg>
            <span className="text-white font-black">Tenis<span style={{color:"#FF3B3B"}}>CZ</span></span>
            <span className="text-xs ml-1" style={{color:"#6E7681"}}>Admin · Mezinárodní žebříčky</span>
          </div>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg" style={{color:"#8B949E",border:"1px solid var(--header-border)"}}>
            ← Žebříček
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Vyhledávání */}
        <div className="rounded-xl p-4" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
          <h2 className="text-sm font-bold mb-3" style={{color:"var(--text)"}}>Přidat hráče na mezinárodní žebříček</h2>
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:"var(--text-3)"}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Hledat hráče podle jména..."
              value={hledej} onChange={e => setHledej(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm focus:outline-none"
              style={{background:"var(--bg)",border:"1px solid var(--border)",color:"var(--text)"}} />
            {hledaLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin" style={{borderColor:"var(--border)",borderTopColor:"#FF3B3B"}}/>}
          </div>

          {/* Výsledky vyhledávání */}
          {vysledky.length > 0 && (
            <div className="rounded-lg overflow-hidden mb-3" style={{border:"1px solid var(--border)"}}>
              {vysledky.map((h, i) => (
                <div key={`${h.id}-${h.kategorie_slug}`}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{borderBottom: i < vysledky.length-1 ? "1px solid var(--border)" : "none", background:"var(--bg)"}}>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold" style={{color:"var(--text)"}}>{h.jmeno}</span>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px]" style={{color:"var(--text-3)"}}>{KATEGORIE_NAZVY[h.kategorie_slug] || h.kategorie_slug}</span>
                      <span style={{color:"var(--border)"}}>·</span>
                      <span className="text-[10px]" style={{color:"var(--text-3)"}}>{h.klub}</span>
                    </div>
                  </div>
                  <select value={editTyp} onChange={e => setEditTyp(e.target.value)}
                    className="px-2 py-1 rounded text-xs focus:outline-none"
                    style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}}>
                    <option value="">Typ</option>
                    {TYPY.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" placeholder="Pořadí"
                    value={editPoradi} onChange={e => setEditPoradi(e.target.value)}
                    className="w-20 px-2 py-1 rounded text-xs focus:outline-none"
                    style={{background:"var(--bg-card)",border:"1px solid var(--border)",color:"var(--text)"}} />
                  <button onClick={() => pridejHrace(h)}
                    disabled={!editTyp || !editPoradi || saving}
                    className="px-3 py-1 rounded text-xs font-bold disabled:opacity-40"
                    style={{background:"#FF3B3B",color:"#fff"}}>
                    Přidat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uložení hráči */}
        <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
          <div className="px-4 py-3" style={{background:"var(--bg-card)",borderBottom:"1px solid var(--border)"}}>
            <h2 className="text-sm font-bold" style={{color:"var(--text)"}}>
              Uložení hráči na mezinárodním žebříčku
              <span className="ml-2 text-xs font-normal" style={{color:"var(--text-3)"}}>{ulozeni.filter(u => u.aktivni).length} aktivních</span>
            </h2>
          </div>

          {ulozeni.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{color:"var(--text-3)",background:"var(--bg-card)"}}>
              Žádní hráči zatím nejsou přidáni
            </div>
          ) : (
            ulozeni.map((u, i) => (
              <div key={u.id}>
                <div className="flex items-center gap-3 px-4 py-2.5"
                  style={{borderBottom:"1px solid var(--border)",background: u.aktivni ? "var(--bg-card)" : "var(--bg)",opacity: u.aktivni ? 1 : 0.5}}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{color:"var(--text)"}}>{u.jmeno}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={badgeStyle(u.typ)}>
                        {u.typ} {u.poradi}
                      </span>
                      {!u.aktivni && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{background:"var(--bg-hover)",color:"var(--text-3)"}}>neaktivní</span>}
                    </div>
                    <span className="text-[10px]" style={{color:"var(--text-3)"}}>{KATEGORIE_NAZVY[u.kategorie_slug] || u.kategorie_slug}</span>
                  </div>

                  {editId === u.id ? (
                    <div className="flex gap-2 items-center">
                      <select value={editTyp || u.typ} onChange={e => setEditTyp(e.target.value)}
                        className="px-2 py-1 rounded text-xs focus:outline-none"
                        style={{background:"var(--bg)",border:"1px solid var(--border)",color:"var(--text)"}}>
                        {TYPY.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="number" value={editPoradi || u.poradi} onChange={e => setEditPoradi(e.target.value)}
                        className="w-20 px-2 py-1 rounded text-xs focus:outline-none"
                        style={{background:"var(--bg)",border:"1px solid var(--border)",color:"var(--text)"}} />
                      <button onClick={() => ulozZmenu(u)} disabled={saving}
                        className="px-3 py-1 rounded text-xs font-bold disabled:opacity-40"
                        style={{background:"#FF3B3B",color:"#fff"}}>
                        Uložit
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="px-2 py-1 rounded text-xs"
                        style={{color:"var(--text-3)"}}>
                        Zrušit
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditId(u.id); setEditTyp(u.typ); setEditPoradi(String(u.poradi)) }}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{background:"var(--bg-hover)",color:"var(--text-2)",border:"1px solid var(--border)"}}>
                        Upravit
                      </button>
                      {u.aktivni && (
                        <button onClick={() => deaktivuj(u)} disabled={saving}
                          className="px-3 py-1 rounded text-xs font-semibold disabled:opacity-40"
                          style={{background:"#FF3B3B18",color:"#FF3B3B",border:"1px solid #FF3B3B30"}}>
                          Odebrat
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
