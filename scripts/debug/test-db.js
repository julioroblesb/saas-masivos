const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("Missing credentials!");
  process.exit(1);
}
const supabase = createClient(url, key);

async function run() {
  const { data: queue, error } = await supabase.from('crm_wa_queue').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) console.error("Error:", error);
  console.log("Queue count:", queue ? queue.length : 0);
  if (queue && queue.length > 0) {
    console.log("Latest items:", JSON.stringify(queue, null, 2));
  }
}
run();
