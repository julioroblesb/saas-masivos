import { describe, it, expect } from 'vitest';

interface DebtVisit {
  amount_paid: number;
  contact_name?: string | null;
  contact_phone?: string | null;
  debt_due_date?: string | null;
  id: string;
  payment_status?: string | null;
  price_charged?: number | null;
  scheduled_date?: string | null;
  service_name?: string | null;
  visit_date?: string | null;
}

function filterAndCalculateDebts(debts: DebtVisit[], search: string) {
  const query = search.trim().toLowerCase();
  const filteredDebts = query
    ? debts.filter((d) =>
        (d.contact_name || '').toLowerCase().includes(query) ||
        (d.service_name || '').toLowerCase().includes(query) ||
        (d.contact_phone || '').includes(query),
      )
    : debts;

  const totalDebt = filteredDebts.reduce(
    (sum, debt) => sum + ((debt.price_charged ?? 0) - debt.amount_paid),
    0,
  );

  return { filteredDebts, totalDebt };
}

describe('Cobranza logic regression tests', () => {
  const sampleDebts: DebtVisit[] = [
    {
      id: '1',
      contact_name: 'Ana Torres',
      contact_phone: '987654321',
      service_name: 'Limpieza Facial',
      price_charged: 100,
      amount_paid: 40,
      debt_due_date: '2026-07-31',
    },
    {
      id: '2',
      contact_name: 'Carlos Ruiz',
      contact_phone: '912345678',
      service_name: 'Masaje Relajante',
      price_charged: 150,
      amount_paid: 50,
      debt_due_date: '2026-08-05',
    },
  ];

  it('returns all debts when search query is empty or whitespace', () => {
    const { filteredDebts, totalDebt } = filterAndCalculateDebts(sampleDebts, '   ');
    expect(filteredDebts.length).toBe(2);
    expect(totalDebt).toBe(160); // (100-40) + (150-50) = 60 + 100
  });

  it('filters correctly by contact name or phone', () => {
    const { filteredDebts, totalDebt } = filterAndCalculateDebts(sampleDebts, 'Ana');
    expect(filteredDebts.length).toBe(1);
    expect(filteredDebts[0].id).toBe('1');
    expect(totalDebt).toBe(60);
  });
});
