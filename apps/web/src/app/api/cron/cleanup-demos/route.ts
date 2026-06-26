export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const authHeader = req.headers.get('authorization');
  const { searchParams } = new URL(req.url);
  const tokenParam = searchParams.get('token');
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en servidor' }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${CRON_SECRET}` && tokenParam !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Ejecutando basurero de demos efímeros...');

  try {
    const { data, error } = await supabaseAdmin.rpc('rpc_cleanup_demo_companies');

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Limpieza completada',
      details: data
    });

  } catch (globalError: any) {
    console.error('Error fatal en cron de limpieza:', globalError);
    return NextResponse.json({ error: globalError.message }, { status: 500 });
  }
}
