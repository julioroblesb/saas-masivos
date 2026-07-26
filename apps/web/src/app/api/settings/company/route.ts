import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

const settingsPayloadSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
}).refine(
  ({ companyName, settings }) => companyName !== undefined || settings !== undefined,
  { message: 'No hay cambios para guardar' },
);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: company, error } = await supabase
      .from('companies')
      .select('settings')
      .single();

    if (error) throw error;
    return NextResponse.json({ settings: company?.settings ?? {} });
  } catch (error: unknown) {
    console.error('Error loading company settings:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar la configuración' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const parsed = settingsPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      );
    }

    let mergedSettings: Record<string, unknown> | undefined;
    if (parsed.data.settings) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('settings')
        .single();
      if (companyError) throw companyError;

      mergedSettings = {
        ...((company?.settings as Record<string, unknown> | null) ?? {}),
        ...parsed.data.settings,
      };
    }

    const { error: updateError } = await supabase.rpc(
      'rpc_update_company_settings',
      {
        p_name: parsed.data.companyName ?? null,
        p_settings: mergedSettings ?? null,
      },
    );
    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Empresa actualizada correctamente' });
  } catch (error: unknown) {
    console.error('Error saving company settings:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar la configuración' },
      { status: 500 },
    );
  }
}
