import { getServiceClient } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { slug } = req.query
  const supabase = getServiceClient()

  const { data: dije, error } = await supabase
    .from('dijes')
    .select(`
      id, name, slug, product_type, description,
      photo_url, emergency_info, contact_phone,
      owners (name, whatsapp, phone)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !dije) return res.status(404).json({ error: 'No encontrado' })

  // ✅ Declarar owner ANTES de usarlo
  const owner = Array.isArray(dije.owners) ? dije.owners[0] : dije.owners

  return res.status(200).json({
    id:             dije.id,
    name:           dije.name,
    slug:           dije.slug,
    product_type:   dije.product_type,
    description:    dije.description,
    photo_url:      dije.photo_url,
    emergency_info: dije.emergency_info,
    contact_phone:  dije.contact_phone || owner?.phone,
    owner_whatsapp: owner?.whatsapp || owner?.phone || null,
    owner_name:     owner?.name || null,
  })
}
