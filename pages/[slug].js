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
  const [finderPhone, setFinderPhone] = useState('')  // ← NUEVO
  const mapRef    = useRef(null)
  const leafletRef = useRef(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/dije/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); setLoading(false); return }
        setDije(data)
        setLoading(false)
        try {
          const h = JSON.parse(localStorage.getItem(`scans_${data.id}`) || '[]')
          setHistory(h)
        } catch(e) {}
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (!dije) return
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
          lat:      parseFloat(pos.coords.latitude.toFixed(6)),
          lng:      parseFloat(pos.coords.longitude.toFixed(6)),
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
            setLocLabel(`📍 ${loc.lat},
