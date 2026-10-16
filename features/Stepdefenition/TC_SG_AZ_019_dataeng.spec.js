const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// the pre-configured (already analyzed) non-mainframe app we reuse
const APP_SEARCH = 'EndtoEndTest';
const APP_NAME   = 'NonMainframe';

async function shot(w, l) { try { if (l) w.attach(l, 'text/plain'); if (w.page) w.attach(await w.page.screenshot(), 'image/png'); } catch (e) {} }
function rand() { return Date.now().toString().slice(-5); }

// ---- And I open the data engineering application ----
When('I open the data engineering application', { timeout: 60000 }, async function () {
  const page = this.page;
  await page.getByRole('link', { name: 'App Modernization' }).click().catch(() => {});
  await page.getByRole('textbox', { name: 'Search' }).fill(APP_SEARCH);
  await page.waitForTimeout(1000);
  await page.getByText('View Apps').first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: APP_NAME })
    .or(page.getByText(APP_NAME)).first().click({ timeout: 25000 });
  await page.waitForTimeout(1200);
  this.appName = APP_NAME;
  await shot(this, `Opened app ${APP_NAME}`);
});

// ---- And I go to the data engineering phase ----  (Build Build -> Data Engineering)
When('I go to the data engineering phase', { timeout: 60000 }, async function () {
  const page = this.page;
  await page.getByRole('button', { name: 'Build Build' })
    .or(page.getByRole('button', { name: /Build/i })).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.getByText('Data Engineering').first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(this, 'Navigated to Data Engineering');
});


// ---- When I configure migration "test" ----
When('I configure migration {string}', { timeout: 90000 }, async function (base) {
  const page = this.page;
  this.migName = `${base}${rand()}`;

  const addBtn = page.getByRole('button', { name: 'Add migration configuration' })
    .or(page.getByRole('button', { name: /Configure Migration/i }));
  if (!(await addBtn.first().isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Build Build' })
      .or(page.getByRole('button', { name: /Build/i })).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.getByText('Data Engineering').first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
  }

  await addBtn.first().click({ timeout: 15000 });
  await page.locator('input[type="text"]').first().fill(this.migName);
  await page.getByRole('textbox', { name: 'Type here' }).nth(1).fill(`descrp for ${this.migName}`).catch(() => {});
  await page.getByRole('button', { name: 'Save' }).click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(this, `Configured migration ${this.migName}`);
});


// ---- Then the migration configuration should be created ----
Then('the migration configuration should be created', { timeout: 30000 }, async function () {
  await expect(this.page.getByRole('heading', { name: /Successfully created/i })
    .or(this.page.getByText(this.migName, { exact: false })).first()).toBeVisible({ timeout: 20000 });
  await this.page.getByRole('button', { name: /close|ok|done/i }).first().click().catch(() => {});
  await shot(this, `Migration configuration ${this.migName} created`);
});

// ---- When I try to add the same migration configuration again ----  (NEGATIVE)
When('I try to add the same migration configuration again', { timeout: 90000 }, async function () {
  const page = this.page;
  if (!(await page.getByRole('button', { name: 'Configure Migration' }).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Build Build' })
      .or(page.getByRole('button', { name: /Build/i })).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.getByText('Data Engineering').first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  await page.getByRole('button', { name: 'Configure Migration' }).click({ timeout: 15000 });
  await page.locator('input[type="text"]').first().fill(this.migName);   // SAME name
  await page.getByRole('textbox', { name: 'Type here' }).nth(1).fill(`descrp for ${this.migName}`).catch(() => {});
  await page.getByRole('button', { name: 'Save' }).click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(this, `Tried duplicate migration "${this.migName}"`);
});

// ---- Then the duplicate migration configuration should be rejected ----
Then('the duplicate migration configuration should be rejected', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(/A distribution with the name|already exists/i).first())
    .toBeVisible({ timeout: 15000 });
  await this.page.getByRole('button', { name: /cancel|close/i }).first().click({ timeout: 5000 }).catch(() => {});
  await this.page.keyboard.press('Escape').catch(() => {});
  await shot(this, 'Duplicate migration configuration rejected');
});
