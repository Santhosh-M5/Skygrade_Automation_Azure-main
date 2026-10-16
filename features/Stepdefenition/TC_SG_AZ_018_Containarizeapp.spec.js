const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { containerizeApp } = require('../../config/data');
const data = require('../../config/data');
const { getScenarioData } = require('../../support/testdatahelper');


// ---------- Helpers ----------
function generateRandomIP() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

function generateRandomAlias(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function getAppTableData(page) {
  const table = page.locator('table').filter({ hasText: 'Alias' }).filter({ hasText: 'Port' });
  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  const tableData = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const cellCount = await row.locator('td').count();

    if (cellCount < 6) {
      continue; // skip "No containerization details available" placeholder row
    }

    const cells = row.locator('td');
    tableData.push({
      alias: (await cells.nth(1).textContent())?.trim(),
      hostName: (await cells.nth(2).textContent())?.trim(),
      port: (await cells.nth(3).textContent())?.trim(),
      connectionType: (await cells.nth(4).textContent())?.trim(),
      username: (await cells.nth(5).textContent())?.trim(),
    });
  }

  return tableData;
}

async function getChaiTableData(chaiPage) {
  const rows = chaiPage.locator('.ant-table-tbody tr.ant-table-row');
  await expect(rows.first()).toBeVisible({ timeout: 15000 });

  const rowCount = await rows.count();
  const tableData = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    tableData.push({
      alias: (await row.locator('.host-name').textContent())?.trim(),
      connectionType: (await row.locator('td[title]').nth(0).textContent())?.trim(),
      hostName: (await row.locator('td[title]').nth(1).textContent())?.trim(),
      username: (await row.locator('td[title]').nth(2).textContent())?.trim(),
      port: (await row.locator('td[title]').nth(3).textContent())?.trim(),
    });
  }

  return tableData;
}

function compareTablesByAlias(appData, chaiData) {
  for (const appRow of appData) {
    const chaiRow = chaiData.find(r => r.alias === appRow.alias);

    if (!chaiRow) {
      console.log(`MISMATCH: Alias "${appRow.alias}" not found in chai table`);
      expect(chaiRow, `Alias "${appRow.alias}" not found in chai table`).toBeTruthy();
      continue;
    }

    const fieldsToCompare = ['hostName', 'port', 'connectionType', 'username'];
    for (const field of fieldsToCompare) {
      const match = appRow[field] === chaiRow[field];
      console.log(
        `Alias "${appRow.alias}" - ${field}: app="${appRow[field]}" | chai="${chaiRow[field]}" -> ${match ? 'MATCH' : 'MISMATCH'}`
      );
      expect(chaiRow[field], `${field} mismatch for alias "${appRow.alias}"`).toBe(appRow[field]);
    }
  }
}

// ---------- Login / navigation steps ----------
Given('I log in to the Skygrade app', async function () {
  await this.page.goto(data.baseURL);
  await this.page.getByRole('textbox', { name: 'Username' }).fill(data.applicationDeveloper.username);
  await this.page.getByRole('button', { name: 'Next' }).click();
  await this.page.getByRole('textbox', { name: 'Password' }).fill(data.applicationDeveloper.password);
  await this.page.getByRole('button', { name: 'Continue' }).click();
});

Given('I navigate to the containerize app and open the {string} tab', async function (tabName) {
  const appName = data.containerizeApp.applicationName;
  this.appName = appName;

  await this.page.getByRole('textbox', { name: 'Search' }).click();
  await this.page.getByRole('textbox', { name: 'Search' }).fill(appName);
  await this.page.getByText('View Apps').click();
  const appButton = this.page.getByRole('button', { name: appName });
    await appButton.waitFor({ state: 'visible', timeout: 30000 });
    await appButton.click();
    await this.page.getByRole('button', { name: `${tabName} ${tabName}` }).click();

  //await expect(this.page.getByText('Modernization DispositionRehost')).toBeVisible();
  //await this.page.getByRole('button', { name: 'Proceed' }).click();
});

