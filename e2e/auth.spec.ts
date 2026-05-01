import { test, expect } from '@playwright/test';

function uniqueEmail() {
  return `e2e-${Date.now()}@test.com`;
}

async function registerUser(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /register/i }).click();
  await expect(page).toHaveURL('/');
}

test('register new user → lands on dashboard', async ({ page }) => {
  const email = uniqueEmail();

  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Test1234!');
  await page.getByRole('button', { name: /register/i }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('login with existing credentials → lands on dashboard', async ({ page }) => {
  const email = uniqueEmail();
  const password = 'Test1234!';

  await registerUser(page, email, password);
  await page.getByRole('button', { name: /logout/i }).click();
  await expect(page).toHaveURL('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('unauthenticated access to / redirects to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});

test('logout → redirects to /login', async ({ page }) => {
  await registerUser(page, uniqueEmail(), 'Test1234!');

  await page.getByRole('button', { name: /logout/i }).click();

  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});

test('invalid login credentials → shows error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@test.com');
  await page.getByLabel('Password').fill('wrongpass');
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});
