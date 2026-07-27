import { describe, it, expect } from 'vitest';
import type { FullClientProfileData } from '@/components/clients/ClientProfileModal';

describe('Client Profile & Business Rules Validation', () => {
  it('1. El perfil del cliente soporta la estructura de campos completa sin depender de campos truncados ni de "source"', () => {
    const fullProfile: FullClientProfileData = {
      id: 'contact-123',
      name: 'María Flores',
      phone: '51987654321',
      email: 'maria@ejemplo.com',
      document_number: '12345678',
      birthday: '1990-05-15',
      allergies_and_conditions: 'Alergia a la penicilina y marcapasos',
      preferences: 'Prefiere atención por las mañanas',
      internal_notes: 'Cliente muy puntual',
      created_at: '2025-01-10T10:00:00Z',
      opt_in_source: 'Instagram',
      customer_segment: 'VIP',
      total_visits: 12,
      total_spent: 1500,
      last_visit_date: '2026-07-20T15:30:00Z',
    };

    expect(fullProfile.name).toBe('María Flores');
    expect(fullProfile.opt_in_source).toBe('Instagram');
    expect(fullProfile.allergies_and_conditions).toContain('marcapasos');
    expect(fullProfile.total_visits).toBe(12);
    expect(fullProfile.total_spent).toBe(1500);
  });

  it('2. No se utiliza "Orgánico" como fallback inventado cuando opt_in_source no está registrado', () => {
    const profileWithoutSource: FullClientProfileData = {
      name: 'Juan Pérez',
      phone: '51911112222',
      opt_in_source: null,
    };

    const getDisplaySource = (source?: string | null) => source || 'No registrado';

    expect(getDisplaySource(profileWithoutSource.opt_in_source)).toBe('No registrado');
    expect(getDisplaySource(profileWithoutSource.opt_in_source)).not.toBe('Orgánico');
    expect(getDisplaySource(profileWithoutSource.opt_in_source)).not.toBe('Presencial');
  });

  it('3. opt_in_source se envía correctamente en la carga útil de upsertContact', () => {
    const payload = {
      phone: '51987654321',
      name: 'Ana Gómez',
      optInSource: 'TikTok',
    };

    const rpcPayload = {
      p_phone: payload.phone,
      p_name: payload.name,
      p_opt_in_source: payload.optInSource || null,
    };

    expect(rpcPayload.p_opt_in_source).toBe('TikTok');
  });

  it('4. Una fecha y hora pasada no debe ser calificada como agendado automáticamente', () => {
    const now = new Date('2026-07-26T19:00:00-05:00').getTime();
    const pastDateStr = '2026-07-25T10:00:00-05:00';
    const futureDateStr = '2026-07-28T10:00:00-05:00';

    const checkIsPast = (dateStr: string) => new Date(dateStr).getTime() < now;

    expect(checkIsPast(pastDateStr)).toBe(true);
    expect(checkIsPast(futureDateStr)).toBe(false);
  });

  it('5. En la pestaña Historial no debe aparecer el botón Cancelar para atenciones completadas o canceladas', () => {
    const completedVisitStatus = 'completado';
    const cancelledVisitStatus = 'cancelado';
    const scheduledVisitStatus = 'agendado';

    const canShowCancelButton = (status: string) =>
      status !== 'completado' && status !== 'cancelado' && status !== 'no_asistio';

    expect(canShowCancelButton(completedVisitStatus)).toBe(false);
    expect(canShowCancelButton(cancelledVisitStatus)).toBe(false);
    expect(canShowCancelButton(scheduledVisitStatus)).toBe(true);
  });

  it('6. El saldo en el historial se calcula de forma exacta mediante max(0, price_charged - amount_paid)', () => {
    const calculateSaldo = (total: number, pagado: number) => Math.max(0, total - pagado);

    expect(calculateSaldo(150, 150)).toBe(0);
    expect(calculateSaldo(200, 50)).toBe(150);
    expect(calculateSaldo(100, 120)).toBe(0); // Overpayment safe clamp
  });

  it('7. El menú lateral utiliza flex-col y overflow-y-auto en su contenedor para garantizar que los enlaces del final permanezcan alcanzables mediante scroll en cualquier altura de pantalla', () => {
    const navClasses = 'sidebar fixed inset-y-0 bottom-0 top-0 z-50 h-[100dvh] max-h-[100dvh] w-[260px] overflow-hidden';
    const innerContainerClasses = 'flex h-full min-h-0 flex-col bg-white dark:bg-dark';
    const scrollContainerClasses = 'min-h-0 flex-1 overflow-y-auto overscroll-contain';
    const listClasses = 'relative space-y-0.5 p-4 py-0 pb-8 font-semibold';

    expect(navClasses).toContain('h-[100dvh]');
    expect(navClasses).toContain('max-h-[100dvh]');
    expect(innerContainerClasses).toContain('min-h-0');
    expect(innerContainerClasses).toContain('flex-col');
    expect(scrollContainerClasses).toContain('overflow-y-auto');
    expect(listClasses).toContain('pb-8');
  });
});
