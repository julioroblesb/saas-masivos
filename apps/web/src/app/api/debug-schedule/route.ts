import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateVisitStatusAction } from '@/app/dashboard/atenciones/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get('visit_id');

  if (!visitId) {
    return NextResponse.json({ error: 'Falta visit_id' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    
    let targetVisitId = visitId;
    if (!targetVisitId) {
      // Find the latest completed visit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      
      const { data: latestVisit } = await supabase
        .from('spa_visits')
        .select('id')
        .eq('company_id', profile?.company_id)
        .eq('status', 'completado')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!latestVisit) return NextResponse.json({ error: 'No se encontraron visitas completadas' }, { status: 404 });
      targetVisitId = latestVisit.id;
    }

    // Simulate scheduleAutoMessages step-by-step
    const { data: visit, error: visitErr } = await supabase
      .from('spa_visits')
      .select(`
        company_id,
        visit_date,
        spa_services ( name, duration_days, care_instructions, care_image_url ),
        crm_marketing_contacts ( id, phone, name )
      `)
      .eq('id', targetVisitId)
      .single();

    if (!visit || visitErr) return NextResponse.json({ stage: 'fetch_visit', error: visitErr?.message });

    const { data: company } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', visit.company_id)
      .single();

    const DEFAULT_CARE_TEMPLATE = "Hola {{nombre}}, gracias por visitarnos hoy en nuestro local. Esperamos que hayas disfrutado tu servicio de {{servicio}}. ¡Que tengas un excelente día!";
    const DEFAULT_FOLLOWUP_TEMPLATE = "Hola {{nombre}}, ¿cómo sigues después de tu servicio de {{servicio}} hace {{dias}} días? Queríamos saber cómo te fue. ¡Saludos!";

    const autoMsgs = company?.settings?.auto_messages || {
      careEnabled: true,
      careTemplate: DEFAULT_CARE_TEMPLATE,
      followUpEnabled: true,
      followUpTemplate: DEFAULT_FOLLOWUP_TEMPLATE
    };

    const replaceVars = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\{\{nombre\}\}/gi, visit.crm_marketing_contacts?.name || '')
        .replace(/\{\{servicio\}\}/gi, visit.spa_services?.name || '')
        .replace(/\{\{dias\}\}/gi, visit.spa_services?.duration_days?.toString() || '0');
    };

    const queueInserts = [];

    if (autoMsgs.careEnabled && autoMsgs.careTemplate) {
      queueInserts.push({
        company_id: visit.company_id,
        visit_id: targetVisitId,
        contact_id: visit.crm_marketing_contacts?.id,
        phone: visit.crm_marketing_contacts?.phone,
        message: replaceVars(autoMsgs.careTemplate),
        status: 'pendiente',
        scheduled_for: new Date().toISOString(),
      });

      if (visit.spa_services?.care_instructions || visit.spa_services?.care_image_url) {
        queueInserts.push({
          company_id: visit.company_id,
          visit_id: targetVisitId,
          contact_id: visit.crm_marketing_contacts?.id,
          phone: visit.crm_marketing_contacts?.phone,
          message: visit.spa_services.care_instructions || 'Instrucciones de cuidado',
          media_url: visit.spa_services.care_image_url || null,
          status: 'pendiente',
          scheduled_for: new Date(Date.now() + 5000).toISOString(),
        });
      }
    }

    if (autoMsgs.followUpEnabled && autoMsgs.followUpTemplate && visit.spa_services?.duration_days > 0) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + visit.spa_services.duration_days);

      queueInserts.push({
        company_id: visit.company_id,
        visit_id: targetVisitId,
        contact_id: visit.crm_marketing_contacts?.id,
        phone: visit.crm_marketing_contacts?.phone,
        message: replaceVars(autoMsgs.followUpTemplate),
        status: 'pendiente',
        scheduled_for: scheduledDate.toISOString(),
      });
    }

    let insertErrorResult = null;
    if (queueInserts.length > 0) {
      const { error: insertErr } = await supabase.from('crm_wa_queue').insert(queueInserts);
      if (insertErr) {
        insertErrorResult = insertErr;
      }
    }

    return NextResponse.json({
      success: true,
      visitData: visit,
      autoMsgsConfigEvaluated: autoMsgs,
      generatedInserts: queueInserts,
      insertErrorResult
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
