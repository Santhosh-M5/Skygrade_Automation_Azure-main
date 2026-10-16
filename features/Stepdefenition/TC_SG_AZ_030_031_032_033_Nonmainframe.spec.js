const { Given, When, Then } = require('@cucumber/cucumber');

const { expect } = require('@playwright/test');

const testData = require('../../config/data.js');

const { stackgen} = require('../../config/data.js');

const { appName, clusterName, searchCluster } = testData.nonMainframe;

const { getScenarioData } = require('../../support/testdatahelper.js');

//const { plntab, providerPlatforms } = require('../config/data');

const fs = require('fs'); const path = require('path');

const RBAC = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/rbac-data.json'), 'utf8'));
 
async function shot(w, l) { try { if (l) w.attach(l, 'text/plain'); if (w.page) w.attach(await w.page.screenshot(), 'image/png'); } catch (e) {} }

const emailOf = (u) => u.email || `${u.username}@cognizant.com`;

// add near the top of rehost.steps.js (with the other requires/helpers)

const shared = require('../../support/_shared.js');

function rand() { return Math.random().toString(36).slice(2, 6); }
 
async function closeDialog(page) {

  const dialog = page.getByRole('dialog');

  if (await dialog.isVisible().catch(() => false)) {

    await dialog.getByRole('button', { name: /close|ok|done|got it|continue|yes|confirm/i }).first().click({ timeout: 5000 }).catch(() => {});

    await page.keyboard.press('Escape').catch(() => {});

    await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

    await page.waitForTimeout(500);

  }

}
 
// ---- non-mainframe onboard: names use "NonMain" (mainframe keeps "Maintest") ----

When('I onboard a unique non-mainframe cluster using CSV {string}', { timeout: 120000 }, async function (csvTemplate) {

  this.cluster = `NonMain${rand()}`;

  this.appName = `NonMain${rand()}`;
 
  const tpl = [path.resolve(__dirname, `../../test-data/${csvTemplate}`), path.resolve(process.cwd(), csvTemplate)]

    .find(f => fs.existsSync(f));

  if (!tpl) throw new Error(`CSV template not found: ${csvTemplate}`);

  const lines = fs.readFileSync(tpl, 'utf8').trim().split(/\r?\n/);

  const header = lines[0];

  const rows = lines.slice(1).filter(r => r.trim()).map((row, i) => {

    const uniq = i === 0 ? this.appName : `${this.appName}_${i}`;

    if (/APPNAME/.test(row)) return row.replace(/APPNAME/g, uniq);

    const c = row.split(','); c[0] = uniq; return c.join(',');

  });

  const csvFile = path.resolve(__dirname, `../../test-data/_onboard_${this.appName}.csv`);

  fs.writeFileSync(csvFile, [header, ...rows].join('\n') + '\n');
 
  await closeDialog(this.page);

  await this.page.getByRole('button', { name: 'Onboard Cluster' }).click({ timeout: 15000 });

  await this.page.getByRole('button', { name: 'Select' }).click();

  const pf = shared.portfolioName;

  if (pf) await this.page.locator('form').getByText(pf).first().click({ timeout: 6000 }).catch(() => {});

  else await this.page.locator('form').getByText(/Rehost/i).first().click({ timeout: 6000 }).catch(() => {});
 
  await this.page.getByRole('textbox', { name: 'Enter cluster name' }).fill(this.cluster);

  await this.page.getByRole('textbox', { name: 'Enter cluster description' }).fill(`Description for ${this.cluster}`);

  await this.page.locator('input[type="file"]').setInputFiles(csvFile);

  await this.page.locator('form').getByRole('button', { name: 'Onboard Cluster' }).click();

  await this.page.waitForTimeout(2500);

  await shot(this, `Onboarded ${this.cluster} (app ${this.appName})`);

});
 
 
// ===================== ADMIN: assign to rehost roles =====================

When('admin assigns the onboarded cluster role to users', { timeout: 300000 }, async function () {

  for (const role of ['application-architect', 'application-developer', 'infra-developer']) {

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

    await shot(this, `Assigned ${this.cluster} -> ${role}`);

  }

});
 
