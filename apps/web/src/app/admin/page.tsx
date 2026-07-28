import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from './AdminDashboardClient';
import type { ExtendedCompany } from './RealClientsView';
import type { ExtendedWaSession } from './WhatsappOversightView';
import type { Tables } from '@/types/database.generated';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify super_admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  // 1. Fetch all companies with owner profiles (explicitly selecting role)
  const { data: rawCompanies, error: compErr } = await supabaseAdmin
    .from('companies')
    .select('*, profiles(id, full_name, role)')
    .order('created_at', { ascending: false });

  if (compErr) {
    console.error('Error fetching companies for superadmin:', compErr);
  }

  // 2. Fetch all wa_sessions
  const { data: rawSessions, error: sessionErr } = await supabaseAdmin
    .from('wa_sessions')
    .select('*');

  if (sessionErr) {
    console.error('Error fetching wa_sessions for superadmin:', sessionErr);
  }

  const { data: demoLeads, error: demoLeadsError } = await supabaseAdmin
    .from('demo_leads')
    .select('company_id, contact_name, phone, industry, whatsapp_consent, created_at');

  if (demoLeadsError) {
    console.error('Error fetching demo leads for superadmin:', demoLeadsError);
  }

  // 3. Resolve Auth emails server-side with REAL PAGINATION (page by page beyond 1000 users)
  const emailMap = new Map<string, string>();
  try {
    const maxAuthPages = 10_000;
    const seenPageFingerprints = new Set<string>();
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= maxAuthPages) {
      const {
        data: { users: authUsers },
        error: listErr,
      } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });

      if (listErr || !authUsers || authUsers.length === 0) {
        hasMore = false;
      } else {
        const pageFingerprint = `${authUsers.length}:${authUsers[0]?.id ?? ''}:${
          authUsers.at(-1)?.id ?? ''
        }`;
        if (seenPageFingerprints.has(pageFingerprint)) {
          console.error('Auth pagination returned a repeated page; stopping defensively.', {
            page,
          });
          break;
        }
        seenPageFingerprints.add(pageFingerprint);

        authUsers.forEach((u) => {
          if (u.email) emailMap.set(u.id, u.email);
        });
        if (authUsers.length < 1000) {
          hasMore = false;
        } else {
          page += 1;
        }
      }
    }
    if (page > maxAuthPages) {
      console.error('Auth pagination reached the defensive page limit.');
    }
  } catch (err) {
    console.error('Error paginating auth users for superadmin email resolution:', err);
  }

  const sessionMap = new Map<string, Tables<'wa_sessions'>>();
  if (rawSessions) {
    for (const s of rawSessions) {
      sessionMap.set(s.company_id, s);
    }
  }
  const demoLeadMap = new Map((demoLeads || []).map((lead) => [lead.company_id, lead] as const));

  // 4. Map extended companies resolving the owner specifically by role = 'owner'
  const extendedCompanies: ExtendedCompany[] = (rawCompanies || []).map((c) => {
    const ownerProfile = c.profiles?.find((p) => p.role === 'owner');
    const ownerId = ownerProfile?.id;
    const ownerName = ownerProfile?.full_name || 'Sin dueño';
    const ownerEmail = ownerId ? emailMap.get(ownerId) || null : null;
    const waSession = sessionMap.get(c.id);
    const demoLead = demoLeadMap.get(c.id);

    return {
      ...c,
      profiles: ownerProfile ? [{ id: ownerProfile.id, full_name: ownerName }] : [],
      owner_email: ownerEmail,
      demo_lead: demoLead
        ? {
            contact_name: demoLead.contact_name,
            phone: demoLead.phone,
            industry: demoLead.industry,
            whatsapp_consent: demoLead.whatsapp_consent,
            created_at: demoLead.created_at,
          }
        : null,
      wa_session: waSession
        ? {
            status: waSession.status,
            phone_number: waSession.phone_number,
            evolution_instance_name: waSession.evolution_instance_name,
          }
        : null,
    };
  });

  const extendedSessions: ExtendedWaSession[] = (rawSessions || []).map((s) => ({
    ...s,
  }));

  return <AdminDashboardClient companies={extendedCompanies} waSessions={extendedSessions} />;
}
