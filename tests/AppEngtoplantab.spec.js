/*
import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('test', async ({ page }) => {
  await page.goto('https://azure-mt.skygrade.internal/');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('listitem').filter({ hasText: 'KeycloakSign in using' }).getByRole('button').click();
  const page1 = await page1Promise;
  await page1.getByRole('textbox', { name: 'Password' }).click();
  await page1.getByRole('textbox', { name: 'Password' }).fill('Skygrade@123');
  await page1.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('nmfcicd');
  await page.getByText('View Apps').click();
  await page.getByRole('button', { name: 'NMFCICD' }).click();
  await page.getByRole('button', { name: 'Build Build' }).click();
  await page.getByText('App Engineering').click();
  await expect(page.getByRole('heading', { name: 'Service Details' })).toBeVisible();
  const chipLabelSelector = '[class*="MuiChip-label"]';

  await page.locator(chipLabelSelector).first().waitFor({ state: 'visible' });

  const rawServices = await page.locator(chipLabelSelector).allTextContents();

  const services = rawServices
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log('Captured services:', services);
  console.log('Total count:', services.length);

  expect(services.length).toBeGreaterThan(0);

  const itemSelector = 'div:has(> img)';

  await page.locator(itemSelector).first().waitFor({ state: 'visible' });

  const items = await page.locator(itemSelector).all();

  const accelerators = [];
  for (const item of items) {
    const label = (await item.textContent())?.trim();
    const iconAlt = await item.locator('img').getAttribute('alt');
    const iconSrc = await item.locator('img').getAttribute('src');

    if (label) {
      accelerators.push({ name: label, iconAlt, iconSrc });
    }
  }

  console.log('Captured accelerators:', accelerators);
  console.log('Total count:', accelerators.length);

  const acceleratorNames = accelerators.map(a => a.name);
  console.log(acceleratorNames);

  expect(acceleratorNames.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Plan Plan' }).click();


  await expect(page.locator('div').filter({ hasText: /^Lift and Shift VM$/ }).first()).toBeVisible();
  await expect(page.getByText('Containerize App')).toBeVisible();
});
*/

import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

// Reusable structural extractor for accelerator-style items (img + text div)
async function getAccelerators(container) {
  const itemSelector = 'div:has(> img)';
  await container.locator(itemSelector).first().waitFor({ state: 'visible' });

  const items = await container.locator(itemSelector).all();
  const accelerators = [];

  for (const item of items) {
    const label = (await item.textContent())?.trim();
    if (label) accelerators.push(label);
  }

  return accelerators;
}

test('test', async ({ page }) => {
  await page.goto('https://azure-mt.skygrade.internal/');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('listitem').filter({ hasText: 'KeycloakSign in using' }).getByRole('button').click();
  const page1 = await page1Promise;
  await page1.getByRole('textbox', { name: 'Password' }).click();
  await page1.getByRole('textbox', { name: 'Password' }).fill('Skygrade@123');
  await page1.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('EndtoEndtest');
  await page.getByText('View Apps').click();
  await page.getByRole('button', { name: 'NMFrehost' }).click();
  await page.getByRole('button', { name: 'Build Build' }).click();
  await page.getByText('App Engineering').click();
  await expect(page.getByRole('heading', { name: 'Service Details' })).toBeVisible();

  // ---------------------------------------------------------
  // STEP 1: Capture Services (Chips) — resilient to prefix drift (v5- -> v6- etc.)
  // ---------------------------------------------------------
  const chipLabelSelector = '[class*="MuiChip-label"]';
  await page.locator(chipLabelSelector).first().waitFor({ state: 'visible' });

  const rawServices = await page.locator(chipLabelSelector).allTextContents();
  const services = rawServices.map(s => s.trim()).filter(s => s.length > 0);

  console.log('Captured services:', services);
  console.log('Total services count:', services.length);
  expect(services.length).toBeGreaterThan(0);

  // ---------------------------------------------------------
  // STEP 2: Capture Accelerators BEFORE clicking "Plan"
  // ---------------------------------------------------------
  const acceleratorsBefore = await getAccelerators(page.locator('body'));
  console.log('Accelerators before Plan click:', acceleratorsBefore);
  expect(acceleratorsBefore.length).toBeGreaterThan(0);

  // ---------------------------------------------------------
  // STEP 3: Click "Plan" and capture Accelerators AFTER
  // ---------------------------------------------------------
  await page.getByRole('button', { name: 'Plan Plan' }).click();

  // Scope to the flex-wrap container seen in the Plan screen HTML
  const planContainer = page.locator('div[style*="display: flex"][style*="flex-wrap: wrap"]');
  const acceleratorsAfter = await getAccelerators(planContainer);
  console.log('Accelerators after Plan click:', acceleratorsAfter);
  expect(acceleratorsAfter.length).toBeGreaterThan(0);

  // ---------------------------------------------------------
  // STEP 4: Dynamic comparison between before & after lists
  // ---------------------------------------------------------
  const normalize = value => value.trim().toLowerCase();
  const setBefore = new Set(acceleratorsBefore.map(normalize));
  const setAfter = new Set(acceleratorsAfter.map(normalize));

  const missing = acceleratorsBefore
    .map(normalize)
    .filter(x => !setAfter.has(x));
  const added = acceleratorsAfter
    .map(normalize)
    .filter(x => !setBefore.has(x));
  const matched = acceleratorsBefore
    .map(normalize)
    .filter(x => setAfter.has(x));

  console.log(' Matched:', matched);
  console.log(' Missing (was on Build page, not on Plan page):', missing);
  console.log(' Added (new on Plan page):', added);

  // Assert the two lists are identical regardless of order and case
  expect([...setBefore].sort()).toEqual([...setAfter].sort());

  await page.getByRole('button', { name: 'Build Build' }).click();

});