Given('I proceed to the {string} section', async function (sectionName) {
  //await this.page.getByRole('button', { name: 'Proceed' }).click();
  await this.page.getByText('Build').click();
  await this.page.getByText(sectionName).click();
  //await this.page.getByText('Containerize App').click();
});

// ---------- Initiate containerization ----------
When('I initiate containerization if the application is not yet linked', async function () {
  await this.page.getByText('Build').click();
  await this.page.getByText('App Engineering').click();
  await this.page.getByText('Containerize App').click();
  const initiateButton = this.page.getByRole('button', { name: 'Initiate Containerization' });

  let isInitiateVisible = false;
  try {
    await initiateButton.waitFor({ state: 'visible', timeout: 5000 });
    isInitiateVisible = true;
  } catch {
    isInitiateVisible = false;
  }

  if (isInitiateVisible) {
    await expect(this.page.getByText('This application isn\'t linked')).toBeVisible();
    await expect(this.page.getByRole('article')).toContainText('This application isn\'t linked to a project yet.');
    await initiateButton.click();
    await expect(this.page.getByText('Containerization initiated')).toBeVisible();
  }
});

Then('the {string}, {string}, and {string} buttons should be visible', async function (btn1, btn2, btn3) {
  await expect(this.page.getByRole('button', { name: btn1 })).toBeVisible();
  await expect(this.page.getByRole('button', { name: btn2 })).toBeVisible();
  await expect(this.page.getByRole('button', { name: btn3 })).toBeVisible();
});

Then('I capture the existing host table data', async function () {
  this.appTableData = await getAppTableData(this.page);
  this.hostsAlreadyExist = this.appTableData.length > 0;
  console.log(`Existing host count: ${this.appTableData.length}`);
});

// ---------- Add Host form validation (all 4 combos) ----------
When('I validate the Add Host form for {string} OS with {string} connection type', async function (osType, connectionType) {
  const page = this.page;

  await page.getByRole('button', { name: 'Add Host' }).click();

  await expect(page.getByText("Adds a host to project")).toBeVisible();
  await expect(page.getByText('Host Details')).toBeVisible();
  await expect(page.getByPlaceholder('e.g. 10.13.2.125')).toBeVisible();

  const aliasContainer = page.locator('div').filter({ hasText: /^Alias/ }).last();
  await expect(aliasContainer.locator('input')).toBeVisible();

  const osTypeContainer = page.locator('div').filter({ hasText: /^OS Type/ }).last();
  await expect(osTypeContainer.locator('select')).toBeVisible();
  await expect(osTypeContainer.getByRole('option', { name: 'linux' })).toHaveCount(1);
  await expect(osTypeContainer.getByRole('option', { name: 'windows' })).toHaveCount(1);

  const portContainer = page.locator('div').filter({ hasText: /^Port/ }).last();
  await expect(portContainer.locator('input[type="number"]')).toBeVisible();
  await expect(portContainer.locator('input[type="number"]')).toHaveValue('22');

  const connectionTypeContainer = page.locator('div').filter({ hasText: /^Connection Type/ }).last();
  await expect(connectionTypeContainer.locator('select')).toBeVisible();

  const vaultContainer = page.locator('div').filter({ hasText: /^Credentials Vault/ }).last();
  await expect(vaultContainer.locator('select')).toBeVisible();

  const usernameContainer = page.locator('div').filter({ hasText: /^Username/ }).last();
  const submitAddHostButton = page.locator('button', { hasText: 'Add Host' }).last();

  await expect(submitAddHostButton).toBeVisible();
  await expect(submitAddHostButton).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  const ip = generateRandomIP();
  const alias = generateRandomAlias(`${osType}-${connectionType}`);

  await page.getByPlaceholder('e.g. 10.13.2.125').fill(ip);
  await aliasContainer.locator('input').fill(alias);
  await osTypeContainer.locator('select').selectOption(osType);
  await connectionTypeContainer.locator('select').selectOption(connectionType);

  let vaultLabel;
  if (osType === 'linux' && connectionType === 'basic') {
    vaultLabel = data.containerizeApp.vaults.linuxBasicVaultLabel;
  } else if (osType === 'linux' && connectionType === 'ssh') {
    vaultLabel = data.containerizeApp.vaults.linuxSshVaultLabel;
  } else {
    vaultLabel = data.containerizeApp.vaults.windowsVaultLabel;
  }

  const vaultSelect = vaultContainer.locator('select');
  await expect(vaultSelect.getByRole('option', { name: vaultLabel })).toHaveCount(1);
  await vaultSelect.selectOption({ label: vaultLabel });

  const usernameInput = usernameContainer.locator('input');
  await expect(usernameInput).toBeVisible();

  if (connectionType === 'ssh') {
    await expect(usernameInput).toBeEnabled();
    await expect(usernameInput).toHaveValue('');
    await usernameInput.fill('ssh-test-user');
  } else {
    await expect(usernameInput).toBeDisabled();
    await expect(usernameInput).toHaveValue('swapnil');
  }

  await expect(submitAddHostButton).toBeEnabled();

  // Only linux/basic ever submits, and only if no hosts exist yet
  const isSubmittingCombo = osType === 'linux' && connectionType === 'basic';

  if (isSubmittingCombo && !this.hostsAlreadyExist) {
    await submitAddHostButton.click();
    await expect(page.getByText("Adds a host to project")).not.toBeVisible();
    console.log(`Submitted host "${alias}" (${osType}/${connectionType}).`);
  } else {
    await page.getByRole('button', { name: 'Cancel' }).click();
    console.log(`Validated combo "${osType}/${connectionType}" without submitting.`);
  }
});

