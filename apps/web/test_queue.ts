import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role or anon

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: profile } = await supabase.from('profiles').select('*').limit(1).single();
  console.log('Profile:', profile);
  
  if (profile) {
    const { data: queue, error } = await supabase.from('crm_wa_queue').insert({
      company_id: profile.company_id,
      phone: '1234567890',
      message: 'test',
      status: 'pendiente'
    });
    console.log('Insert:', queue, error);
  }
}

test();
