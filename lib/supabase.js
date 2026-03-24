import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnon)

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  // Debug — verás esto en los logs de Vercel
  if (!serviceKey) {
    throw new Error(`SUPABASE_SERVICE_KEY is undefined. Check Vercel env vars.`)
  }

  return createClient(supabaseUrl, serviceKey)
}
