import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePeruPhone } from '@/shared/utils/phone';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { createClient as createServerClient } from '@/utils/supabase/server';

const TEMPLATE_COMPANY_ID = '3c3cb849-06c8-4250-b4cf-9375422684a6';

const requestSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(30),
  industry: z.string().trim().min(2).max(120),
  whatsappConsent: z.literal(true),
});

const resultSchema = z.object({
  success: z.literal(true),
  company_id: z.string().uuid(),
  welcome_queued: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Completa todos los campos y autoriza el mensaje de demostración.' },
        { status: 400 },
      );
    }

    const supabaseServer = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    if (!user.is_anonymous) {
      return NextResponse.json({ error: 'La demo requiere una sesión temporal.' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id, companies!inner(is_demo)')
      .eq('id', user.id)
      .eq('companies.is_demo', true)
      .maybeSingle();

    if (existingProfile?.company_id) {
      return NextResponse.json({
        success: true,
        company_id: existingProfile.company_id,
        welcome_queued: true,
      });
    }

    const normalizedPhone = requirePeruPhone(parsedBody.data.phone);
    const { data, error } = await supabaseAdmin.rpc('rpc_create_demo_from_lead', {
      p_template_company_id: TEMPLATE_COMPANY_ID,
      p_user_id: user.id,
      p_business_name: parsedBody.data.businessName,
      p_contact_name: parsedBody.data.contactName,
      p_phone: normalizedPhone,
      p_industry: parsedBody.data.industry,
      p_whatsapp_consent: parsedBody.data.whatsappConsent,
    });

    if (error) throw error;

    const parsedResult = resultSchema.safeParse(data);
    if (!parsedResult.success) {
      throw new Error('La base de datos devolvió una respuesta de demo inválida.');
    }

    return NextResponse.json(parsedResult.data);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : String(error);
    console.error('[Demo] Error al crear cuenta demo:', { message });

    const isPhoneError = message.includes('9 dígitos') || message.includes('Número peruano');
    const alreadyRequested = message.includes('últimas 24 horas');

    return NextResponse.json(
      {
        error:
          isPhoneError || alreadyRequested
            ? message
            : 'No se pudo preparar el entorno demo. Inténtalo nuevamente.',
      },
      { status: isPhoneError ? 400 : alreadyRequested ? 429 : 500 },
    );
  }
}