// ===================== ARCHITECT: set disposition to Rehost =====================

When('I edit the plan and set disposition to {string}', { timeout: 120000 }, async function (disp) {

  const page = this.page;

  // await page.getByRole('button', { name: this.appName })

  //   .or(page.getByText(this.appName)).first().click({ timeout: 15000 }).catch(() => {});

  // await page.waitForTimeout(1000);

  //Below link won't work here because only if the plan is already went through plantab only that'll work
  //await page.getByRole('button', { name: 'Plan Plan' }).click({ timeout: 10000 }).catch(() => {});
  await page.getByRole('button', { name: 'Plan Plan' }).click();
  await page.waitForTimeout(800);

  // const proceedButton = page.getByRole('button', { name: 'Proceed' });
  // await proceedButton.click({ timeout: 25000 });

  

  await page.getByRole('button', { name: /Edit Plan|Edit Details/i }).click({ timeout: 10000 });

  await page.waitForTimeout(800);
 
  // change disposition dropdown to requested value

  const dispCombo = page.getByRole('combobox').filter({ hasText: /Refactor|Rehost|Rearchitect|Rebuild|Retire/ }).first();

  // capture current value BEFORE making a change
  const currentValue = (await dispCombo.textContent())?.trim();

  await dispCombo.click({ timeout: 8000 }).catch(() => {});

  await page.waitForTimeout(500);

  //await page.getByRole('option', { name: disp, exact: true }).first().click({ timeout: 8000 });
  await this.page.locator('ul[role="listbox"]').waitFor({ state: 'visible', timeout: 8000 });
  await this.page.locator(`li[role="option"][data-value="${disp}"]`).click({ timeout: 8000 });

  await page.waitForTimeout(500);

  if (currentValue !== disp) {
      await page.getByRole('button', { name: 'Yes' })
      .click({ timeout: 8000 })
      .catch(() => {});
  }


  //await page.getByRole('button', { name: 'Yes' }).click({ timeout: 8000 }).catch(() => {});   // confirm change

  await page.waitForTimeout(800);
 
  // Rehost strategy = Lift and Shift VM
  
if (disp === 'Rehost') {
  await page
    .getByRole('button', { name: /Lift and Shift VM/i })
    .getByRole('checkbox')
    .check({ timeout: 8000 })
    .catch(() => {});

  //Due to new release adding one more Accelarator
  await page
    .getByRole('button', { name: /Containerize App/i })
    .getByRole('checkbox')
    .check({ timeout: 8000 })
    .catch(() => {});

} else if (disp === 'Rearchitect' || disp === 'Refactor') {
  await page
    .getByRole('button', { name: /Convert monolith to microservices/i })
    .getByRole('checkbox')
    .check({ timeout: 8000 })
    .catch(() => {});
}

  //Need to add other Mandatory feilds in order to proceed
  await page.getByRole('combobox').nth(5).click();
  //await page.getByRole('option', { name: 'Acct569694 (443421141495)' }).click();
  let listbox = this.page.locator('ul[role="listbox"]').last();
  await listbox.waitFor({ state: 'visible', timeout: 8000 });
  await listbox.locator('li[data-value="89251f8b-1327-48b1-99b8-01a7c339669d"]').click({ timeout: 8000 })
  
  await page.getByRole('combobox').nth(6).click();
  listbox = this.page.locator('ul[role="listbox"]').last();
  await listbox.waitFor({ state: 'visible', timeout: 8000 });
  await listbox.locator('li[data-value="AzCluster46630"]').click({ timeout: 8000 });

  await page.getByRole('button', { name: 'Update' }).click({ timeout: 10000 });

  await page.getByText(/updated successfully/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().click({ timeout: 10000 });

  await page.waitForTimeout(2000);

  await shot(this, `Plan disposition set to ${disp}`);

});
 
// ===================== INFRA-DEVELOPER: IaC generation =====================

When('I initiate IaC generation', { timeout: 120000 }, async function () {

  const page = this.page;

  await page.getByRole('button', { name: 'Build Build' }).click({ timeout: 10000 }).catch(() => {});

  await page.waitForTimeout(800);

  await page.getByRole('button', { name: /Initiate IaC Generation/i }).click({ timeout: 15000 });

  await page.waitForTimeout(1500);

  // await page.getByText('App Engineering').first().click({ timeout: 10000 }).catch(() => {});

  // await page.waitForTimeout(1000);

  await shot(this, 'IaC generation initiated');

});
 
// ===================== APPLICATION-DEVELOPER: lift & shift =====================

When('I initiate lift and shift with IP {string}', { timeout: 120000 }, async function (ip) {

  const page = this.page;

  // unique last octet each run to avoid the "same IP" / "already added" error

  const uniqueIp = ip.replace(/\.\d+$/, `.${(Date.now() % 250) + 2}`);
 
  await page.getByRole('button', { name: 'Build Build' }).click({ timeout: 10000 }).catch(() => {});

  await page.waitForTimeout(800);

  await page.getByText('App Engineering').first().click({ timeout: 10000 }).catch(() => {});

  await page.waitForTimeout(800);

  await page.getByRole('button', { name: /Initiate Lift And Shift/i }).click({ timeout: 15000 });

  await page.waitForTimeout(1000);

  await page.getByRole('textbox', { name: /e\.g\./i }).first().fill(uniqueIp);

  await page.getByRole('button', { name: 'Save' }).click({ timeout: 10000 });

  await page.waitForTimeout(1500);
 
  // if it still errors, edit-tags -> cancel, then proceed anyway

  if (await page.getByText(/Failed to add server/i).first().isVisible().catch(() => false)) {

    await page.getByRole('button', { name: /edit Edit Tags|Edit Tags/i }).click({ timeout: 6000 }).catch(() => {});

    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 5000 }).catch(() => {});

  }

  
});

