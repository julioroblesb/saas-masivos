import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { BotConfig } from '@/modules/bot/BotConfig';

export default async function BotPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar si es tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'super_admin') {
    redirect('/admin');
  }

  return (
    <div>
      <BotConfig />
    </div>
  );
}
