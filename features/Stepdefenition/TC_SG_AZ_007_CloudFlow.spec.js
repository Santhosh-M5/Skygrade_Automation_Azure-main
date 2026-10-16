const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function load(name) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test-data', name), 'utf-8'));
}
const D  = load('cloud.json');
const RBAC = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/rbac-data.json'), 'utf8'));
const AZ = D.azure;

async function shot(world, label) {
  try { world.attach(label, 'text/plain'); world.attach(await world.page.screenshot(), 'image/png'); } catch (e) {}
}
function rand() { return Date.now().toString().slice(-5); }

async function openCloudSettings(page) {
  // CHANGED: navigate straight to Cloud Settings URL — no sidebar/Settings-toggle interaction.
  await page.goto(RBAC.appUrl.replace(/\/+$/, '') + '/skygrade-cloud-settings', { waitUntil: 'domcontentloaded' });
  await page.getByText('Cloud Settings').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
}


async function openProvider(page, provider) {
  const text = /azure/i.test(provider) ? /azure/i : /amazon web services|^AWS$/i;
  await page.getByText(text).first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function expandAccount(page) {
  const addLoc = page.getByRole('button', { name: /add cluster/i }).first();
  if (await addLoc.isVisible().catch(() => false)) return true;
  await page.getByText('▽').nth(3).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  if (await addLoc.isVisible().catch(() => false)) return true;
  const tri = page.getByText('▽');
  const n = await tri.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
    await tri.nth(i).click().catch(() => {});
    await page.waitForTimeout(600);
    if (await addLoc.isVisible().catch(() => false)) return true;
  }
  return false;
}

async function addCluster(page, name, region) {
  await expandAccount(page);
  const addBtn = page.getByRole('button', { name: /add cluster/i }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 15000 });
  await addBtn.click({ timeout: 15000 });
  await page.waitForTimeout(800);

  const nameBox = page.getByRole('textbox').first();
  await nameBox.waitFor({ state: 'visible', timeout: 20000 });
  await nameBox.fill(name);

  const regionSelect = page.getByRole('combobox').first();
  await regionSelect.click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: new RegExp('^' + region, 'i') }).first().click();
  await page.waitForTimeout(400);

  const save = page.getByRole('button', { name: /^(add|save|create)( cluster)?$/i }).last();
  await save.click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// ---- Edit Plan MUI dropdowns (fixed order) ----
// 0 Modernisation Disposition | 1 Current Provider | 2 Current Platform
// 3 Target Provider | 4 Target Platform | 5 Account/Subscription | 6 Target Cluster | 7 Region/Location
const PLAN = { targetProvider: 3, targetPlatform: 4, account: 5, cluster: 6 };

async function muiPick(page, index, value) {
  const c = page.getByRole('combobox').nth(index);
  await c.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: new RegExp('^' + value, 'i') })
    .or(page.locator(`li[role="option"][data-value="${value}"]`)).first()
    .click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}
// pick an option that CONTAINS the value (option text may be like "dynamic (<id>)")
async function muiPickContains(page, index, value) {
  const c = page.getByRole('combobox').nth(index);
  await c.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('option', { name: new RegExp(value, 'i') }).first()
    .click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}
async function comboText(page, index) {
  return ((await page.getByRole('combobox').nth(index).textContent().catch(() => '')) || '').trim();
}
async function dumpCombos(world, header) {
  const combos = world.page.getByRole('combobox');
  const n = await combos.count().catch(() => 0);
  let dump = `${header} (comboboxes=${n})\n`;
  for (let i = 0; i < n; i++) {
    const t = ((await combos.nth(i).textContent().catch(() => '')) || '').trim().slice(0, 40);
    dump += `#${i}: "${t}"\n`;
  }
  await shot(world, dump);
}

// ====================================================================
// NAVIGATION
// ====================================================================
When('I open Settings Cloud', async function () {
  const page = this.page;
  // CHANGED: go straight to the Cloud Settings URL — no sidebar/Settings-toggle interaction,
  // so a collapsed sidebar after the first creation can't block us.
  await page.goto(RBAC.appUrl.replace(/\/+$/, '') + '/skygrade-cloud-settings', { waitUntil: 'domcontentloaded' });
  await page.getByText('Cloud Settings').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shot(this, 'Opened Settings > Cloud');
});