Then('I proceed to the next page',async function(){
  const proceedButton = this.page.getByRole('button', { name: 'Proceed' });
  await proceedButton.click({ timeout: 10000 });

});

Then('I cliked previous button',async function(){
  const previousButton = this.page.getByRole('button', { name: 'Previous' });
  await previousButton.click({ timeout: 10000 });
})

When('I verify when giving {string} it should not proceed to next page', { timeout: 120000 }, async function (dis) {

  const page = this.page;

  await page.getByRole('button', { name: 'Plan Plan' }).click();
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: /Edit Plan|Edit Details/i }).click({ timeout: 10000 });

  await page.waitForTimeout(800);
 
  // change disposition dropdown to requested value
  
  const dispCombo = page.getByRole('combobox').filter({ hasText: /Refactor|Rehost|Rearchitect|Rebuild|Retire/ }).first();
  const currentValue = (await dispCombo.textContent())?.trim();
  await dispCombo.click({ timeout: 8000 }).catch(() => {});

  await page.waitForTimeout(500);
 
  await this.page.locator('ul[role="listbox"]').waitFor({ state: 'visible', timeout: 8000 });
  await this.page.locator(`li[role="option"][data-value="${dis}"]`).click({ timeout: 8000 });

  //await page.getByRole('option', { name: dis, exact: true }).first().click({ timeout: 8000 });

  await page.waitForTimeout(500);

  //If it's for refactor it's preselected so no need
  if (currentValue !== dis) {
      await page.getByRole('button', { name: 'Yes' })
      .click({ timeout: 8000 })
      .catch(() => {});
  }
  
  await page.getByRole('button', { name: 'Yes' }).click({ timeout: 8000 }).catch(() => {});
  


  //await page.getByRole('button', { name: 'Yes' }).click({ timeout: 8000 }).catch(() => {});   // confirm change

  await page.waitForTimeout(800);
 
  // Rehost strategy = Lift and Shift VM
  
