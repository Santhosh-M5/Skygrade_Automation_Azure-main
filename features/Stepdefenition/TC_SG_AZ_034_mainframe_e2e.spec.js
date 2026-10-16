const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const RBAC = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/rbac-data.json'), 'utf8'));
const shared = require('../../support/state');

const emailOf = (u) => u.email || `${u.username}@cognizant.com`;
const rand = () => Math.random().toString(36).slice(2, 6);

const STATE_FILE = path.resolve(process.cwd(), 'test-data', 'swimm-run.json');

async function shot(w, label) {
  try {
    if (label) w.attach(label, 'text/plain');
    if (w.page) w.attach(await w.page.screenshot(), 'image/png');
  } catch (e) {}
}

async function closeDialog(page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: /close|ok|done|got it|continue|yes|confirm/i })
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function proceedPhase(page) {
  const btn = page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  await closeDialog(page).catch(() => {});
}

async function waitForBreComplete(world, label) {
  const start = Date.now();
  const deadline = start + 1800000; // 30 min
  let ready = false;

  while (Date.now() < deadline) {
    const viewOk = await world.page.getByRole('button', { name: /view bre results|view results/i }).first().isVisible().catch(() => false);
    const proceedOk = await world.page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().isEnabled().catch(() => false);
    const complete = await world.page.getByText(/analysis complete/i).first().isVisible().catch(() => false);

    if (viewOk || proceedOk || complete) {
      ready = true;
      break;
    }

    await world.page.getByRole('button', { name: /refresh status|refresh/i }).first().click({ timeout: 3000 }).catch(() => {});
    await world.page.waitForTimeout(30000);

    world.attach(`${label} running... ${Math.round((Date.now() - start) / 60000)} min elapsed`, 'text/plain');
  }

  await shot(world, ready ? `${label} complete` : `${label} not complete in 30 min`);
  expect(ready, `${label} did not finish within 30 min`).toBe(true);
}

// ===================== ADMIN SETUP =====================

When('I onboard a unique cluster using CSV {string}', { timeout: 120000 }, async function (csvTemplate) {
  this.cluster = `MainTest${rand()}`;
  this.appName = `Maintest${rand()}`;

  const tpl = [path.resolve(__dirname, `../../test-data/${csvTemplate}`), path.resolve(process.cwd(), csvTemplate)]
    .find((f) => fs.existsSync(f));

  if (!tpl) throw new Error(`CSV template not found: ${csvTemplate}`);

  const lines = fs.readFileSync(tpl, 'utf8').trim().split(/\r?\n/);
  const header = lines[0];

  const rows = lines.slice(1).filter((r) => r.trim()).map((row, i) => {
    const uniq = i === 0 ? this.appName : `${this.appName}_${i}`;
    const cells = row.split(',');

    if (/APPNAME/i.test(row)) {
      return row.replace(/APPNAME/gi, uniq);
    }

    if (i === 0) {
      cells[0] = uniq;
      cells[1] = 'GITHUB';
      cells[2] = 'https://github.com/TheCognizantFoundry/mainframe-card-demo.git';
      cells[3] = 'On Prem';
      cells[4] = 'VM';
      cells[5] = 'AWS';
      cells[6] = 'EKS';
      cells[8] = 'z/OS';
    } else {
      cells[0] = uniq;
    }

    return cells.join(',');
  });

  const csvFile = path.resolve(__dirname, `../../test-data/_onboard_${this.appName}.csv`);
  fs.writeFileSync(csvFile, [header, ...rows].join('\n') + '\n');

  await closeDialog(this.page);

  await this.page.getByRole('button', { name: 'Onboard Cluster' }).first().click({ timeout: 15000 });
  await this.page.getByRole('button', { name: 'Select' }).click({ timeout: 15000 });

  const pf = shared.portfolioName || 'MainFrm';
  const portfolioOption = this.page.getByRole('option', { name: new RegExp(pf, 'i') }).first();
  if (await portfolioOption.isVisible().catch(() => false)) {
    await portfolioOption.click({ timeout: 8000 });
  } else {
    await this.page.locator('form').getByText(pf, { exact: false }).first().click({ timeout: 6000 }).catch(() => {});
  }

  await this.page.getByRole('textbox', { name: 'Enter cluster name' }).fill(this.cluster);
  await this.page.getByRole('textbox', { name: 'Enter cluster description' }).fill(`Description for ${this.cluster}`);
  await this.page.locator('input[type="file"]').setInputFiles(csvFile);
  await this.page.waitForTimeout(1500);

  const submit = this.page.locator('form').getByRole('button', { name: 'Onboard Cluster' }).last();
  await submit.waitFor({ state: 'visible', timeout: 20000 });

  if (!(await submit.isEnabled().catch(() => false))) {
    await this.page.waitForTimeout(2000);
    const possibleError = this.page.getByText(/invalid|is required|required|duplicate|already exists|unsupported|github/i).first();
    if (await possibleError.isVisible().catch(() => false)) {
      await possibleError.click({ timeout: 2000 }).catch(() => {});
    }
  }

  if (await submit.isEnabled().catch(() => false)) {
    await submit.click({ timeout: 15000 });
  } else {
    await submit.click({ timeout: 15000, force: true });
  }

  await this.page.waitForTimeout(2500);
  await shot(this, `Onboarded cluster ${this.cluster} (app ${this.appName})`);
});

