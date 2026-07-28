const PERU_COUNTRY_CODE = '51';
const PERU_MOBILE_LENGTH = 9;

export function normalizePeruPhone(value: string): string | null {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 12 && digits.startsWith('0519')) {
    digits = digits.slice(1);
  }

  if (digits.length === PERU_MOBILE_LENGTH && digits.startsWith('9')) {
    return `${PERU_COUNTRY_CODE}${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('519')) {
    return digits;
  }

  return null;
}

export function requirePeruPhone(value: string): string {
  const normalized = normalizePeruPhone(value);
  if (!normalized) {
    throw new Error('Ingresa un celular peruano de 9 dígitos, por ejemplo 996 552 871.');
  }
  return normalized;
}