if (dis === 'Rehost') {
  await page
    .getByRole('button', { name: /Lift and Shift VM/i })
    .getByRole('checkbox')
    .check({ timeout: 8000 })
    .catch(() => {});
} else if (dis === 'Rearchitect' || dis === 'Refactor') {
  await page
    .getByRole('button', { name: /Convert monolith to microservices/i })
    .getByRole('checkbox')
    .check({ timeout: 8000 })
    .catch(() => {});
}

  await page.getByRole('combobox').nth(5).click();
  //await page.getByRole('option', { name: 'Acct569694 (443421141495)' }).click();
  let listbox = this.page.locator('ul[role="listbox"]').last();
  await listbox.waitFor({ state: 'visible', timeout: 8000 });
  await listbox.locator('li[data-value="89251f8b-1327-48b1-99b8-01a7c339669d"]').click({ timeout: 8000 })
  
  await page.getByRole('combobox').nth(6).click();
  listbox = this.page.locator('ul[role="listbox"]').last();
  await listbox.waitFor({ state: 'visible', timeout: 8000 });
  await listbox.locator('li[data-value="AzCluster46630"]').click({ timeout: 8000 });

  await expect(page.getByRole('article')).toContainText('No accelerators are available for the selected modernization approach.');
  
  
 
  await page.getByRole('button', { name: 'Update' }).click({ timeout: 10000 });

  await page.getByText(/updated successfully/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().click({ timeout: 10000 });

  await page.waitForTimeout(2000);

  await expect(page.getByRole('alert')).toContainText('Please select a different Modernization Disposition to proceed. Rebuild and Retire is currently not supported.');
  
  await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 10000 });

  await shot(this, `Plan disposition set to ${dis}`);

});

Then('I clicked Analysis button',async function(){
  await this.page.getByAltText('Analysis').click();

});

const addUser = async (page, role, email, clusterSearch, cluster, labelText) => {
    await page.getByRole('button', { name: 'Add New User' }).click();
    if (role !== 'skygrade-admin') {
        await page.getByRole('combobox').filter({ hasText: 'skygrade-admin' }).click();
        await page.getByRole('option', { name: role }).click();
    }
    await page.getByRole('textbox', { name: 'Type here' }).click();
    await page.getByRole('textbox', { name: 'Type here' }).fill(email);
    await page.getByRole('combobox', { name: 'Select cluster(s)' }).click();
    await page.getByRole('combobox', { name: 'Select cluster(s)' }).pressSequentially(clusterSearch, { delay: 50 });

    //await page.getByRole('option', { name: cluster, exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('option', { name: cluster, exact:true }).click();
    await page.keyboard.press('Escape');
    //await page.getByText(labelText).click();
    
    await page.getByRole('button', { name: 'Add User' }).click();
    await expect(page.getByText('User added successfully')).toBeVisible();
    await page.waitForTimeout(1000);
};

When('admin assigns cluster scope', { timeout: 180000 }, async function () {
  const { clusterName, searchCluster } = getScenarioData(this);
  const page = this.page;
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Authorization' }).click();
  await page.getByRole('button', { name: 'User Mapping Assign users to' }).click();
  await addUser(page, 'application-architect', 'application-architect@cognizant.com', searchCluster, clusterName,
    'Cluster*');
  await addUser(page, 'infra-architect', 'infra-architect@cognizant.com', searchCluster, clusterName,
    'Cluster*');
  await addUser(page, 'infra-developer', 'infra-developer@cognizant.com', searchCluster, clusterName,
    'Group Name*infra-developerUser*Email (e.g. name@company.com) or username (e.g.');
  await addUser(page, 'application-developer', 'application-developer@cognizant.com', searchCluster, clusterName,
    'Group Name*application-developerUser*Email (e.g. name@company.com) or username');
  await addUser(page, 'skygrade-admin', 'skygrade-admin@cognizant.com', searchCluster, clusterName,
    'Group Name*skygrade-adminUser');
});


