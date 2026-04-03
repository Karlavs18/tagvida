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
      return res.status(404).json({ error: 'Dije no encontrado' })
    }

    const owner = Array.isArray(dije.owners) ? dije.owners[0] : dije.owners

    // Registrar escaneo en BD siempre
    const { dije_id, location, finder_message, user_agent, finder_phone } = req.body
    const { error: scanError } = await supabase
      .from('scans')
      .insert({
        dije_id,
        lat:            location?.lat     || null,
        lng:            location?.lng     || null,
        address:        location?.address || null,
        finder_message: finder_message    || null,
        user_agent:     user_agent        || null,
        finder_phone: finder_phone || null,
      })
    if (scanError) console.error('Error guardando scan:', scanError)

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Error en /api/scan:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
}
