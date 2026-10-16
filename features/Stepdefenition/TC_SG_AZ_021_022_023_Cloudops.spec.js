const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs = require('fs'); const path = require('path');
const C = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test-data', 'cloudops.json'), 'utf8'));

async function shot(w, l) { try { if (l) w.attach(l, 'text/plain'); if (w.page) w.attach(await w.page.screenshot(), 'image/png'); } catch (e) {} }

// ---- shared: open the configured non-mainframe app ----
When('I open the configured application', { timeout: 120000 }, async function () {
  await this.page.getByRole('link', { name: 'App Modernization' }).click().catch(() => {});
  const search = this.page.getByRole('textbox', { name: 'Search' }).first();
  await search.waitFor({ state: 'visible', timeout: 5000 });
  await search.fill(C.app.search);
  await this.page.waitForTimeout(1500);
  await this.page.getByText('View Apps').nth(C.app.viewAppsIndex ?? 0).click({ timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(1000);
  await this.page.getByRole('button', { name: C.app.name }).click({ timeout: 20000 });
  await this.page.waitForTimeout(1500);
  await this.page.getByRole('button', {name : 'Cloud Ops Cloud Ops'}).click({ timeout: 15000 }).catch(() => {});
  await shot(this, `Opened app ${C.app.name}`);
});

// ---- shared: go to a phase (Data Engineering / Observability / Security / FinOps) ----
When('I go to the {string} phase', { timeout: 60000 }, async function (phase) {
  await this.page.getByRole('button', {name : 'Cloud Ops Cloud Ops'}).click({ timeout: 15000 }).catch(() => {});
  await this.page.getByText(phase, { exact: true }).first().click({ timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(1500);
  await shot(this, `Phase: ${phase}`);
});

// ===================== OBSERVABILITY =====================
When('I edit observability tags', { timeout: 60000 }, async function () {
  await this.page.getByRole('button', { name: /edit tag/i }).first().click({ timeout: 15000 }).catch(() => {});
  await this.page.getByRole('textbox').first().fill(C.observability.key).catch(() => {});
  await this.page.getByRole('textbox').nth(1).fill(C.observability.value).catch(() => {});
  await this.page.getByRole('button', { name: 'Update' }).click({ timeout: 10000 }).catch(() => {});
  await this.page.waitForTimeout(1500);
  await shot(this, 'Observability tags updated');
});
Then('the application log details should be visible', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(/Application Log details/i).first()).toBeVisible({ timeout: 30000 });
  await shot(this, 'Application Log details visible');
});

// ===================== SECURITY =====================
When('I edit security tags', { timeout: 60000 }, async function () {
  await this.page.getByRole('button', { name: /edit.*tag/i }).first().click({ timeout: 15000 }).catch(() => {});
  const tags = C.security.tags || [];
  for (let i = 0; i < tags.length; i++) {
    await this.page.getByRole('textbox').nth(i).fill(tags[i]).catch(() => {});
  }
  await this.page.getByRole('button', { name: 'Update' }).click({ timeout: 10000 }).catch(() => {});
  await this.page.waitForTimeout(1500);
  await shot(this, 'Security tags updated');
});
Then('the cloud security alerts should be visible', { timeout: 30000 }, async function () {
  await expect(
    this.page.getByRole('heading', { name: /Cloud Security Alerts/i })
      .or(this.page.getByText(/No alerts available|Cloud Security Alerts/i)).first()
  ).toBeVisible({ timeout: 20000 });
  await shot(this, 'Cloud security alerts visible');
});

// ===================== FINOPS =====================
When('I edit finops tags', { timeout: 60000 }, async function () {
  await this.page.getByRole('button', { name: /edit.*tag/i }).first().click({ timeout: 15000 }).catch(() => {});
  await this.page.getByRole('textbox').first().fill(C.finops.app).catch(() => {});
  //await this.page.getByRole('textbox').nth(1).fill(C.finops.unit).catch(() => {});
  await this.page.getByRole('button', { name: /save|update/i }).first().click({ timeout: 10000 }).catch(() => {});
  await this.page.waitForTimeout(1500);
  await shot(this, 'FinOps tags updated');
});
Then('the finops cost details should be visible', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(/Fin Ops Details|Total Cost/i).first()).toBeVisible({ timeout: 20000 });
  await shot(this, 'FinOps cost details visible');
});
