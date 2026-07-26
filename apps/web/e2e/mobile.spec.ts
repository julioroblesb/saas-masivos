import { expect, test } from '@playwright/test';

test('login remains usable without horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('Correo Electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acceder al Panel' })).toBeVisible();

  const viewport = page.viewportSize();
  const bodyWidth = await page.locator('body').evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewport?.width ?? bodyWidth);
});
