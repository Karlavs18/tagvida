import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const PRODUCT_EMOJI = {
  pets:    '🐾',
  familia: '👵',
  kids:    '👧',
  care:    '💙',
}
const PRODUCT_LABEL = {
  pets:    'Mascota',
  familia: 'Familiar',
  kids:    'Niño/a',
  care:    'Cuidado especial',
}

export default function ScanPage() {
  const router = useRouter()
  const { slug } = router.query

  const [dije,        setDije]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [locLabel,    setLocLabel]    = useState('Obteniendo tu ubicación...')
  const [locDetail,   setLocDetail]   = useState('Esto ayuda al dueño a localizar a su ser querido')
  const [notified,    setNotified]    = useState(false)
  const [msgValue,    setMsgValue]    = useState('')
  const [msgSent,     setMsgSent]     = useState(false)
  const [sending,     setSending]     = useState(false)
  const [userLoc,     setUserLoc]     = useState(null)
  const [history,     setHistory]     = useState([])
  const mapRef   = useRef(null)
  const leafletRef= useRef(null)

  // Cargar datos del dije
  useEffect(() => {
    if (!slug) return
    fetch(`/api/dije/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); setLoading(false); return }
        setDije(data)
        setLoading(false)
        // Cargar historial local
        try {
          const h = JSON.parse(localStorage.getItem(`scans_${data.id}`) || '[]')
          setHistory(h)
        } catch(e) {}
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  // Geolocalización + mapa + notificación
  useEffect(() => {
    if (!dije) return
    // Cargar Leaflet dinámicamente
    import('leaflet').then(L => {
      leafletRef.current = L.default
      startGeo(L.default)
    })
  }, [dije])

  function startGeo(L) {
    if (!navigator.geolocation) {
      setLocLabel('Ubicación no disponible')
      triggerNotification(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        }
        setUserLoc(loc)
        initMap(L, loc.lat, loc.lng)

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`)
          .then(r => r.json())
          .then(data => {
            const addr = (data.display_name || '').split(',').slice(0,3).join(',').trim()
            setLocLabel('📍 ' + addr)
            setLocDetail(`Precisión: ±${loc.accuracy} metros`)
            triggerNotification({ ...loc, address: addr })
          })
          .catch(() => {
            setLocLabel(`📍 ${loc.lat}, ${loc.lng}`)
            setLocDetail(`Precisión: ±${loc.accuracy} metros`)
            triggerNotification(loc)
          })
      },
      () => {
        setLocLabel('Ubicación no compartida')
        setLocDetail('El dueño fue notificado sin coordenadas')
        triggerNotification(null)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function initMap(L, lat, lng) {
    if (!mapRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      .setView([lat, lng], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    const icon = L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#FF6B35;border:3px solid white;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(255,107,53,.5);"></div>`,
      iconSize: [36, 36], iconAnchor: [18, 36], className: '',
    })
    L.marker([lat, lng], { icon }).addTo(map)
      .bindPopup(`<b>${dije.name}</b><br>📍 Escaneado aquí`).openPopup()
  }

async function triggerNotification(location) {
  // 1. Registrar en BD siempre
  try {
    await fetch('/api/scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        dije_id:    dije.id,
        location,
        user_agent: navigator.userAgent,
      }),
    })
  } catch(e) {
    console.error('Error registrando scan:', e)
  }

  // 2. Guardar en historial local
  if (location) {
    const entry = {
      addr:      location.address || `${location.lat}, ${location.lng}`,
      mapsUrl:   `https://maps.google.com/?q=${location.lat},${location.lng}`,
      timestamp: new Date().toISOString(),
    }
    const newH = [entry, ...history].slice(0, 20)
    setHistory(newH)
    try { localStorage.setItem(`scans_${dije.id}`, JSON.stringify(newH)) } catch(e) {}
  }

  // 3. Abrir WhatsApp automático con ubicación incluida
  const mapsUrl = location?.lat
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : 'sin ubicación'

  const msgParts = [
    `🔔 *Tag Vida — ¡Encontré a ${dije.name}!*`,
    '',
    `📍 Mi ubicación: ${mapsUrl}`,
    `🏠 Dirección: ${location?.address || 'no disponible'}`,
    `🕐 ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    '',
    '¿Cómo puedo devolverte tu mascota? 🐾',
  ]

  const phone  = (dije.owner_whatsapp || '').replace(/\D/g, '')
  const waMsg  = encodeURIComponent(msgParts.join('\n'))
  const waUrl  = `https://wa.me/${phone}?text=${waMsg}`

  // Pequeño delay para que la página cargue primero
  setTimeout(() => {
    window.open(waUrl, '_blank')
  }, 3000)

  setTimeout(() => setNotified(true), 2000)
}

async function sendMessage() {
  if (!msgValue.trim()) return
  setSending(true)

  const mapsUrl = userLoc
    ? `https://maps.google.com/?q=${userLoc.lat},${userLoc.lng}`
    : 'sin ubicación'

  const msgParts = [
    `🔔 *Tag Vida — ¡Encontré a ${dije.name}!*`,
    '',
    `📍 Mi ubicación: ${mapsUrl}`,
    `🏠 Dirección: ${locLabel.replace('📍 ', '') || 'no disponible'}`,
    `🕐 ${new Date().toLocaleString('es-MX')}`,
    '',
    `💬 "${msgValue}"`,
  ]

  const phone = (dije.owner_whatsapp || '').replace(/\D/g, '')
  const waMsg = encodeURIComponent(msgParts.join('\n'))
  window.open(`https://wa.me/${phone}?text=${waMsg}`, '_blank')

  // Registrar en BD
  try {
    await fetch('/api/scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        dije_id:        dije.id,
        location:       userLoc,
        finder_message: msgValue,
      }),
    })
  } catch(e) {}

  setSending(false)
  setMsgSent(true)
}

  // ── ESTADOS DE UI ──────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F9F7F4', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ textAlign:'center', color:'#6B7280' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🔍</div>
        <p style={{ fontWeight:700 }}>Cargando perfil...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F9F7F4', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ textAlign:'center', color:'#6B7280', padding:'2rem' }}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>😕</div>
        <h2 style={{ fontFamily:'serif', color:'#1A1A2E', marginBottom:'.5rem' }}>Dije no encontrado</h2>
        <p style={{ fontSize:'.9rem' }}>Este dije no existe o fue desactivado.</p>
      </div>
    </div>
  )

  const mapsUrl = userLoc ? `https://maps.google.com/?q=${userLoc.lat},${userLoc.lng}` : null
  const emergency = dije.emergency_info || []

  return (
    <>
      <Head>
        <title>Tag Vida — ¡Encontré a {dije.name}!</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </Head>
      <div style={{ background:'#F9F7F4', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', padding:'1.5rem 1rem 3rem', position:'relative' }}>

        {/* Blobs */}
        <div style={{ position:'fixed', width:'400px', height:'400px', borderRadius:'50%', background:'#FF6B35', filter:'blur(80px)', opacity:.1, top:'-100px', left:'-100px', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', width:'350px', height:'350px', borderRadius:'50%', background:'#2EC4B6', filter:'blur(80px)', opacity:.1, bottom:'-80px', right:'-80px', pointerEvents:'none', zIndex:0 }} />

        {/* CARD */}
        <div style={{ width:'100%', maxWidth:'420px', background:'white', borderRadius:'28px', border:'2px solid #F3F4F6', boxShadow:'0 20px 60px rgba(0,0,0,.08)', overflow:'hidden', position:'relative', zIndex:1, marginBottom:'1rem' }}>

          {/* Banner */}
          <div style={{ background:'linear-gradient(135deg,#FFF3EE,#FFF8F5)', borderBottom:'1.5px solid #FFD4C2', padding:'1rem 1.5rem', display:'flex', alignItems:'center', gap:'.8rem' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <span style={{ width:'12px', height:'12px', borderRadius:'50%', background:'#FF6B35', display:'block' }} />
            </div>
            <div>
              <strong style={{ display:'block', fontSize:'.88rem', fontWeight:800, color:'#FF6B35' }}>¡Avisando al dueño ahora mismo!</strong>
              <span style={{ fontSize:'.78rem', color:'#6B7280', fontWeight:600 }}>El dueño está siendo notificado con tu ubicación</span>
            </div>
          </div>

          {/* Perfil */}
          <div style={{ padding:'2rem 1.5rem 1.2rem', textAlign:'center' }}>
            <div style={{ position:'relative', display:'inline-block', marginBottom:'1.2rem' }}>
              <div style={{ width:'110px', height:'110px', borderRadius:'50%', border:'3px solid #FFD4C2', background:'#FFF3EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3.2rem', margin:'0 auto', boxShadow:'0 0 0 6px rgba(255,107,53,.07)', overflow:'hidden' }}>
                {dije.photo_url
                  ? <img src={dije.photo_url} alt={dije.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                  : PRODUCT_EMOJI[dije.product_type] || '🏷️'
                }
              </div>
              <span style={{ position:'absolute', bottom:'4px', right:'-4px', background:'white', border:'1.5px solid #FFD4C2', borderRadius:'100px', padding:'.2rem .7rem', fontSize:'.65rem', fontWeight:800, color:'#FF6B35', letterSpacing:'.06em', textTransform:'uppercase', boxShadow:'0 2px 8px rgba(0,0,0,.08)' }}>
                {PRODUCT_LABEL[dije.product_type] || 'Tag Vida'}
              </span>
            </div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:'1.9rem', fontWeight:700, color:'#1A1A2E', marginBottom:'.2rem' }}>
              ¡Hola! Soy <em style={{ fontStyle:'italic', color:'#FF6B35' }}>{dije.name}</em>
            </div>
            <p style={{ fontSize:'.88rem', color:'#6B7280', fontWeight:600, lineHeight:1.6, maxWidth:'280px', margin:'0 auto .8rem' }}>
              {dije.description || 'Mi familia te agradece que me hayas encontrado 🧡'}
            </p>
          </div>

          {/* Info emergencia */}
          {emergency.length > 0 && (
            <div style={{ margin:'0 1.2rem .8rem', background:'#FFF8E1', border:'1.5px solid #FFE082', borderRadius:'14px', padding:'.9rem 1.1rem' }}>
              <div style={{ fontSize:'.78rem', fontWeight:800, color:'#F59E0B', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.5rem' }}>⚠️ Info importante</div>
              {emergency.map((e, i) => <div key={i} style={{ fontSize:'.82rem', color:'#1A1A2E', fontWeight:600, marginBottom:'.25rem' }}>⚠️ {e}</div>)}
            </div>
          )}

          {/* Mapa */}
          <div style={{ margin:'0 1.2rem 1rem' }}>
            <span style={{ fontSize:'.78rem', fontWeight:800, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:'.5rem' }}>📍 Ubicación del escaneo</span>
            {!userLoc && (
              <div style={{ width:'100%', height:'200px', borderRadius:'14px', border:'1.5px solid #F3F4F6', background:'#F9F7F4', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'.5rem', color:'#6B7280', fontSize:'.85rem', fontWeight:600 }}>
                <span style={{ fontSize:'2rem' }}>🗺️</span>
                <span>Obteniendo ubicación...</span>
              </div>
            )}
            <div ref={mapRef} style={{ width:'100%', height: userLoc ? '200px' : '0', borderRadius:'14px', border: userLoc ? '1.5px solid #B5EDEA' : 'none', overflow:'hidden', display: userLoc ? 'block' : 'none' }} />
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem', width:'100%', background:'#E8FAF9', color:'#2EC4B6', border:'1.5px solid #B5EDEA', borderRadius:'10px', padding:'.7rem', fontSize:'.85rem', fontWeight:800, marginTop:'.6rem', textDecoration:'none' }}>
                🗺️ Abrir en Google Maps
              </a>
            )}
          </div>

          {/* Ubicación texto */}
          <div style={{ margin:'0 1.2rem .8rem', background:'#E8FAF9', border:'1.5px solid #B5EDEA', borderRadius:'14px', padding:'.9rem 1.1rem', display:'flex', alignItems:'flex-start', gap:'.7rem' }}>
            <span style={{ fontSize:'1.3rem', flexShrink:0, marginTop:'.1rem' }}>📍</span>
            <div>
              <span style={{ fontSize:'.82rem', fontWeight:800, color:'#1A1A2E', display:'block', marginBottom:'.1rem' }}>{locLabel}</span>
              <span style={{ fontSize:'.75rem', color:'#6B7280', fontWeight:600 }}>{locDetail}</span>
            </div>
          </div>

          {/* Notificado */}
          {notified && (
            <div style={{ margin:'0 1.2rem .8rem', background:'#F0FDF4', border:'1.5px solid #86EFAC', borderRadius:'14px', padding:'.9rem 1.1rem' }}>
              <strong style={{ display:'block', fontSize:'.85rem', fontWeight:800, color:'#16A34A', marginBottom:'.15rem' }}>✅ ¡Dueño notificado!</strong>
              <span style={{ fontSize:'.78rem', color:'#4ADE80', fontWeight:600 }}>{dije.owner_name} fue alertado. Debería contactarte pronto. ¡Gracias por ayudar! 🐾</span>
            </div>
          )}

          {/* Acciones */}
          <div style={{ padding:'0 1.2rem .8rem', display:'flex', flexDirection:'column', gap:'.7rem' }}>
            <a href={`tel:${dije.contact_phone}`} style={{ background:'#FF6B35', color:'white', borderRadius:'14px', padding:'1rem', fontSize:'.95rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:'.6rem', boxShadow:'0 4px 16px rgba(255,107,53,.3)', textDecoration:'none' }}>
              📞 Llamar al dueño
            </a>
       <a 
  href={`https://wa.me/${(dije.owner_whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent(
    `🔔 *Tag Vida — ¡Encontré a ${dije.name}!*\n\n📍 Mi ubicación: ${userLoc ? `https://maps.google.com/?q=${userLoc.lat},${userLoc.lng}` : 'sin ubicación'}\n🏠 ${locLabel.replace('📍 ','')}\n🕐 ${new Date().toLocaleString('es-MX')}`
  )}`}
  target="_blank" 
  rel="noreferrer"
  style={{ background:'#25D366', color:'white', borderRadius:'14px', padding:'.85rem', fontSize:'.88rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:'.6rem', textDecoration:'none' }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.526 5.847L.057 23.882l6.198-1.625A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.368l-.359-.213-3.68.965.982-3.589-.234-.369A9.818 9.818 0 1112 21.818z"/></svg>
  Escribir por WhatsApp
</a>
          </div>

          {/* Mensaje */}
          <div style={{ margin:'0 1.2rem', display:'flex', alignItems:'center', gap:'.8rem', marginBottom:'.8rem' }}>
            <div style={{ flex:1, height:'1px', background:'#F3F4F6' }} />
            <span style={{ fontSize:'.75rem', color:'#9CA3AF', fontWeight:700 }}>¿Quieres dejar un mensaje?</span>
            <div style={{ flex:1, height:'1px', background:'#F3F4F6' }} />
          </div>

          <div style={{ padding:'0 1.2rem 1.2rem' }}>
            <span style={{ fontSize:'.78rem', fontWeight:800, color:'#6B7280', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'.6rem', display:'block' }}>💬 Escríbele algo al dueño</span>
            <textarea
              value={msgValue}
              onChange={e => setMsgValue(e.target.value)}
              disabled={msgSent}
              placeholder="Ej: Tu mascota está conmigo, está bien. Estoy en..."
              style={{ width:'100%', background:'#F9F7F4', border:'1.5px solid #E5E7EB', borderRadius:'12px', padding:'.85rem 1rem', fontFamily:'Nunito,sans-serif', fontSize:'.88rem', fontWeight:600, color:'#1A1A2E', resize:'none', height:'88px', outline:'none', lineHeight:1.5 }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || msgSent}
              style={{ marginTop:'.6rem', width:'100%', background: msgSent ? '#F0FDF4' : 'white', border: msgSent ? '2px solid #86EFAC' : '2px solid #FFD4C2', borderRadius:'12px', padding:'.85rem', fontFamily:'Nunito,sans-serif', fontSize:'.88rem', fontWeight:800, color: msgSent ? '#16A34A' : '#FF6B35', cursor: msgSent ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem' }}
            >
              {msgSent ? '✅ ¡Mensaje enviado!' : sending ? 'Enviando...' : 'Enviar mensaje al dueño →'}
            </button>
          </div>

          <div style={{ padding:'1rem 1.2rem', borderTop:'1px solid #F3F4F6', textAlign:'center' }}>
            <a href="/" style={{ fontFamily:'Georgia,serif', fontSize:'.82rem', color:'#9CA3AF', textDecoration:'none' }}>
              Protegido por Tag <span style={{ color:'#FF6B35' }}>V</span>ida ✦
            </a>
          </div>
        </div>

        {/* Historial */}
        {history.length > 0 && (
          <div style={{ width:'100%', maxWidth:'420px', background:'white', borderRadius:'24px', border:'2px solid #F3F4F6', boxShadow:'0 8px 30px rgba(0,0,0,.06)', overflow:'hidden', position:'relative', zIndex:1 }}>
            <div style={{ padding:'1.2rem 1.5rem', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:700 }}>📍 Historial de escaneos</span>
              <span style={{ background:'#FFF3EE', color:'#FF6B35', fontSize:'.72rem', fontWeight:800, padding:'.2rem .7rem', borderRadius:'100px' }}>{history.length} escaneo{history.length !== 1 ? 's' : ''}</span>
            </div>
            {history.slice(0,5).map((s, i) => {
              const d = new Date(s.timestamp)
              const date = d.toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) + ' ' + d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
              return (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'.8rem', padding:'.9rem 1.5rem', borderBottom: i < Math.min(history.length,5)-1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background: i===0 ? '#FF6B35' : '#D1D5DB', flexShrink:0, marginTop:'4px' }} />
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:'.75rem', fontWeight:800, color:'#1A1A2E', display:'block', marginBottom:'.1rem' }}>{date}</span>
                    <span style={{ fontSize:'.78rem', color:'#6B7280', fontWeight:600, lineHeight:1.4 }}>{s.addr}</span>
                  </div>
                  {s.mapsUrl && (
                    <a href={s.mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize:'.72rem', fontWeight:800, color:'#2EC4B6', background:'#E8FAF9', border:'1px solid #B5EDEA', borderRadius:'8px', padding:'.25rem .6rem', textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
                      Ver mapa
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
