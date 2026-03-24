import { getServiceClient } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { dije_id, location, finder_message, user_agent } = req.body
  if (!dije_id) return res.status(400).json({ error: 'dije_id requerido' })

  const supabase = getServiceClient()

  try {
    const { data: dije, error: dijeError } = await supabase
      .from('dijes')
      .select(`id, name, slug, product_type, owners (name, whatsapp, phone)`)
      .eq('id', dije_id)
      .eq('is_active', true)
      .single()

    if (dijeError || !dije) {
      console.error('Dije no encontrado:', dijeError)
      return res.status(404).json({ error: 'Dije no encontrado' })
    }

    // ✅ FIX #2: normalizar owners (array vs objeto)
    const owner = Array.isArray(dije.owners) ? dije.owners[0] : dije.owners

    // Registrar escaneo
    const { error: scanError } = await supabase
      .from('scans')
      .insert({
        dije_id,
        lat:            location?.lat    || null,
        lng:            location?.lng    || null,
        address:        location?.address || null,
        finder_message: finder_message   || null,
        user_agent:     user_agent       || null,
      })
    if (scanError) console.error('Error guardando scan:', scanError)

    // Enviar WhatsApp al dueño
    const phone = owner?.whatsapp || owner?.phone
    if (phone) {
      const mapsUrl = location?.lat
        ? `https://maps.google.com/?q=${location.lat},${location.lng}`
        : 'sin ubicación'

      const msgParts = [
        `🔔 *Tag Vida — ¡${dije.name} fue encontrado/a!*`,
        '',
        `📍 Mapa: ${mapsUrl}`,
        `🏠 Dirección: ${location?.address || 'no disponible'}`,
        `🕐 ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
      ]
      if (finder_message) msgParts.push('', `💬 Mensaje: "${finder_message}"`)

      const waMsg    = encodeURIComponent(msgParts.join('\n'))
      const cleanPhone = phone.replace(/\D/g, '')
      const waApiUrl = `https://wa.me/${cleanPhone}?text=${waMsg}`

      return res.status(200).json({
        success:      true,
        whatsapp_url: waApiUrl,
        owner_name:   owner.name,
        dije_name:    dije.name,
      })
    }

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Error en /api/scan:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
}