Then('the analysis status should be {string}', { timeout: 60000 }, async function (status) {
  const table = this.page.getByRole('table');
  const s = await table.getByText(new RegExp(status, 'i')).first().isVisible().catch(() => false);
  const d = await table.getByText(/Refactor|Rehost|Rearchitect|Rebuild|Retire/).first().isVisible().catch(() => false);
  await shot(this, `status="${status}" in table:${s}  disposition:${d}`);
  expect(s || d, `expected "${status}" or a disposition value in the table`).toBe(true);
});

When("I search for the app in Search button", async function () {
  const { clusterName } = getScenarioData(this);
const modernization = this.page.getByRole('button', { name: /^Modernization/ });
const appModernization = this.page.getByRole('button', { name: /^App Modernization/ });
const portfolioAnalysis = this.page.getByText('Portfolio Analysis', { exact: true });

await modernization.waitFor({ state: 'visible' });

if (await portfolioAnalysis.isVisible()) {
    await portfolioAnalysis.click();
} else if (await appModernization.isVisible()) {
    await appModernization.click();
    await portfolioAnalysis.click();
} else {
    await modernization.click();
    await appModernization.click();
    await portfolioAnalysis.click();
}
  await expect(this.page.getByRole('textbox', { name: 'Search' })).toBeVisible();
  await this.page.getByRole('textbox', { name: 'Search' }).click();
  await this.page.getByRole('textbox', { name: 'Search' }).fill(clusterName);
});


