import { expect, test, type Page } from '@playwright/test';

const localPassword = 'LocalTest123!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(localPassword);
  await page.getByRole('button', { name: 'Acceder al Panel' }).click();
}

test('an anonymous user is redirected away from protected pages', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
});

for (const role of [
  { name: 'owner', email: 'owner-a@local.test' },
  { name: 'employee', email: 'employee-a@local.test' },
]) {
  test(`${role.name} signs in and reaches its tenant dashboard`, async ({ page }) => {
    await login(page, role.email);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible();
  });

  test(`${role.name} cannot enter the superadmin panel`, async ({ page }) => {
    await login(page, role.email);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
}

test('superadmin signs in and reaches tenant administration', async ({ page }) => {
  await login(page, 'superadmin@local.test');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Gestión de Clientes' })).toBeVisible();
});