When('I open Add Account for {string}', async function (provider) {
  const page = this.page;
  // Select the provider tile FIRST — Azure needs this before "+ Add Account" renders.
  const tile = /azure/i.test(provider)
    ? page.getByText(/Microsoft Azure/i).first()   // "AzureMicrosoft Azure cloud"
    : page.getByText(/AWS|Amazon/i).first();        // AWS tile
  await tile.click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);

  const addBtn = page.getByRole('button', { name: /\+?\s*add account/i }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 15000 });   // wait so it's not flaky on first scenario
  await addBtn.click({ timeout: 15000 });

  await shot(this, `Add Account form (${provider})`);
});



When('I open the {string} provider', { timeout: 60000 }, async function (provider) {
  await openProvider(this.page, provider);
  await shot(this, `Opened provider ${provider}`);
});

// ====================================================================
// AWS — ACCOUNT + CLUSTER
// ====================================================================
When('I add the AWS cloud account from data', { timeout: 60000 }, async function () {
  await this.page.locator('input[maxlength="50"]').first().fill(D.account.name);
  await this.page.locator('input[maxlength="12"]').first().fill(D.account.id);
  await this.page.getByRole('textbox', { name: /arn:aws/i }).first().fill(D.account.arn);
  await this.page.waitForTimeout(800);
  await shot(this, 'AWS account form filled');
  const add = this.page.getByRole('button', { name: /^add account$/i }).last();
  const dup = await this.page.getByText(/already exists/i).first().isVisible().catch(() => false);
  const enabled = await add.isEnabled().catch(() => false);
  if (enabled && !dup) {
    await add.click(); await this.page.waitForTimeout(2000);
    await shot(this, `AWS account ${D.account.id} added`);
  } else {
    await this.page.getByRole('button', { name: /^(cancel|close)$/i }).first().click().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(800);
    await shot(this, `AWS account ${D.account.id} already exists`);
  }
});

Then('the cloud account should exist', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(D.account.id, { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await shot(this, 'AWS account exists');
});

When('I enter an AWS account with a duplicate Account ID', { timeout: 60000 }, async function () {
  await this.page.locator('input[maxlength="50"]').first().fill(D.account.name);
  await this.page.locator('input[maxlength="12"]').first().fill(D.duplicateAccountId || D.account.id);
  await this.page.getByRole('textbox', { name: /arn:aws/i }).first().fill(D.account.arn);
  await this.page.waitForTimeout(1000);
  await shot(this, 'Entered duplicate Account ID');
});

// Then('I should see the error {string}', { timeout: 30000 }, async function (msg) {
//   await expect(this.page.getByText(msg, { exact: false }).first()).toBeVisible({ timeout: 15000 });
//   await shot(this, `Error: ${msg}`);
// });

Then('the {string} submit should be disabled', { timeout: 30000 }, async function (label) {
  const btn = this.page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).last();
  await expect(btn).toBeDisabled({ timeout: 10000 });
  await shot(this, `${label} disabled`);
});

When('I add the AWS cluster from data', { timeout: 90000 }, async function () {
  this.clusterName = `${D.cluster.name || 'Cluster'}${rand()}`;
  await addCluster(this.page, this.clusterName, D.cluster.region);
  await shot(this, `AWS cluster ${this.clusterName} saved`);
});

When('I try to add the same AWS cluster again', { timeout: 90000 }, async function () {
  await addCluster(this.page, this.clusterName, D.cluster.region);
  await shot(this, `Re-added same AWS cluster ${this.clusterName}`);
});

