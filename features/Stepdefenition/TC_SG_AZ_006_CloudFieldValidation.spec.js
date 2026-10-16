const { Given, When, Then, After } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const RBAC = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/rbac-data.json'), 'utf8'));
const D    = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/cloud.json'), 'utf8'));

async function shot(w, l){ try{ if(l) w.attach(l,'text/plain'); if(w.page) w.attach(await w.page.screenshot(),'image/png'); }catch(e){} }

// random GUID so the Subscription ID is unique every run
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── AZURE account-form field locators ────────────────────────────────────────
const azNameField   = (p) => p.getByRole('textbox').first();                                 // Tenant Name
const azGuidFields  = (p) => p.getByRole('textbox', { name: /xxxxxxxx-xxxx-xxxx-xxxx-/i });  // both GUID boxes
const azTenantField = (p) => azGuidFields(p).first();                                        // Tenant ID
const azSubField    = (p) => azGuidFields(p).nth(1);                                          // Subscription ID
const azServiceConn = (p) => p.getByRole('textbox').nth(3);                                   // Service Connection

// Delete an Azure cloud account by a unique key (subscription id or account name).
async function deleteAzureAccount(page, key) {
  await page.goto(RBAC.appUrl.replace(/\/+$/, '') + '/skygrade-cloud-settings', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.getByText(/Microsoft Azure/i).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);

  const row = page.getByRole('row').filter({ hasText: key }).first();
  if (!(await row.isVisible({ timeout: 5000 }).catch(() => false))) return false;

  await row.getByRole('checkbox').first().check({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /delete/i }).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: /^Yes$|Confirm/i }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

// ── Login (Keycloak popup — azure-mt) ────────────────────────────────────────
Given(/^I log in as (.+)$/, { timeout: 120000 }, async function (role) {
  const u = RBAC.users[role.trim()];
  if (!u) throw new Error(`No user "${role}" in rbac-data.json`);
  const page = this.page;
  await page.goto(RBAC.appUrl, { waitUntil: 'domcontentloaded' });

  const landing = page.getByRole('button', { name: 'Create Portfolio' })
    .or(page.getByRole('button', { name: 'Settings' })).first();
  if (await landing.isVisible({ timeout: 4000 }).catch(() => false)) { await shot(this, 'Already logged in'); return; }

  const keycloakBtn = page.getByRole('listitem').filter({ hasText: /Keycloak/i }).getByRole('button');
  const popupPromise = page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);
  await keycloakBtn.click().catch(() => {});
  const popup = await popupPromise;
  if (popup) {
    await popup.getByRole('textbox', { name: 'Username or email' }).fill(u.username);
    await popup.getByRole('textbox', { name: 'Password' }).fill(u.password);
    await popup.getByRole('button', { name: 'Sign In' }).click();
  }
  await landing.waitFor({ state: 'visible', timeout: 60000 });
  await shot(this, `Logged in as ${role}`);
});

// ── Individual field fills ────────────────────────────────────────────────────
When('I fill Azure Account Name {string}', async function (v) {
  await azNameField(this.page).fill(v); await this.page.waitForTimeout(300);
});
When('I fill Azure Tenant ID {string}', async function (v) {
  await azTenantField(this.page).fill(v); await this.page.waitForTimeout(300);
});
When('I fill Azure Subscription ID {string}', async function (v) {
  await azSubField(this.page).fill(v); await this.page.waitForTimeout(300);
});
When('I fill Azure Service Connection {string}', async function (v) {
  await azServiceConn(this.page).fill(v); await this.page.waitForTimeout(300);
});

// ── Valid unique account ──────────────────────────────────────────────────────
When('I enter a unique Azure account', async function () {
  const a = D.azure.account;
  const suffix = Date.now().toString().slice(-4);
  this.acctName = `${a.name}${suffix}`;
  this.subId    = uuid();                                   // unique → avoids "Subscription ID already exists"
  await azNameField(this.page).fill(this.acctName);
  await azTenantField(this.page).fill(a.tenantId);
  await azSubField(this.page).fill(this.subId);
  await azServiceConn(this.page).fill(a.serviceConnection);
  await this.page.waitForTimeout(400);
  await shot(this, `Entered Azure account ${this.acctName} / sub ${this.subId}`);
});

// duplicate Subscription ID (uses the fixed value from data so it collides on purpose)
When('I enter an Azure account with a duplicate Subscription ID', async function () {
  const a = D.azure.account;
  this.acctName = `${a.name}${Date.now().toString().slice(-4)}`;
  await azNameField(this.page).fill(this.acctName);
  await azTenantField(this.page).fill(a.tenantId);
  await azSubField(this.page).fill(a.subscriptionId);       // known existing id → "already exists"
  await azServiceConn(this.page).fill(a.serviceConnection);
  await this.page.waitForTimeout(400);
  await shot(this, `Entered duplicate Azure Subscription ID ${a.subscriptionId}`);
});

// ── Submit / result ────────────────────────────────────────────────────────────
When('I submit the account', async function () {
  await this.page.getByRole('button', { name: /^add account$/i }).last().click({ timeout: 15000 });
  await this.page.waitForTimeout(2000);
  await shot(this, 'Submitted account');
});

Then('the account should be added successfully', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(/added successfully/i).first()).toBeVisible({ timeout: 20000 });
  await shot(this, 'Account added successfully');
});

// ── Submit enabled ──────────────────────────────────────────────────────────────
Then('the {string} submit should be enabled', { timeout: 30000 }, async function (label) {
  const btn = this.page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).last();
  await expect(btn).toBeEnabled({ timeout: 10000 });
  await shot(this, `${label} enabled`);
});

// ── Validation / inline error ────────────────────────────────────────────────────
Then('I should see the validation message {string}', { timeout: 30000 }, async function (msg) {
  await expect(this.page.getByText(msg, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  await shot(this, `Validation: ${msg}`);
});
Then('I should see the error {string}', { timeout: 30000 }, async function (msg) {
  await expect(this.page.getByText(msg, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  await shot(this, `Error: ${msg}`);
});

// ── maxlength checks (Tenant/Subscription are GUIDs = 36 chars; Name = 50) ──────
When('I type {int} characters into the Azure Subscription ID', async function (n) {
  const f = azSubField(this.page); await f.click();
  await f.pressSequentially('1'.repeat(n), { delay: 10 });
  await this.page.waitForTimeout(300);
});
Then('the Azure Subscription ID should hold at most {int} characters', async function (max) {
  const val = await azSubField(this.page).inputValue();
  await shot(this, `Subscription ID length = ${val.length}`);
  expect(val.length).toBeLessThanOrEqual(max);
});

When('I type {int} characters into the Azure Account Name', async function (n) {
  const f = azNameField(this.page); await f.click();
  await f.pressSequentially('a'.repeat(n), { delay: 5 });
  await this.page.waitForTimeout(300);
});
Then('the Azure Account Name should hold at most {int} characters', async function (max) {
  const val = await azNameField(this.page).inputValue();
  await shot(this, `Account Name length = ${val.length}`);
  expect(val.length).toBeLessThanOrEqual(max);
});

// ── Teardown: delete any Azure account created during the scenario ──────────────
After({ tags: '@azure-field-validation' }, async function () {
  const key = this.subId || this.acctName;
  if (!key) return;                                  // negative scenarios created nothing
  const removed = await deleteAzureAccount(this.page, key).catch(() => false);
  await shot(this, removed ? `Teardown: deleted Azure account ${key}` : `Teardown: nothing to delete (${key})`);
});