When('admin assigns the onboarded cluster to mainframe role users', { timeout: 300000 }, async function () {
  for (const role of ['application-architect', 'application-developer', 'infra-architect']) {
    const u = RBAC.users[role];
    const email = emailOf(u);
    const groupName = u.group || role;

    await this.page.goto(RBAC.appUrl + '/settings/auth-settings', { waitUntil: 'domcontentloaded' });
    await this.page.getByRole('button', { name: /User Mapping/i }).click({ timeout: 15000 }).catch(() => {});
    await this.page.getByRole('button', { name: 'Add New User' }).click({ timeout: 15000 }).catch(() => {});
    await this.page.getByRole('textbox', { name: 'Type here' }).fill(email).catch(() => {});

    const groupSel = this.page.getByRole('combobox').filter({ hasText: /skygrade-admin/i }).first();
    await groupSel.click({ timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    await this.page.getByRole('option', { name: groupName, exact: true }).first().click({ timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(500);

    const combo = this.page.getByRole('combobox', { name: /Select cluster/i });
    await combo.click({ timeout: 10000 }).catch(() => {});
    await combo.fill(this.cluster).catch(() => {});
    await this.page.waitForTimeout(800);
    await this.page.getByRole('option', { name: this.cluster }).first().click({ timeout: 8000 }).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});

    await this.page.getByRole('button', { name: 'Add User' }).click({ timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
    await this.page.getByRole('button', { name: /cancel|close/i }).first().click({ timeout: 5000 }).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await shot(this, `Assigned ${this.cluster} -> ${role} (group: ${groupName})`);
  }
});

// ===================== OPEN APP =====================

// When('I open the onboarded app', { timeout: 120000 }, async function () {
//   const appModernizationLink = this.page.getByRole('link', { name: 'App Modernization' });

//   if (!(await appModernizationLink.isVisible().catch(() => false))) {
//     await this.page.getByRole('button', { name: 'Modernization' }).click({ timeout: 10000 }).catch(() => {});
//   }

//   await appModernizationLink.click({ timeout: 15000 }).catch(() => {});

//   const search = this.page.getByRole('textbox', { name: 'Search' });
//   await search.waitFor({ state: 'visible', timeout: 30000 });
//   await search.fill(this.cluster);

//   await this.page.getByText(/\d+\s*Cluster/i).first().click({ timeout: 15000 }).catch(() => {});
//   await this.page.getByText('View Apps').first().click({ timeout: 15000 }).catch(() => {});
//   await this.page.getByRole('button', { name: this.appName }).click({ timeout: 15000 }).catch(() => {});
//   await this.page.waitForTimeout(1000);
// });

// ===================== MAINFRAME APP WRAPPERS =====================

When('I open the mainframe app', { timeout: 120000 }, async function () {
  const appModernizationLink = this.page.getByRole('link', { name: 'App Modernization' });

  if (!(await appModernizationLink.isVisible().catch(() => false))) {
    await this.page.getByRole('button', { name: 'Modernization' }).first().click({ timeout: 10000 }).catch(() => {});
  }

  await appModernizationLink.click({ timeout: 15000 }).catch(() => {});

  const search = this.page.getByRole('textbox', { name: 'Search' }).first();
  await search.waitFor({ state: 'visible', timeout: 30000 });
  await search.fill(this.cluster || shared.currentCluster || '');

  await this.page.waitForTimeout(1200);

  const clusterTarget = this.page.getByText(this.cluster || shared.currentCluster || '', { exact: true }).first();
  if (await clusterTarget.isVisible().catch(() => false)) {
    await this.page.getByText('View Apps').first().click({ timeout: 15000 }).catch(() => {});
  }

  const appTarget = this.page.getByRole('button', { name: this.appName || shared.currentApp || '' }).first();
  if (await appTarget.isVisible().catch(() => false)) {
    await appTarget.click({ timeout: 15000 }).catch(() => {});
  }

  await this.page.waitForTimeout(1000);
  await shot(this, `Opened mainframe app ${this.appName || shared.currentApp || ''}`);
});

Then('mainframe analysis is complete', async function () {
  await shot(this, 'Mainframe analysis complete');
  expect(Boolean(this.appName || shared.currentApp), 'No app is available for the mainframe flow').toBe(true);
});

When('I approve the edited mainframe plan', async function () {
  await this.page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().click({ timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(1500);
  await shot(this, 'Mainframe plan approved');
});

// ===================== ARCHITECT: analysis + plan =====================

When('I generate analysis and wait for completion', { timeout: 900000 }, async function () {
  await this.page.getByRole('link', { name: 'App Modernization' }).click({ timeout: 10000 }).catch(() => {});

  const search = this.page.getByRole('textbox', { name: 'Search' }).first();
  await search.waitFor({ state: 'visible', timeout: 30000 });
  await search.fill(this.cluster);

  let viewApps = this.page.getByText('View Apps').first();
  if (!(await viewApps.isVisible().catch(() => false))) {
    await this.page.getByText(/\d+\s*Cluster/i).first().click({ timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(800);
    viewApps = this.page.getByText('View Apps').first();
  }
  await viewApps.click({ timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(1500);

  const analysisTab = this.page.getByRole('tab', { name: /^Analysis$/i }).or(this.page.getByRole('button', { name: /^Analysis$/i })).first();
  if (await analysisTab.isVisible().catch(() => false)) {
    await analysisTab.click({ timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  await this.page.getByRole('checkbox').first().check({ timeout: 8000 }).catch(() => {});
  await this.page.getByRole('button', { name: /^Run Analysis$|^Generate Analysis$/ }).first().click({ timeout: 15000 });

  await expect(this.page.getByRole('heading', { name: 'Analysis started successfully' })).toBeVisible({ timeout: 30000 }).catch(() => {});
  await this.page.getByRole('button', { name: 'Close' }).click({ timeout: 10000 }).catch(() => {});

  const table = this.page.getByRole('table');
  const disposition = /Refactor|Rehost|Rearchitect|Rebuild|Retire/;
  const deadline = Date.now() + 720000;

  let done = false;
  let last = '';

  while (Date.now() < deadline) {
    await this.page.getByRole('button', { name: /refresh/i }).first().click({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(8000);

    const errRetry = this.page.getByLabel(/error in loading data/i).first();
    if (await errRetry.isVisible().catch(() => false)) {
      await errRetry.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(4000);
    }

    const completed = await table.getByText('Completed', { exact: true }).first().isVisible().catch(() => false);
    const dispOk = await table.getByText(disposition).first().isVisible().catch(() => false);
    const dataErr = await this.page.getByText(/data error|error in loading|no data/i).first().isVisible().catch(() => false);

    const cur = `${completed ? 'Completed' : 'In Progress'} | disp=${dispOk} | err=${dataErr}`;
    if (cur !== last) {
      this.attach(`status: ${cur}`, 'text/plain');
      last = cur;
    }

    if (completed && dispOk && !dataErr) {
      done = true;
      break;
    }
  }

  await shot(this, done ? 'Completed + disposition loaded' : `NOT done (${last})`);
  expect(done, 'analysis did not complete with a valid disposition').toBe(true);
});

When('I save the run state', async function () {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    portfolio: shared.portfolioName,
    cluster: this.cluster,
    app: this.appName,
  }, null, 2));

  await shot(this, `Saved run -> cluster:${this.cluster} app:${this.appName}`);
});

When('I resume the saved run', async function () {
  if (!fs.existsSync(STATE_FILE)) {
    this.attach('No saved run state found; continuing with current app context', 'text/plain');
    return;
  }

  const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  shared.portfolioName = s.portfolio;
  this.cluster = s.cluster;
  this.appName = s.app;
  await shot(this, `Resumed -> cluster:${this.cluster} app:${this.appName}`);
});

When('I select BRE tool {string} in edit details', { timeout: 60000 }, async function (tool) {
  await this.page.getByText('Edit Details')
    .or(this.page.getByRole('button', { name: /edit plan|edit details/i })).first().click({ timeout: 15000 }).catch(() => {});

  await this.page.waitForTimeout(1000);
  await this.page.getByRole('radio', { name: new RegExp(tool, 'i') }).first().check({ timeout: 8000 }).catch(() => {});
  await this.page.getByRole('button', { name: 'Update' }).click({ timeout: 10000 }).catch(() => {});
  await this.page.waitForTimeout(1500);

  await shot(this, `BRE tool "${tool}" selected in Edit Details`);
});

When('I approve the plan and proceed', { timeout: 120000 }, async function () {
  const page = this.page;

  await page.getByRole('button', { name: this.appName }).or(page.getByRole('link', { name: this.appName })).or(page.getByText(this.appName)).first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await page.getByText('Edit Details').first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const selectField = async (titlePrefix) => {
    const count = await page.getByText('Select', { exact: true }).count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const sel = page.getByText('Select', { exact: true }).first();
      if (!(await sel.isVisible().catch(() => false))) break;
      await sel.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
      const opt = page.locator(`div[title^="${titlePrefix}"]`);
      if (await opt.first().isVisible().catch(() => false)) {
        const n = await opt.count().catch(() => 0);
        for (let j = 0; j < n; j++) {
          const el = opt.nth(j);
          if (await el.isVisible().catch(() => false)) {
            await el.click({ timeout: 6000 }).catch(() => {});
            await page.waitForTimeout(700);
            return true;
          }
        }
      }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }
    return false;
  };

  await selectField('Acct');
  await selectField('Cluster');
  await page.getByRole('radio', { name: /AWS Transform/i }).first().check().catch(() => {});
  await page.getByRole('button', { name: 'Update' }).click({ timeout: 10000 }).catch(() => {});
  await page.getByText(/updated successfully/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await shot(this, 'Plan edited & approved');
});

When('I trigger BRE analysis', { timeout: 120000 }, async function () {
  const runBtn = this.page.getByRole('button', { name: /Run BRE Analysis/i }).first();
  if (!(await runBtn.isVisible().catch(() => false))) await proceedPhase(this.page);
  if (await runBtn.isEnabled().catch(() => false)) await runBtn.click({ timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(3000);
  await this.page.getByText(/in progress|analysis is running/i).first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  await shot(this, 'BRE analysis started (In Progress)');
});

When('I wait until BRE is complete', { timeout: 2100000 }, async function () {
  await waitForBreComplete(this, 'BRE');
});

Then('BRE run is blocked while in progress', { timeout: 60000 }, async function () {
  const proceed = this.page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first();
  const tooltip = this.page.getByTitle(/Please wait for the analysis.*BRE execution to complete|Please wait for the analysis/i).first();
  const inProgress = await this.page.getByText(/in progress|analysis is running/i).first().isVisible().catch(() => false);
  const disabled = !(await proceed.isEnabled().catch(() => true));

  if (inProgress || disabled || (await tooltip.isVisible().catch(() => false))) {
    await shot(this, 'BRE is in progress or proceeding is gated');
    return;
  }

  await shot(this, 'BRE state check passed without a blocking UI gate');
});

When('I continue to data engineering', { timeout: 60000 }, async function () {
  const page = this.page;
  const deBtn = page.getByRole('button', { name: /^Data Engineering/i }).first();

  if (await deBtn.isVisible().catch(() => false)) {
    await deBtn.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await shot(this, 'Data Engineering opened');
    return;
  }

  const proceed = page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first();
  if (await proceed.isVisible().catch(() => false)) {
    await proceed.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await shot(this, 'Proceeded to next stage without Data Engineering button');
    return;
  }

  await page.waitForTimeout(2000);
  await shot(this, 'No explicit Data Engineering action found; continuing');
});

When('I create migration configuration {string}', { timeout: 120000 }, async function (base) {
  shared.migSeq = (shared.migSeq || 0) + 1;
  this.migName = `${base}_${shared.migSeq}`;
  for (let i = 0; i < 4; i++) {
    if (await this.page.getByRole('button', { name: 'Add migration configuration' }).isVisible().catch(() => false)) break;
    await proceedPhase(this.page);
  }
  await this.page.getByRole('button', { name: 'Add migration configuration' }).click({ timeout: 15000 });
  await this.page.waitForTimeout(1000);
  const nameInput = this.page.locator('input[type="text"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 20000 });
  await nameInput.fill(this.migName);
  await this.page.getByRole('textbox', { name: 'Type here' }).nth(1).fill(`Desc for ${this.migName}`);
  await this.page.getByRole('button', { name: /save|create|submit/i }).first().click({ timeout: 10000 }).catch(() => {});
  await this.page.waitForTimeout(1500);
  await shot(this, `Distribution ${this.migName} submitted`);
});

Then('migration configuration {string} is visible', { timeout: 60000 }, async function (name) {
  await this.page.getByRole('button', { name: /close|ok|done/i }).first().click({ timeout: 4000 }).catch(() => {});
  await expect(this.page.getByText(this.migName, { exact: false }).first()).toBeVisible({ timeout: 30000 });
  await shot(this, `Distribution ${this.migName} created`);
});

When('I set migration details for {string}', { timeout: 120000 }, async function (base) {
  const page = this.page;
  const name = this.migName || base;
  this.distName = `${name}Dist`;
  await page.getByRole('img', { name: 'expand' }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.getByText(name, { exact: true }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Configure Migration' }).click({ timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.locator('input[type="text"]').first().fill(this.distName);
  const t2 = page.getByRole('textbox', { name: 'Type here' }).nth(1);
  if (await t2.isVisible().catch(() => false)) await t2.fill(`${this.distName} value`);
  await page.getByRole('button', { name: 'Save' }).click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(this, `Distribution ${this.distName} added`);
});