Then('the cluster should exist', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(this.clusterName, { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await shot(this, `Cluster ${this.clusterName} exists`);
});

Then('the cluster should be rejected as duplicate', { timeout: 30000 }, async function () {
  await expect(this.page.getByText(/already exists/i).first()).toBeVisible({ timeout: 15000 });
  await shot(this, 'Duplicate cluster rejected');
});

// ====================================================================
// AZURE — ACCOUNT + CLUSTER
// ====================================================================
When('I add the Azure cloud account from data', { timeout: 60000 }, async function () {
  const drawer = this.page.locator('.v5-MuiDrawer-paper');

  // Find the input that sits right after the label div with this exact text
  const field = (label) =>
    drawer.locator(`xpath=.//div[normalize-space(text())="${label}"]/following-sibling::div//input`);

  await field('Tenant Name').fill(AZ.account.name);
  await field('Tenant ID').fill(AZ.account.tenantId);
  await field('Subscription ID').fill(AZ.account.subscriptionId);
  await field('Azure Service Connection').fill(AZ.account.serviceConnection);

  const add = drawer.getByRole('button', { name: /^add account$/i });
  const dup = await this.page.getByText(/already exists/i).first().isVisible().catch(() => false);
  const enabled = await add.isEnabled().catch(() => false);

  if (enabled && !dup) {
    await add.click();
    await this.page.waitForTimeout(2000);
    await shot(this, 'Azure account added');
  } else {
    await drawer.getByRole('button', { name: /^(cancel|close)$/i }).first().click().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await shot(this, 'Azure account exists / closed');
  }
});


Then('the Azure cloud account should exist', { timeout: 30000 }, async function () {
  await expect(
    this.page.getByText(AZ.account.subscriptionId, { exact: true }).first()
  ).toBeVisible({ timeout: 15000 });
  await shot(this, 'Azure account exists');
});

When('I add the Azure cluster from data', { timeout: 90000 }, async function () {
  this.clusterName = `AzCluster${rand()}`;
  await addCluster(this.page, this.clusterName, AZ.region);
  await shot(this, `Azure cluster ${this.clusterName} saved`);
});

When('I try to add the same Azure cluster again', { timeout: 90000 }, async function () {
  await addCluster(this.page, this.clusterName, AZ.region);
  await shot(this, `Re-added same Azure cluster ${this.clusterName}`);
});

// ====================================================================
// EDIT PLAN  (MUI dropdowns)
// ====================================================================
When('I open Edit Plan for the configured app', { timeout: 120000 }, async function () {
  const e = D.editPlan;
  const search = this.page.getByRole('textbox', { name: 'Search' }).or(this.page.getByPlaceholder(/search/i)).first();
  const portfolioAnalysis = this.page.getByRole('link', { name: 'Portfolio Analysis' });
  const appModernization = this.page.getByRole('button', { name: 'App Modernization' });
  const modernization = this.page.getByRole('button', { name: 'Modernization' }).first();

// Make sure the sidebar has rendered before checking (isVisible doesn't wait)
await modernization.waitFor({ state: 'visible' });

if (await portfolioAnalysis.isVisible()) {
    // Fully expanded already: click the target directly
    await portfolioAnalysis.click();
} else if (await appModernization.isVisible()) {
    // Only Modernization is open: expand App Modernization first
    await appModernization.click();
    await portfolioAnalysis.click();
} else {
    // Everything collapsed: open from the top
    await modernization.click();
    await appModernization.click();
    await portfolioAnalysis.click();
}

  await search.waitFor({ state: 'visible', timeout: 30000 });
  await search.fill(e.search);
  await this.page.waitForTimeout(1500);
  await this.page.getByText('View Apps').first().click({ timeout: 15000 });
  await this.page.getByRole('button', { name: e.app }).click({ timeout: 20000 });
  await this.page.waitForTimeout(1500);
  await shot(this, `Opened app ${e.app}`);

  await this.page.getByRole('button', { name: 'Previous' }).click({ timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(800);
  await this.page.getByRole('button', { name: 'Previous' }).click({ timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(800);
  await this.page.getByRole('button', { name: 'Edit Plan' }).click({ timeout: 20000 });
  await this.page.waitForTimeout(1500);
  await shot(this, 'Opened Edit Plan');
});

When('I configure the plan for {string} with target {string}', { timeout: 90000 }, async function (cloud, target) {
  this.planCloud = cloud;
  await muiPick(this.page, PLAN.targetProvider, cloud);
  await muiPick(this.page, PLAN.targetPlatform, target);
  await this.page.waitForTimeout(800);
  await shot(this, `Plan: provider=${cloud}, target=${target}`);
});

When('I select cloud provider {string} and target provider {string}', { timeout: 90000 }, async function (cloud, target) {
  this.planCloud = cloud;
  await muiPick(this.page, PLAN.targetProvider, cloud);
  await muiPick(this.page, PLAN.targetPlatform, target);

  const isAzure = /azure/i.test(cloud);
  const accountLabel = isAzure ? 'Subscription ID' : 'Account ID';
  const accountValue = isAzure ? AZ.account.subscriptionId : D.account.id;

  // 1. Let the previous dropdown fully close before touching the next one
  await this.page.locator('ul[role="listbox"]').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await this.page.locator('.v5-MuiBackdrop-root:visible').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

  const accountField = this.page
    .locator(`div:has(> label:has-text("${accountLabel}"))`)
    .locator('[role="combobox"]')
    .first();

  const accountShown = await accountField
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (accountShown) {
    const listbox = this.page.locator('ul[role="listbox"]');
    const wanted = listbox.locator(`li[role="option"][data-value="${accountValue}"]`);
    const anyOption = listbox.locator('li[role="option"]').first();
    let picked = false;

    for (let attempt = 1; attempt <= 3 && !picked; attempt++) {
      await accountField.click();

      const opened = await listbox
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (opened) {
        // prefer the account from the JSON, fall back to the first option
        const target = (await wanted.count()) > 0 ? wanted.first() : anyOption;
        await target.click();
        picked = true;
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
    }

    if (!picked) {
      await shot(this, `Account dropdown did not open (${cloud}/${target})`);
      throw new Error(`${accountLabel} dropdown did not open for ${cloud}/${target}`);
    }

    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  await this.page.waitForTimeout(1200);
  await shot(this, `Selected provider=${cloud}, target=${target} (account field shown: ${accountShown})`);
});

Then('the cloud account should be selectable in the plan', { timeout: 60000 }, async function () {
  const txt = await comboText(this.page, PLAN.account);
  if (!txt) await dumpCombos(this, 'account combobox empty');
  await shot(this, `Account/Subscription: "${txt}"`);
  expect(txt.length, 'account should have a value').toBeGreaterThan(0);
});

Then('the target cluster should be selectable in the plan', { timeout: 60000 }, async function () {
  const txt = await comboText(this.page, PLAN.cluster);
  if (!txt) await dumpCombos(this, 'cluster combobox empty');
  await shot(this, `Target Cluster: "${txt}"`);
  expect(txt.length, 'target cluster should have a value').toBeGreaterThan(0);
});

Then('the target cluster dropdown should be {string}', { timeout: 60000 }, async function (state) {
  await this.page.waitForTimeout(1500);
  const c = this.page.locator('xpath=//*[normalize-space(text())="Target Cluster"]/following::*[@role="combobox"][1]').first();
  const visible = await c.isVisible().catch(() => false);
  const ariaDisabled = visible ? await c.getAttribute('aria-disabled').catch(() => null) : null;
  const cls = visible ? ((await c.getAttribute('class').catch(() => '')) || '') : '';
  const disabled = !visible || ariaDisabled === 'true' || /Mui-disabled/i.test(cls);
  const result = disabled ? 'disabled' : 'enabled';
  await shot(this, `target cluster dropdown -> ${result} (expected ${state})  [visible:${visible} aria:${ariaDisabled}]`);
  expect(result).toBe(state.toLowerCase());
});

// ====================================================================
// RBAC boundary
// ====================================================================
Then('the Add Account action should be denied', { timeout: 60000 }, async function () {
  await openCloudSettings(this.page);
  await openProvider(this.page, 'AWS');
  const add = this.page.getByRole('button', { name: /add account/i }).first();
  const visible = await add.isVisible().catch(() => false);
  const enabled = visible ? await add.isEnabled().catch(() => false) : false;
  let tooltip = '';
  if (visible) {
    tooltip = await add.evaluate(el => {
      let n = el;
      for (let i = 0; i < 6 && n; i++) {
        const ti = n.getAttribute && n.getAttribute('title');
        if (ti && /do not have permission/i.test(ti)) return ti;
        n = n.parentElement;
      }
      return '';
    }).catch(() => '');
    await add.hover().catch(() => {});
    await this.page.waitForTimeout(400);
  }
  const denied = !visible || !enabled || !!tooltip;
  await shot(this, `Add Account denied -> visible:${visible} enabled:${enabled} tooltip:${tooltip || '(none)'}`);
  expect(denied).toBe(true);
});
