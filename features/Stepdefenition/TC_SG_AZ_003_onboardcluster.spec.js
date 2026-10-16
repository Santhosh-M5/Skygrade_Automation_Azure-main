const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const path = require('path');
const state = require('../../support/state');
const fs = require('fs');
const os = require('os');

// ---- Helpers (module-level) ------------------------------------------------

async function snap(world, name = 'step') {
  try {
    const buffer = await world.page.screenshot({ fullPage: true });
    world.attach(buffer, 'image/png');
  } catch (e) {}
}

const APP_URL = process.env.BASE_URL ? 'https://mt.skygrade.internal' : 'https://mt.skygrade.internal';
const csvPath = (file) => path.resolve(__dirname, '../../test-data', file);

async function closeDialog(page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: /close|ok|done|got it|continue|proceed/i })
      .first().click({ timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

function freshValidCsv() {
  const lines = fs.readFileSync(csvPath('onboarding-valid.csv'), 'utf8').trim().split(/\r?\n/);
  const header = lines[0];
  const cells  = lines[1].split(',');
  const appName = `NerdDinner_${Date.now()}`;
  cells[0] = appName;
  const tmp = path.join(os.tmpdir(), `onboarding-${Date.now()}.csv`);
  fs.writeFileSync(tmp, `${header}\n${cells.join(',')}\n`);
  return { tmp, appName };
}

// Returns header array + data cells array for dynamic CSV generation
function readBaseCsv() {
  const lines = fs.readFileSync(csvPath('onboarding-valid.csv'), 'utf8').trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const cells   = lines[1].split(',');
  return { headers, cells, headerLine: lines[0] };
}

// Finds column index by header name (case-insensitive)
function col(headers, name) {
  const i = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  if (i === -1) throw new Error(`Column "${name}" not found in CSV headers`);
  return i;
}

function writeTmpCsv(headerLine, cells) {
  const tmp = path.join(os.tmpdir(), `onboarding-${Date.now()}.csv`);
  fs.writeFileSync(tmp, `${headerLine}\n${cells.join(',')}\n`);
  return tmp;
}

// ---- Steps -----------------------------------------------------------------

Given('I create a new portfolio', async function () {
  const name = `QAAutTest_${Math.floor(Math.random() * 1000)}`;
  await this.page.getByRole('button', { name: 'Create Portfolio' }).click();
  await this.page.getByPlaceholder('Type here').first().fill(name);
  await this.page.getByRole('button', { name: 'Create Portfolio' }).last().click();
  state.portfolioName = name;
  this.attach(`Portfolio created: ${name}`, 'text/plain');
});

When('I open the Onboard Cluster panel', { timeout: 30000 }, async function () {
  const page = this.page;
  await closeDialog(page);
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByText(/created|success/i).first().waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(800);

  const btn = page.getByRole('button', { name: 'Onboard Cluster' });
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  try {
    await btn.click({ timeout: 8000 });
  } catch {
    await btn.click({ force: true, timeout: 8000 });
  }
  await page.waitForTimeout(500);
  await snap(this);
});

When('I select the existing portfolio {string}', async function (name) {
  await this.page.getByRole('button', { name: 'Select' }).click();
  await this.page.locator('form').getByText(name).first().click();
  state.portfolioName = name;
  await snap(this);
});

When('I select the portfolio I created', async function () {
  await this.page.getByRole('button', { name: 'Select' }).click();
  await this.page.locator('form').getByText(state.portfolioName).first().click();
  await snap(this);
});

When('I enter a unique cluster name', async function () {
  state.clusterName = `QACluster_${Math.floor(Math.random() * 1000)}`;
  await this.page.getByRole('textbox', { name: 'Enter cluster name' }).fill(state.clusterName);
  this.attach(`Cluster name used: ${state.clusterName}`, 'text/plain');
});

When('I enter the cluster name {string}', async function (base) {
  await this.page.getByRole('textbox', { name: 'Enter cluster name' }).fill(base);
});

When('I enter the cluster description {string}', async function (desc) {
  await this.page.getByRole('textbox', { name: 'Enter cluster description' }).fill(desc);
  await snap(this);
});

When('I upload a fresh valid application CSV', async function () {
  const { tmp, appName } = freshValidCsv();
  state.appName = appName;
  await this.page.locator('input[type="file"]').setInputFiles(tmp);
  await snap(this);
});

Then('the CSV should be accepted', async function () {
  await expect(this.page.getByText(/invalid|is required|already exists|error/i)).toHaveCount(0);
});

When('I upload the application CSV {string}', async function (file) {
  let filePath;

  if (file === 'onboarding-duplicate.csv' && state.appName) {
    const lines = fs.readFileSync(csvPath('onboarding-valid.csv'), 'utf8').trim().split(/\r?\n/);
    const header = lines[0];
    const cells  = lines[1].split(',');
    cells[0]     = state.appName;
    const tmp = path.join(os.tmpdir(), `onboarding-dup-${Date.now()}.csv`);
    fs.writeFileSync(tmp, `${header}\n${cells.join(',')}\n`);
    filePath = tmp;
    this.attach(`Duplicate app name used: ${state.appName}`, 'text/plain');
  } else {
    filePath = csvPath(file);
  }

  await this.page.locator('input[type="file"]').setInputFiles(filePath);
  await this.page.waitForTimeout(2000);
  await snap(this);
});

// Upload CSV with an invalid SCM value (anything other than GitHub)
When('I upload a CSV with SCM {string}', async function (scm) {
  const { headers, cells, headerLine } = readBaseCsv();
  cells[col(headers, 'App Name')] = `SCMTest_${Date.now()}`;
  cells[col(headers, 'SCM')]      = scm;

  const tmp = writeTmpCsv(headerLine, cells);
  this.attach(`SCM value used: ${scm}`, 'text/plain');

  await this.page.locator('input[type="file"]').setInputFiles(tmp);
  await this.page.waitForTimeout(2000);
  await snap(this);
});

// Upload CSV where current and target platform are the same (provider may also be same — that is allowed)
When('I upload a CSV with same platform {string} and {string}', async function (provider, platform) {
  const { headers, cells, headerLine } = readBaseCsv();
  cells[col(headers, 'App Name')]         = `SamePlat_${Date.now()}`;
  cells[col(headers, 'Current Provider')] = provider;
  cells[col(headers, 'Current Platform')] = platform;
  cells[col(headers, 'Target Provider')]  = provider;
  cells[col(headers, 'Target Platform')]  = platform;

  const tmp = writeTmpCsv(headerLine, cells);
  this.attach(`Same platform: ${provider} / ${platform}`, 'text/plain');

  await this.page.locator('input[type="file"]').setInputFiles(tmp);
  await this.page.waitForTimeout(2000);
  await snap(this);
});

Then('an error popup should be shown', async function () {
  const error = this.page
    .getByText(/already exists|is required|cannot be empty|invalid|duplicate|identical|github|scm/i)
    .first();
  await expect(error).toBeVisible({ timeout: 15000 });
  await snap(this);
});

When('I onboard the cluster', async function () {
  await this.page.locator('form').getByRole('button', { name: 'Onboard Cluster' }).click();
});

Then('the cluster should be onboarded successfully', { timeout: 60000 }, async function () {
  const success = this.page.getByText(/onboarded successfully|successfully onboarded|success/i).first()
    .or(this.page.getByRole('heading', { name: /success/i }))
    .or(this.page.getByRole('alert'));
  await expect(success).toBeVisible({ timeout: 30000 });
  try { this.attach(await this.page.screenshot(), 'image/png'); } catch (e) {}
  await this.page.getByRole('button', { name: /close|ok|done/i }).first().click({ timeout: 5000 }).catch(() => {});
});
