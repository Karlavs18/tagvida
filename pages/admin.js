import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

// ── CONTRASEÑA SIMPLE ────────────────────────────────────────
// Cámbiala por la tuya antes de subir
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

const TABS = ['inicio', 'clientes', 'escaneos', 'suscripciones']
const TAB_LABELS = { inicio: '🏠 Inicio', clientes: '🐾 Clientes', escaneos: '📍 Escaneos', suscripciones: '💳 Suscripciones' }
const PRODUCT_COLORS = { pets: '#FF6B35', familia: '#FF4D6D', kids: '#2EC4B6', care: '#4361EE' }
const PRODUCT_LABELS = { pets: 'Pets', familia: 'Familia', kids: 'Kids', care: 'Care' }

const s = {
  // Layout
  body:    { fontFamily: 'Nunito, sans-serif', background: '#F9F7F4', minHeight: '100vh', color: '#1A1A2E' },
  layout:  { display: 'flex', minHeight: '100vh' },
  sidebar: { width: '220px', background: 'white', borderRight: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 },
  main:    { marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column' },
  topbar:  { background: 'white', borderBottom: '1px solid #F3F4F6', padding: '.9rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
  content: { padding: '1.8rem 2rem', flex: 1 },
  // Cards
  card:    { background: 'white', borderRadius: '16px', border: '1.5px solid #F3F4F6', overflow: 'hidden', marginBottom: '1.5rem' },
  cardHead:{ padding: '1rem 1.4rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle:{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 700 },
  // Stats
  statsGrid:{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { background: 'white', borderRadius: '16px', padding: '1.3rem', border: '1.5px solid #F3F4F6' },
  statNum:  { fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 700, display: 'block', marginBottom: '.2rem' },
  statLabel:{ fontSize: '.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' },
  // Table
  table:   { width: '100%', borderCollapse: 'collapse' },
  th:      { padding: '.7rem 1.2rem', textAlign: 'left', fontSize: '.7rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #F3F4F6', background: '#F9F7F4' },
  td:      { padding: '.85rem 1.2rem', borderBottom: '1px solid #F3F4F6', fontSize: '.85rem', fontWeight: 600 },
  // Buttons
  btnOrange:{ background: '#FF6B35', color: 'white', border: 'none', borderRadius: '100px', padding: '.55rem 1.2rem', fontFamily: 'Nunito,sans-serif', fontSize: '.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem' },
  btnGhost: { background: 'white', color: '#6B7280', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '.35rem .8rem', fontFamily: 'Nunito,sans-serif', fontSize: '.75rem', fontWeight: 800, cursor: 'pointer' },
  btnDanger:{ background: 'white', color: '#EF4444', border: '1.5px solid #FCA5A5', borderRadius: '8px', padding: '.35rem .8rem', fontFamily: 'Nunito,sans-serif', fontSize: '.75rem', fontWeight: 800, cursor: 'pointer' },
  // Form
  formRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  label:    { fontSize: '.72rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '.35rem' },
  input:    { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '.65rem .9rem', fontFamily: 'Nunito,sans-serif', fontSize: '.9rem', fontWeight: 600, color: '#1A1A2E', outline: 'none', background: 'white' },
  select:   { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '.65rem .9rem', fontFamily: 'Nunito,sans-serif', fontSize: '.9rem', fontWeight: 600, color: '#1A1A2E', outline: 'none', background: 'white' },
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '.65rem .9rem', fontFamily: 'Nunito,sans-serif', fontSize: '.9rem', fontWeight: 600, color: '#1A1A2E', outline: 'none', background: 'white', resize: 'vertical', minHeight: '80px' },
  // Badge
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', gap: '.3rem', padding: '.2rem .7rem', borderRadius: '100px', fontSize: '.72rem', fontWeight: 800, background: color + '18', color }),
  // Modal
  modalBg:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' },
  modal:    { background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', padding: '1.8rem', maxHeight: '90vh', overflowY: 'auto' },
}

export default function AdminPage() {
  const [authed,      setAuthed]      = useState(false)
  const [password,    setPassword]    = useState('')
  const [pwError,     setPwError]     = useState(false)
  const [tab,         setTab]         = useState('inicio')
  const [owners,      setOwners]      = useState([])
  const [dijes,       setDijes]       = useState([])
  const [scans,       setScans]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null) // 'new' | 'edit'
  const [editing,     setEditing]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState('')

  // Form state
  const emptyForm = { ownerName:'', ownerPhone:'', ownerWhatsapp:'', ownerEmail:'', petName:'', petSlug:'', petType:'pets', petDesc:'', petEmergency:'', plan:'basico' }
  const [form, setForm] = useState(emptyForm)

  // ── AUTH ────────────────────────────────────
  function login() {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      sessionStorage.setItem('tv_admin', '1')
    } else {
      setPwError(true)
      setTimeout(() => setPwError(false), 2000)
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem('tv_admin') === '1') setAuthed(true)
  }, [])

  // ── DATA LOADING ─────────────────────────────
  useEffect(() => {
    if (!authed) return
    loadAll()
  }, [authed])

  async function loadAll() {
    setLoading(true)
    const [{ data: ownersData }, { data: dijesData }, { data: scansData }] = await Promise.all([
      supabase.from('owners').select('*').order('created_at', { ascending: false }),
      supabase.from('dijes').select('*, owners(name, whatsapp)').order('created_at', { ascending: false }),
      supabase.from('scans').select('*, dijes(name, slug)').order('scanned_at', { ascending: false }).limit(50),
    ])
    setOwners(ownersData || [])
    setDijes(dijesData || [])
    setScans(scansData || [])
    setLoading(false)
  }

  // ── SAVE CLIENT ──────────────────────────────
  async function saveClient() {
    if (!form.ownerName || !form.petName || !form.petSlug) {
      showToast('⚠️ Nombre del dueño, mascota y slug son obligatorios')
      return
    }
    setSaving(true)
    try {
      let ownerId = editing?.owner_id

      if (modal === 'new') {
        // Crear dueño
        const { data: ownerData, error: ownerErr } = await supabase
          .from('owners')
          .insert({ name: form.ownerName, phone: form.ownerPhone, whatsapp: form.ownerWhatsapp, email: form.ownerEmail || null, plan: form.plan })
          .select().single()
        if (ownerErr) throw ownerErr
        ownerId = ownerData.id

        // Crear dije
        const { error: dijeErr } = await supabase.from('dijes').insert({
          owner_id:       ownerId,
          slug:           form.petSlug.toLowerCase().replace(/\s+/g,'-'),
          name:           form.petName,
          product_type:   form.petType,
          description:    form.petDesc,
          contact_phone:  form.ownerPhone,
          emergency_info: form.petEmergency ? form.petEmergency.split(',').map(e=>e.trim()) : [],
        })
        if (dijeErr) throw dijeErr
        showToast('✅ Cliente agregado correctamente')

      } else {
        // Editar dije existente
        const { error } = await supabase.from('dijes').update({
          name:           form.petName,
          slug:           form.petSlug.toLowerCase().replace(/\s+/g,'-'),
          product_type:   form.petType,
          description:    form.petDesc,
          contact_phone:  form.ownerPhone,
          emergency_info: form.petEmergency ? form.petEmergency.split(',').map(e=>e.trim()) : [],
        }).eq('id', editing.id)
        if (error) throw error

        // Editar dueño
        await supabase.from('owners').update({
          name: form.ownerName, phone: form.ownerPhone, whatsapp: form.ownerWhatsapp, plan: form.plan
        }).eq('id', editing.owner_id)
        showToast('✅ Cliente actualizado')
      }

      setModal(null)
      setForm(emptyForm)
      loadAll()
    } catch(e) {
      showToast('❌ Error: ' + e.message)
    }
    setSaving(false)
  }

  async function toggleActive(dijeId, current) {
    await supabase.from('dijes').update({ is_active: !current }).eq('id', dijeId)
    loadAll()
    showToast(current ? '⏸️ Dije desactivado' : '✅ Dije activado')
  }

  function openEdit(dije) {
    setEditing(dije)
    setForm({
      ownerName:    dije.owners?.name || '',
      ownerPhone:   dije.contact_phone || '',
      ownerWhatsapp:dije.owners?.whatsapp || '',
      ownerEmail:   '',
      petName:      dije.name,
      petSlug:      dije.slug,
      petType:      dije.product_type,
      petDesc:      dije.description || '',
      petEmergency: Array.isArray(dije.emergency_info) ? dije.emergency_info.join(', ') : '',
      plan:         'basico',
    })
    setModal('edit')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function autoSlug(name) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
  }

  // ── LOGIN SCREEN ─────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F9F7F4', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ background:'white', borderRadius:'24px', padding:'2.5rem', width:'100%', maxWidth:'360px', border:'1.5px solid #F3F4F6', boxShadow:'0 20px 60px rgba(0,0,0,.08)', textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🔐</div>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:'1.4rem', marginBottom:'.3rem' }}>Tag <span style={{ color:'#FF6B35' }}>V</span>ida Admin</h2>
        <p style={{ fontSize:'.85rem', color:'#6B7280', fontWeight:600, marginBottom:'1.5rem' }}>Panel de administración</p>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ ...s.input, marginBottom:'1rem', textAlign:'center', border: pwError ? '1.5px solid #FCA5A5' : '1.5px solid #E5E7EB' }}
        />
        {pwError && <p style={{ fontSize:'.78rem', color:'#EF4444', fontWeight:700, marginBottom:'.8rem' }}>Contraseña incorrecta</p>}
        <button onClick={login} style={{ ...s.btnOrange, width:'100%', justifyContent:'center', padding:'.8rem' }}>
          Entrar →
        </button>
      </div>
    </div>
  )

  // ── STATS ────────────────────────────────────
  const activeDijes   = dijes.filter(d => d.is_active).length
  const scansThisMonth= scans.filter(s => new Date(s.scanned_at) > new Date(Date.now() - 30*24*60*60*1000)).length
  const expiringSoon  = owners.filter(o => o.plan !== 'pro').length // simplificado

  // ── MAIN DASHBOARD ───────────────────────────
  return (
    <>
      <Head><title>Admin — Tag Vida</title></Head>
      <div style={s.body}>
        <div style={s.layout}>

          {/* SIDEBAR */}
          <aside style={s.sidebar}>
            <div style={{ padding:'1.4rem 1.2rem 1rem', borderBottom:'1px solid #F3F4F6' }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'1.3rem', fontWeight:700 }}>
                Tag <span style={{ color:'#FF6B35' }}>V</span>ida
              </div>
              <div style={{ fontSize:'.65rem', fontWeight:800, color:'#9CA3AF', letterSpacing:'.1em', textTransform:'uppercase', marginTop:'.1rem' }}>Admin</div>
            </div>
            <nav style={{ padding:'.8rem .6rem', flex:1 }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ display:'flex', alignItems:'center', gap:'.6rem', width:'100%', padding:'.6rem .9rem', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontSize:'.87rem', fontWeight:700, marginBottom:'.2rem', background: tab===t ? '#FFF3EE' : 'transparent', color: tab===t ? '#FF6B35' : '#6B7280', textAlign:'left' }}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </nav>
            <div style={{ padding:'1rem', borderTop:'1px solid #F3F4F6' }}>
              <button onClick={() => { sessionStorage.removeItem('tv_admin'); setAuthed(false) }} style={{ ...s.btnGhost, width:'100%', justifyContent:'center' }}>
                Cerrar sesión
              </button>
            </div>
          </aside>

          {/* MAIN */}
          <main style={s.main}>
            <div style={s.topbar}>
              <span style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem', fontWeight:700 }}>{TAB_LABELS[tab]}</span>
              <button style={s.btnOrange} onClick={() => { setEditing(null); setForm(emptyForm); setModal('new') }}>
                + Nuevo cliente
              </button>
            </div>

            <div style={s.content}>

              {/* ── INICIO ── */}
              {tab === 'inicio' && (
                <>
                  <div style={s.statsGrid}>
                    <div style={s.statCard}>
                      <div style={{ fontSize:'1.5rem', marginBottom:'.5rem' }}>🐾</div>
                      <span style={{ ...s.statNum, color:'#FF6B35' }}>{activeDijes}</span>
                      <span style={s.statLabel}>Dijes activos</span>
                    </div>
                    <div style={s.statCard}>
                      <div style={{ fontSize:'1.5rem', marginBottom:'.5rem' }}>📍</div>
                      <span style={{ ...s.statNum, color:'#2EC4B6' }}>{scansThisMonth}</span>
                      <span style={s.statLabel}>Escaneos este mes</span>
                    </div>
                    <div style={s.statCard}>
                      <div style={{ fontSize:'1.5rem', marginBottom:'.5rem' }}>👥</div>
                      <span style={{ ...s.statNum, color:'#4361EE' }}>{owners.length}</span>
                      <span style={s.statLabel}>Clientes totales</span>
                    </div>
                    <div style={s.statCard}>
                      <div style={{ fontSize:'1.5rem', marginBottom:'.5rem' }}>⚠️</div>
                      <span style={{ ...s.statNum, color:'#FF4D6D' }}>{expiringSoon}</span>
                      <span style={s.statLabel}>Por revisar</span>
                    </div>
                  </div>

                  {/* Escaneos recientes en inicio */}
                  <div style={s.card}>
                    <div style={s.cardHead}>
                      <span style={s.cardTitle}>📍 Escaneos recientes</span>
                      <button style={s.btnGhost} onClick={() => setTab('escaneos')}>Ver todos →</button>
                    </div>
                    {scans.slice(0,5).map(scan => (
                      <div key={scan.id} style={{ display:'flex', alignItems:'center', gap:'.9rem', padding:'.85rem 1.4rem', borderBottom:'1px solid #F3F4F6' }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FF6B35', flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'.87rem', fontWeight:800 }}>{scan.dijes?.name || '—'}</div>
                          <div style={{ fontSize:'.75rem', color:'#6B7280', fontWeight:600 }}>{scan.address || 'Sin dirección'}</div>
                        </div>
                        <div style={{ fontSize:'.72rem', color:'#9CA3AF', fontWeight:600, flexShrink:0 }}>
                          {new Date(scan.scanned_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </div>
                        {scan.lat && (
                          <a href={`https://maps.google.com/?q=${scan.lat},${scan.lng}`} target="_blank" rel="noreferrer" style={{ fontSize:'.72rem', fontWeight:800, color:'#2EC4B6', background:'#E8FAF9', border:'1px solid #B5EDEA', borderRadius:'8px', padding:'.25rem .6rem', textDecoration:'none', flexShrink:0 }}>
                            Mapa
                          </a>
                        )}
                      </div>
                    ))}
                    {scans.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#9CA3AF', fontSize:'.88rem' }}>Aún no hay escaneos</div>}
                  </div>
                </>
              )}

              {/* ── CLIENTES ── */}
              {tab === 'clientes' && (
                <div style={s.card}>
                  <div style={{ overflowX:'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Nombre / dije</th>
                          <th style={s.th}>Dueño</th>
                          <th style={s.th}>Producto</th>
                          <th style={s.th}>URL</th>
                          <th style={s.th}>Estado</th>
                          <th style={s.th}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dijes.map(dije => (
                          <tr key={dije.id}>
                            <td style={s.td}>
                              <div style={{ fontWeight:800 }}>{dije.name}</div>
                              <div style={{ fontSize:'.75rem', color:'#9CA3AF' }}>{dije.description?.slice(0,40)}...</div>
                            </td>
                            <td style={s.td}>
                              <div style={{ fontWeight:700 }}>{dije.owners?.name || '—'}</div>
                              <div style={{ fontSize:'.75rem', color:'#9CA3AF' }}>{dije.owners?.whatsapp}</div>
                            </td>
                            <td style={s.td}>
                              <span style={s.badge(PRODUCT_COLORS[dije.product_type] || '#6B7280')}>
                                {PRODUCT_LABELS[dije.product_type] || dije.product_type}
                              </span>
                            </td>
                            <td style={s.td}>
                              <a href={`/${dije.slug}`} target="_blank" rel="noreferrer" style={{ color:'#FF6B35', fontWeight:800, fontSize:'.82rem' }}>
                                /{dije.slug}
                              </a>
                            </td>
                            <td style={s.td}>
                              <span style={s.badge(dije.is_active ? '#16A34A' : '#9CA3AF')}>
                                {dije.is_active ? '● Activo' : '○ Inactivo'}
                              </span>
                            </td>
                            <td style={s.td}>
                              <div style={{ display:'flex', gap:'.4rem' }}>
                                <button style={s.btnGhost} onClick={() => openEdit(dije)}>✏️ Editar</button>
                                <button style={s.btnGhost} onClick={() => toggleActive(dije.id, dije.is_active)}>
                                  {dije.is_active ? '⏸️' : '▶️'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dijes.length === 0 && !loading && <div style={{ padding:'3rem', textAlign:'center', color:'#9CA3AF' }}>No hay clientes aún. ¡Agrega el primero!</div>}
                  </div>
                </div>
              )}

              {/* ── ESCANEOS ── */}
              {tab === 'escaneos' && (
                <div style={s.card}>
                  <div style={{ overflowX:'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Dije</th>
                          <th style={s.th}>Fecha y hora</th>
                          <th style={s.th}>Dirección</th>
                          <th style={s.th}>Mensaje</th>
                          <th style={s.th}>Mapa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scans.map(scan => (
                          <tr key={scan.id}>
                            <td style={s.td}><span style={{ fontWeight:800 }}>{scan.dijes?.name || '—'}</span></td>
                            <td style={s.td} >{new Date(scan.scanned_at).toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                            <td style={{ ...s.td, maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{scan.address || '—'}</td>
                            <td style={{ ...s.td, maxWidth:'160px' }}>{scan.finder_message ? `"${scan.finder_message.slice(0,60)}"` : '—'}</td>
                            <td style={s.td}>
                              {scan.lat
                                ? <a href={`https://maps.google.com/?q=${scan.lat},${scan.lng}`} target="_blank" rel="noreferrer" style={{ color:'#2EC4B6', fontWeight:800, fontSize:'.8rem' }}>Ver →</a>
                                : '—'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {scans.length === 0 && !loading && <div style={{ padding:'3rem', textAlign:'center', color:'#9CA3AF' }}>No hay escaneos aún</div>}
                  </div>
                </div>
              )}

              {/* ── SUSCRIPCIONES ── */}
              {tab === 'suscripciones' && (
                <div style={s.card}>
                  <div style={{ overflowX:'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Cliente</th>
                          <th style={s.th}>WhatsApp</th>
                          <th style={s.th}>Plan</th>
                          <th style={s.th}>Desde</th>
                          <th style={s.th}>Estado</th>
                          <th style={s.th}>Contactar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {owners.map(owner => (
                          <tr key={owner.id}>
                            <td style={s.td}><span style={{ fontWeight:800 }}>{owner.name}</span></td>
                            <td style={s.td}>{owner.whatsapp || '—'}</td>
                            <td style={s.td}>
                              <span style={s.badge('#FF6B35')}>{owner.plan || 'básico'}</span>
                            </td>
                            <td style={s.td}>{new Date(owner.created_at).toLocaleDateString('es-MX')}</td>
                            <td style={s.td}>
                              <span style={s.badge('#16A34A')}>● Activo</span>
                            </td>
                            <td style={s.td}>
                              {owner.whatsapp && (
                                <a href={`https://wa.me/${owner.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${owner.name}! Te escribimos de Tag Vida 🏷️`)}`} target="_blank" rel="noreferrer" style={{ color:'#25D366', fontWeight:800, fontSize:'.8rem' }}>
                                  WhatsApp →
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {owners.length === 0 && !loading && <div style={{ padding:'3rem', textAlign:'center', color:'#9CA3AF' }}>No hay clientes aún</div>}
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>

        {/* ── MODAL NUEVO / EDITAR ── */}
        {modal && (
          <div style={s.modalBg} onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div style={s.modal}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.4rem' }}>
                <h3 style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem' }}>
                  {modal === 'new' ? '➕ Nuevo cliente' : `✏️ Editar — ${editing?.name}`}
                </h3>
                <button onClick={() => setModal(null)} style={{ ...s.btnGhost, padding:'.3rem .7rem' }}>✕</button>
              </div>

              <p style={{ fontSize:'.72rem', fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.8rem' }}>Datos del dueño</p>

              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Nombre del dueño *</label>
                  <input style={s.input} value={form.ownerName} onChange={e => setForm({...form, ownerName:e.target.value})} placeholder="María González" />
                </div>
                <div>
                  <label style={s.label}>WhatsApp *</label>
                  <input style={s.input} value={form.ownerWhatsapp} onChange={e => setForm({...form, ownerWhatsapp:e.target.value})} placeholder="584141234567" />
                </div>
              </div>

              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Teléfono</label>
                  <input style={s.input} value={form.ownerPhone} onChange={e => setForm({...form, ownerPhone:e.target.value})} placeholder="+58 414 123 4567" />
                </div>
                <div>
                  <label style={s.label}>Plan</label>
                  <select style={s.select} value={form.plan} onChange={e => setForm({...form, plan:e.target.value})}>
                    <option value="basico">Básico</option>
                    <option value="familia">Familia</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>

              <p style={{ fontSize:'.72rem', fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.08em', margin:'1rem 0 .8rem' }}>Datos del dije</p>

              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Nombre (mascota/persona) *</label>
                  <input style={s.input} value={form.petName} onChange={e => { const v=e.target.value; setForm({...form, petName:v, petSlug: modal==='new' ? autoSlug(v) : form.petSlug}) }} placeholder="Firulais" />
                </div>
                <div>
                  <label style={s.label}>URL del dije (slug) *</label>
                  <div style={{ display:'flex', alignItems:'center', gap:'.3rem' }}>
                    <span style={{ fontSize:'.78rem', color:'#9CA3AF', fontWeight:700, whiteSpace:'nowrap' }}>tencuentro.com/</span>
                    <input style={{ ...s.input, flex:1 }} value={form.petSlug} onChange={e => setForm({...form, petSlug:e.target.value})} placeholder="firulais" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:'1rem' }}>
                <label style={s.label}>Producto</label>
                <select style={s.select} value={form.petType} onChange={e => setForm({...form, petType:e.target.value})}>
                  <option value="pets">🐾 TagVida Pets</option>
                  <option value="familia">👵 TagVida Familia</option>
                  <option value="kids">👧 TagVida Kids</option>
                  <option value="care">💙 TagVida Care</option>
                </select>
              </div>

              <div style={{ marginBottom:'1rem' }}>
                <label style={s.label}>Descripción (lo ve quien encuentra el dije)</label>
                <textarea style={s.textarea} value={form.petDesc} onChange={e => setForm({...form, petDesc:e.target.value})} placeholder="Soy muy amigable. Si me encontraste, mi familia te lo agradece 🧡" />
              </div>

              <div style={{ marginBottom:'1.5rem' }}>
                <label style={s.label}>Info de emergencia (separada por comas)</label>
                <input style={s.input} value={form.petEmergency} onChange={e => setForm({...form, petEmergency:e.target.value})} placeholder="Alérgico a penicilina, Diabetes tipo 2" />
              </div>

              <div style={{ display:'flex', gap:'.8rem', justifyContent:'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ ...s.btnGhost, padding:'.65rem 1.4rem', borderRadius:'100px' }}>Cancelar</button>
                <button onClick={saveClient} disabled={saving} style={{ ...s.btnOrange, padding:'.65rem 1.4rem', opacity: saving ? .6 : 1 }}>
                  {saving ? 'Guardando...' : modal === 'new' ? 'Guardar cliente ✦' : 'Actualizar ✦'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:300, background:'#1A1A2E', color:'white', padding:'.8rem 1.4rem', borderRadius:'12px', fontSize:'.85rem', fontWeight:700, boxShadow:'0 8px 30px rgba(0,0,0,.2)', pointerEvents:'none' }}>
            {toast}
          </div>
        )}
      </div>
    </>
  )
}