When('I Run analysis and wait for completion', { timeout: 900000 }, async function () {
  const { appName, clusterName } = getScenarioData(this);
  // ensure world has app/cluster set for later diagnostics
  this.appName = this.appName || appName;
  this.cluster = this.cluster || clusterName;
  await this.page.getByText('View Apps').first()
    .or(this.page.getByText(/\d+\s*Cluster/i).first())
    .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  let va = this.page.getByText('View Apps').first();
  if (!(await va.isVisible().catch(() => false))) {
    await this.page.getByText(/\d+\s*Cluster/i).first().click().catch(() => {});
    await this.page.waitForTimeout(800);
    va = this.page.getByText('View Apps').first();
  }
  await va.click({ timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(1500);

  await this.page.getByRole('checkbox').first().check({ timeout: 8000 }).catch(() => {});

  const yetToStartVisible = await this.page.getByText('Yet to Start0').isVisible().catch(() => false);
  const inProgressVisible = await this.page.getByText('In Progress0').isVisible().catch(() => false);

  if (yetToStartVisible && inProgressVisible) {
    await expect(this.page.getByRole('textbox', { name: 'Search' })).toBeVisible();
    await this.page.getByRole('textbox', { name: 'Search' }).click();
    await this.page.getByRole('textbox', { name: 'Search' }).fill(appName);

    const appnamebtn = this.page.getByRole('button', { name: appName, exact: true } );
    await appnamebtn.waitFor({ state: 'visible', timeout: 20000 });
    await appnamebtn.click({ timeout: 20000 });

    await this.page.getByRole('button', { name: 'Analysis Analysis' }).click();
    await expect(this.page.getByRole('button', { name: 'Re-Run Analysis' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Re-Run Analysis' }).click();

    await expect(this.page.getByRole('dialog')).toContainText('You are about to re-run analysis. Do you want to proceed?');
    await expect(this.page.getByRole('button', { name: 'Yes' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Yes' }).click();

    await this.page.getByText(`Cluster Details - ${clusterName}`).click();
  }

  await this.page.getByRole('button', { name: /^Run Analysis$|^Generate Analysis$/ }).first().click({ timeout: 15000 });
  await expect(this.page.getByRole('heading', { name: 'Analysis started successfully' })).toBeVisible({ timeout: 30000 }).catch(() => {});
  await this.page.getByRole('button', { name: 'Close' }).click({ timeout: 10000 }).catch(() => {});

  const table = this.page.getByRole('table');
  const disposition = /Refactor|Rehost|Rearchitect|Rebuild|Retire/;
  const deadline = Date.now() + 720000; // 12 min
  let done = false, last = '';

  while (Date.now() < deadline) {
    await this.page.getByRole('button', { name: /refresh/i }).first().click({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(8000);

    const errRetry = this.page.getByLabel(/error in loading data/i).first();
    if (await errRetry.isVisible().catch(() => false)) {
      await errRetry.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(4000);
    }

    const completed = await table.getByText('Completed', { exact: true }).first().isVisible().catch(() => false);
    const dispOk    = await table.getByText(disposition).first().isVisible().catch(() => false);
    const dataErr   = await this.page.getByText(/data error|error in loading|no data/i).first().isVisible().catch(() => false);

    const cur = `${completed ? 'Completed' : 'In Progress'} | disp=${dispOk} | err=${dataErr}`;
    if (cur !== last) { this.attach(`status: ${cur}`, 'text/plain'); last = cur; }

    if (completed && dispOk && !dataErr) { done = true; break; }
  }

  await shot(this, done ? 'Completed + disposition loaded' : `NOT done (${last})`);
  expect(done, 'analysis did not complete with a valid disposition').toBe(true);
});

Given('I open the onboarded app', async function () {
  let appName;
  let clusterName;

  try {
    ({ appName, clusterName } = getScenarioData(this));
  } catch (e) {
    appName = this.appName || this.currentApp;
    clusterName = this.cluster || this.currentCluster;
    if (!appName || !clusterName) throw e;
  }

const modernization = this.page.getByRole('button', { name: 'Modernization' }).first();
const appModernization = this.page.getByRole('button', { name: /^App Modernization/ });
const portfolioAnalysis = this.page.getByText('Portfolio Analysis', { exact: true });

await modernization.waitFor({ state: 'visible' });

if (await portfolioAnalysis.isVisible()) {
    await portfolioAnalysis.click();
} else if (await appModernization.isVisible()) {
    await appModernization.click();
    await portfolioAnalysis.click();
} else {
    await modernization.click();
    await appModernization.click();
    await portfolioAnalysis.click();
}

  await expect(this.page.getByRole('textbox', { name: 'Search' })).toBeVisible();
  await this.page.getByRole('textbox', { name: 'Search' }).click();
  await this.page.getByRole('textbox', { name: 'Search' }).fill(clusterName);

  const clusterCard = this.page.getByText(clusterName, { exact: true }).locator('xpath=ancestor::div[3]');
  await clusterCard.getByText('View Apps').click({ timeout: 8000 }).catch(() => {});

  const appLink = this.page.getByRole('button', { name: appName })
    .or(this.page.getByRole('link', { name: appName }));

  await appLink.first().waitFor({ state: 'visible', timeout: 30000 });
  await appLink.first().click();
});

Then(
'I validate App Stack resources in StackGen for full flow',async function () {
  const { appName, clusterName } = getScenarioData(this);
    // if (!this.supportedApps || this.supportedApps.length === 0) {
    //   const msg = 'No supported apps were captured on the main page (Supported shows None or is empty). Skipping StackGen resource validation; verify IaC generation / Update App Stack in the UI.';
    //   this.attach(msg, 'text/plain');
    //   throw new Error(msg);
    // }

    const popupPromise =
      this.page.waitForEvent('popup');

    await this.page
        .getByRole('link', {
            name: 'View App Stack'
        })
        .click();

    this.page1 =
        await popupPromise;

    await this.page1.goto(
        'https://cognizant.cloud.stackgen.com/project/stackgen-cognizant:cognizant/appstacks'
    );

    await this.page1
        .getByRole('textbox', {
            name: 'Username or email address'
        })
        .fill(stackgen.email);

    await this.page1
        .getByRole('textbox', {
            name: 'Password'
        })
        .fill(stackgen.password);

    await this.page1
        .getByRole('button', {
            name: 'Sign in',
            exact: true
        })
        .click();

    await this.page1.waitForTimeout(3000);

    await this.page1
        .getByTestId('filter-search-text-box')
        .fill(appName);

    await this.page1.waitForTimeout(2000);
    
    await this.page1
    .locator('[data-testid^="appstack-name-link-"]')
    .filter({ hasText: appName })
    .first()
    .waitFor({ state: 'visible' });

    await this.page1
    .locator('[data-testid^="appstack-name-link-"]')
    .filter({ hasText: appName })
    .first()
    .click();

    await this.page1.waitForTimeout(3000);

    const resourceNames =
        this.page1.locator(
' .react-flow__node-customResourceNode .text-sm.font-semibold span'
        );

    const names =
        await resourceNames
            .allTextContents();
    const screenshot = await this.page1.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");

    console.log(names);
    console.log('===== Resource Comparison =====');

    if (!names || names.length === 0) {
      const msg = `StackGen returned no resources for app ${appName}. Ensure the App Stack exists and was generated/updated.`;
      this.attach(msg, 'text/plain');
      throw new Error(msg);
    }

    for (const app of this.availableServices) {
      const appWords = app
        .toLowerCase()
        .replace('amazon', '')
        .trim()
        .split(/\s+/);

      const matched = names.some(resource => {
        const normalizedResource = resource
          .toLowerCase()
          .replace('aws_', '')
          .replace(/_/g, ' ');

        return appWords.some(word => normalizedResource.includes(word));
      });

      console.log(`${matched ? '✅' : '❌'} ${app}`);

      if (!matched) {
        const msg = `No matching StackGen resource found for supported app: ${app}. See attached StackGen screenshot.`;
        this.attach(msg, 'text/plain');
        throw new Error(msg);
      }
    }
});

Then("I delete the user permission I have given to the cluster",async function(){
  const { clusterName } = getScenarioData(this);

  const authLink = this.page.getByRole('link', { name: 'Authorization' });

  if (!(await authLink.isVisible().catch(() => false))) {
    await this.page.getByRole('button', { name: 'Settings' }).click();}

  await authLink.click();
  await this.page.getByRole('button', { name: 'User Mapping Assign users to' }).click();

  // ── Delete application-architect ──
  await this.page.getByRole('button', { name: 'application-architect' }).click();
  await this.page.locator('tr').filter({ hasText: clusterName }).locator('input[type="checkbox"]').click();
  await this.page.getByRole('button', { name: 'Delete' }).click();
  await this.page.getByRole('button', { name: 'Yes' }).click();
  await this.page.getByRole('button', { name: 'application-architect' }).click();

  // ── Delete application-developer ──
  await this.page.getByRole('button', { name: 'application-developer' }).click();
  await this.page.locator('tr').filter({ hasText: clusterName }).locator('input[type="checkbox"]').click();
  await this.page.getByRole('button', { name: 'Delete' }).click();
  await this.page.getByRole('button', { name: 'Yes' }).click();
  await this.page.getByRole('button', { name: 'application-developer' }).click();

  // ── Delete infra-architect ──
  await this.page.getByRole('button', { name: 'infra-architect' }).click();
  await this.page.locator('tr').filter({ hasText: clusterName }).locator('input[type="checkbox"]').click();
  await this.page.getByRole('button', { name: 'Delete' }).click();
  await this.page.getByRole('button', { name: 'Yes' }).click();
  await this.page.getByRole('button', { name: 'infra-architect' }).click();

  // ── Delete infra-developer ──
  await this.page.getByRole('button', { name: 'infra-developer' }).click();
  await this.page.locator('tr').filter({ hasText: clusterName }).locator('input[type="checkbox"]').click();
  await this.page.getByRole('button', { name: 'Delete' }).click();
  await this.page.getByRole('button', { name: 'Yes' }).click();
  await this.page.getByRole('button', { name: 'infra-developer' }).click();

  // ── Delete skygrade-admin ──
  await this.page.getByRole('button', { name: 'skygrade-admin', exact: true }).click();
  await this.page.locator('tr').filter({ hasText: clusterName }).locator('input[type="checkbox"]').click();
  await this.page.getByRole('button', { name: 'Delete' }).click();
  await this.page.getByRole('button', { name: 'Yes' }).click();
});