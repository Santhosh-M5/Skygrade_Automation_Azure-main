
const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { plntab, providerPlatforms } = require('../../config/data');

// ---------------------------------------------------------------------------
// Helpers (kept inline in this file, not extracted to a separate module)
// ---------------------------------------------------------------------------

async function selectMuiOption(page, comboboxLocator, value) {
  await comboboxLocator.click();
  const option = page.locator(`li[data-value="${value}"]`);
  await option.waitFor({ state: 'visible' });
  await option.click();
}

async function selectCheckboxCard(page, text) {
  const card = page.locator('div[role="button"]', { hasText: text });
  await card.waitFor({ state: 'visible' });
  await card.click();
  return card;
}

async function clickButton(page, name) {
  await page.getByRole('button', { name }).click();
}

async function attachScreenshot(context) {
  const screenshot = await context.page.screenshot({ fullPage: true });
  context.attach(screenshot, 'image/png');
}

async function confirmDispositionDialog(page) {
  await expect(page.getByText('You are about to change the')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(
    'You are about to change the modernization disposition. Do you want to proceed?'
  );
  await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

When('I open the Plan Tab', async function () {

  await this.page.getByRole('textbox', { name: 'Search' }).click();
  await this.page.getByRole('textbox', { name: 'Search' }).fill(plntab.searchText);
  await this.page.getByText('View Apps').click();

  await this.page.waitForLoadState('domcontentloaded');

  const appButton = this.page.getByRole('button', { name: plntab.applicationName });
  await appButton.waitFor({ state: 'visible', timeout: 60000 });
  await appButton.click({ timeout: 60000 });

  await this.page.getByRole('button', { name: 'Plan Plan' }).click({ timeout: 60000 });

  await attachScreenshot(this);
});

Then('I verify Application Details functionality', async function () {

  await expect(this.page.getByRole('heading', { name: plntab.applicationName })).toBeVisible();
  await expect(this.page.getByText('View Application Details')).toBeVisible();

  await this.page.getByText('View Application Details').click();
  await this.page.waitForTimeout(2000);

  await attachScreenshot(this);

  await this.page.getByRole('img', { name: 'Close' }).click();
});

Then('I verify Target Cluster visibility based on Cloud Provider', async function () {

  await this.page.getByRole('button', { name: 'Edit Plan' }).click();

  const targetProvider = this.page.locator('label:has-text("Target Provider")').locator('..').getByRole('combobox');
  const targetPlatform = this.page.getByRole('combobox').nth(4);

  for (const [provider, { platforms, clusterVisibleFor }] of Object.entries(providerPlatforms)) {
    await selectMuiOption(this.page, targetProvider, provider);

    for (const platform of platforms) {
      await selectMuiOption(this.page, targetPlatform, platform);

      if (clusterVisibleFor.includes(platform)) {
        await expect(this.page.getByText('Target Cluster *')).toBeVisible();
      } else {
        await expect(this.page.getByText('Target Cluster *')).not.toBeVisible();
      }
    }
  }

  await attachScreenshot(this);
  await this.page.getByAltText('close').click();
});

Then('I verify Modernization Disposition behavior', async function () {

  await this.page.getByRole('button', { name: 'Edit Plan' }).click();

  const dispositionDropdown = this.page.locator('label:has-text("Modernisation Disposition")')
    .locator('..')
    .getByRole('combobox');

  const liftAndShiftOption = this.page.locator('div[role="button"]', { hasText: 'Lift and Shift VM' });
  const containerizeOption = this.page.locator('div[role="button"]', { hasText: 'Containerize App' });
  const monolithOption = this.page.locator('div[role="button"]', { hasText: 'Convert monolith to microservices' });

  // Each scenario's `run` preserves the exact sequence/behavior from the
  // original code (which varies per disposition), while reusing the shared
  // helpers above instead of repeating raw Playwright calls.
  const dispositionScenarios = [
    {
      name: 'Rebuild',
      run: async (page) => {
        await selectMuiOption(page, dispositionDropdown, 'Rebuild');
        await confirmDispositionDialog(page);
        await clickButton(page, 'Yes');
        await clickButton(page, 'Update');
        await clickButton(page, 'Approve & Proceed');
        await expect(page.getByText('Please select a different')).toBeVisible();
      },
    },
    {
      name: 'Retire',
      run: async (page) => {
        await selectMuiOption(page, dispositionDropdown, 'Retire');
        await confirmDispositionDialog(page);
        await clickButton(page, 'Yes');
        await clickButton(page, 'Update');
        await clickButton(page, 'Approve & Proceed');
        await expect(page.getByText('Please select a different')).toBeVisible();
      },
    },
    {
      name: 'Rehost',
      run: async (page) => {
        await selectMuiOption(page, dispositionDropdown, 'Rehost');
        await clickButton(page, 'Yes');

        await expect(liftAndShiftOption).toBeVisible();
        await liftAndShiftOption.click();
        await expect(containerizeOption).toBeVisible();
        await containerizeOption.click();

        await clickButton(page, 'Update');
      },
    },
    {
      name: 'Rearchitect',
      run: async (page) => {
        await clickButton(page, 'Edit Plan');
        await selectMuiOption(page, dispositionDropdown, 'Rearchitect');
        await clickButton(page, 'Yes');

        await expect(monolithOption).toBeVisible();
        await monolithOption.click();

        await clickButton(page, 'Update');
      },
    },
    {
      name: 'Refactor',
      run: async (page) => {
        await clickButton(page, 'Edit Plan');
        await selectMuiOption(page, dispositionDropdown, 'Refactor');
        await clickButton(page, 'Yes');
        await clickButton(page, 'Update');
        await clickButton(page, 'Approve & Proceed');

        await expect(page.getByText('Please select a Modernization Accelerator')).toBeVisible();
        await expect(monolithOption).toBeVisible();
        await monolithOption.click();
      },
    },
  ];

  for (const scenario of dispositionScenarios) {
    await scenario.run(this.page);
  }

  await attachScreenshot(this);

  await clickButton(this.page, 'Update');
  await clickButton(this.page, 'Approve & Proceed');
});

Then('I verify Service validation', async function () {

  await this.page.getByRole('button', { name: 'Edit Plan' }).click();

  while (true) {
    const closeButton = this.page
      .locator('span')
      .filter({ hasText: /⊗/ })
      .locator('button')
      .first();

    const isVisible = await closeButton.isVisible().catch(() => false);
    if (!isVisible) {
      break;
    }
    await closeButton.click();
  }

  await clickButton(this.page, 'Update');
  await clickButton(this.page, 'Approve & Proceed');
});

Then('Verifies the negative message', async function () {
  await expect(this.page.getByText('Please add atleast one service')).toBeVisible();
  await attachScreenshot(this);
});