// ---------- Capture final table + navigate to Chai ----------
Then('I capture the final host table data', async function () {
  this.appTableData = await getAppTableData(this.page);
  console.log('Final app table data:', JSON.stringify(this.appTableData, null, 2));
  expect(this.appTableData.length).toBeGreaterThan(0);
});

Then('I open the first host\'s alias link to the Chai site', async function () {
  const firstAlias = this.appTableData[0].alias;

  const chaiPagePromise = this.page.waitForEvent('popup');
  await this.page.getByRole('link', { name: firstAlias }).click();
  this.chaiPage = await chaiPagePromise;
});

Then('I log in to the Chai site', async function () {
  const chaiPage = this.chaiPage;

  await chaiPage.getByRole('textbox', { name: 'Enter your email' }).click();
  await chaiPage.getByRole('textbox', { name: 'Enter your email' }).fill(data.containerizeApp.chai.email);
  await chaiPage.getByRole('textbox', { name: 'Enter your password' }).click();
  await chaiPage.getByRole('textbox', { name: 'Enter your password' }).fill(data.containerizeApp.chai.password);
  await chaiPage.getByRole('button', { name: 'Login' }).click();
});

Then('I search and open the application on the Chai site', async function () {
  const chaiPage = this.chaiPage;
  const appName = this.appName;

  await chaiPage.getByRole('textbox', { name: 'Search' }).click();
  await chaiPage.getByRole('textbox', { name: 'Search' }).fill(appName);
  await chaiPage.getByText(appName.toLowerCase()).click();
});


Then('I search and open the application on the Chai site for full flow', async function () {
  const chaiPage = this.chaiPage;
  //const appName = this.appName;
  const { appName } = getScenarioData(this);

  await chaiPage.getByRole('textbox', { name: 'Search' }).click();
  await chaiPage.getByRole('textbox', { name: 'Search' }).fill(appName);
  await chaiPage.getByText(appName.toLowerCase()).click();
});

Then('I navigate to the Discover page on the Chai site', async function () {
  await this.chaiPage.getByRole('link', { name: 'Discover' }).click();
});

Then('the host data on the app and the Chai site should match', async function () {
  const chaiTableData = await getChaiTableData(this.chaiPage);
  console.log('Full captured chai table data:', JSON.stringify(chaiTableData, null, 2));

  expect(chaiTableData.length).toBeGreaterThan(0);

  compareTablesByAlias(this.appTableData, chaiTableData);
});