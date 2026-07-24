import { describe, it, expect } from 'vitest';
import { evaluateTenantAccess } from './subscriptions/evaluate-tenant-access';
import { extractEvolutionQr } from '../integrations/evolution/client';
import { resolveSpintax } from '@/shared/utils/spintax';

describe('Pruebas de Caracterización de Código Productivo Importable', () => {

  // 1. evaluateTenantAccess (3 Pruebas Reales)
  describe('evaluateTenantAccess', () => {
    it('otorgar acceso a empresa activa con fecha de vencimiento futura', () => {
      const company = {
        id: 'co-123',
        name: 'Test Co',
        status: 'activa',
        subscription_end_at: new Date(Date.now() + 86400000).toISOString()
      };
      const result = evaluateTenantAccess(company);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('active');
    });

    it('denegar acceso a empresa con fecha vencida', () => {
      const company = {
        id: 'co-123',
        name: 'Test Co',
        status: 'activa',
        subscription_end_at: new Date(Date.now() - 86400000).toISOString()
      };
      const result = evaluateTenantAccess(company);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('denegar acceso a empresa suspendida independientemente de la fecha', () => {
      const company = {
        id: 'co-123',
        name: 'Test Co',
        status: 'suspendida',
        subscription_end_at: new Date(Date.now() + 86400000).toISOString()
      };
      const result = evaluateTenantAccess(company);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('suspended');
    });
  });

  // 2. extractEvolutionQr (3 Pruebas Reales)
  describe('extractEvolutionQr', () => {
    it('extraer qr de base64 primer nivel', () => {
      const payload = { base64: 'data:image/png;base64,iVBORw0KGgo...' };
      expect(extractEvolutionQr(payload)).toBe('data:image/png;base64,iVBORw0KGgo...');
    });

    it('extraer qr de objeto anidado qrcode', () => {
      const payload = { qrcode: { base64: 'data:image/png;base64,nested...' } };
      expect(extractEvolutionQr(payload)).toBe('data:image/png;base64,nested...');
    });

    it('retornar null cuando el payload es nulo o invalido', () => {
      expect(extractEvolutionQr(null)).toBeNull();
      expect(extractEvolutionQr({})).toBeNull();
    });
  });

  // 3. resolveSpintax (1 Prueba Real)
  describe('resolveSpintax', () => {
    it('resolver spintax simple {Hola|Buenos dias}', () => {
      const text = '{Hola|Buenos dias} cliente';
      const resolved = resolveSpintax(text);
      expect(['Hola cliente', 'Buenos dias cliente']).toContain(resolved);
    });
  });
});
