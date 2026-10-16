/*const { Given, When, Then, After } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const data = require('../config/data.js');

// ===========================================================================
// Constants
// ===========================================================================
const SETTINGS_PATH = '/skygrade-modernization-settings';
const APP_LIST_TIMEOUT = 35000; // app button to appear after "View Apps"
const CONTENT_TIMEOUT = 30000;  // tab content to render (upper bound, not a wait)

// ===========================================================================
// Tool definitions
//
// Everything that differs between Observability / Security / FinOps lives
// here, so the steps below stay generic. Adding a tool = adding one entry
// here plus one row in the feature's Examples table.
// ===========================================================================
const TOOLS = {
  Observability: {
    settingsSection: (page) => page.getByText('Observability'),
    vendor: 'Datadog',
    appTab: (page) => page.getByText('Observability', { exact: true }),
    disabledMessage:
      'Observability tool is not enabled in Modernization Settings. Please contact your administrator.',
    assertEnabled: async (page) => {
      await expect(page.getByText('Application Log details')).toBeVisible({ timeout: CONTENT_TIMEOUT });
      await expect(page.getByRole('article')).toContainText('No data available for selected period');
    },
  },

  Security: {
    settingsSection: (page) => page.getByText('Security'),
    vendor: 'Prisma Cloud',
    appTab: (page) => page.getByText('Security'),
    disabledMessage:
      'Cloud Security monitoring tool is not enabled in Modernization Settings. Please contact your administrator.',
    assertEnabled: async (page) => {
      await expect(page.getByRole('heading', { name: 'Cloud Security Alerts' })).toBeVisible({
        timeout: CONTENT_TIMEOUT,
      });
      await expect(page.getByRole('article')).toContainText(
        'No alerts available. You caught up with all alerts'
      );
    },
  },

  FinOps: {
    // Fragile: index-based. Ask the dev team for a data-testid on this section.
    settingsSection: (page) => page.locator('div').filter({ hasText: 'FinOps' }).nth(5),
    vendor: 'Apptio Cloudability',
    appTab: (page) => page.getByText('FinOps'),
    disabledMessage:
      'FinOps tool is not enabled in Modernization Settings. Please contact your administrator.',
    assertEnabled: async (page) => {
      await expect(page.getByRole('heading', { name: 'Fin Ops Details' })).toBeVisible({
        timeout: CONTENT_TIMEOUT,
      });
    },
  },
};

function getTool(name) {
  const tool = TOOLS[name];
  if (!tool) {
    throw new Error(`Unknown tool "${name}". Known tools: ${Object.keys(TOOLS).join(', ')}`);
  }
  return tool;
}

// ===========================================================================
// Helpers - Modernization Settings page
// ===========================================================================

// Expand a tool's section on the settings page and confirm it rendered.
async function openToolSection(page, tool) {
  const section = tool.settingsSection(page);
  await expect(section).toBeVisible();
  await section.click();
  await expect(page.getByText(tool.vendor)).toBeVisible();
}

// /**
//  * Make the open section's toggle end up "On" or "Off". Only clicks if it is
//  * currently in the opposite state, then confirms the final state.
 
async function setToggle(page, target) {
  const opposite = target === 'On' ? 'Off' : 'On';

  // isVisible() doesn't wait, so make sure the switch has rendered first
  await expect(page.getByRole('switch').first()).toBeVisible();

  const oppositeSwitch = page.getByRole('switch', { name: opposite }).first();
  if (await oppositeSwitch.isVisible()) {
    await oppositeSwitch.click();
  }

  await expect(page.getByRole('switch', { name: target }).first()).toBeVisible();
}

// ===========================================================================
// Helpers - navigating to the target application
// ===========================================================================

// /** Expand the sidebar only as far as needed, then open Portfolio Analysis. 
async function openPortfolioAnalysis(page) {
  const modernization = page.getByRole('button', { name: 'Modernization' }).first();
  const appModernization = page.getByRole('button', { name: 'App Modernization' });
  const portfolioAnalysis = page.getByRole('link', { name: 'Portfolio Analysis' });

  // isVisible() doesn't wait, so make sure the sidebar has rendered first
  await modernization.waitFor({ state: 'visible' });

  if (!(await portfolioAnalysis.isVisible())) {
    if (!(await appModernization.isVisible())) {
      await modernization.click(); // everything collapsed
    }
    await appModernization.click();
  }
  await portfolioAnalysis.click();
}

// /** Search for the target app and open it. 
async function openTargetApp(world) {
  const { page } = world;
  const appName = data.toolsToggle.applicationName;

  await openPortfolioAnalysis(page);

  const search = page.getByRole('textbox', { name: 'Search' });
  await search.click();
  await search.fill(appName.toLowerCase());
  await page.getByText('View Apps').click();

  const appButton = page.getByRole('button', { name: appName });
  await expect(appButton).toBeVisible({ timeout: APP_LIST_TIMEOUT });

  // TODO: replace this fixed settle time with a wait on whatever the app list
  // is still loading (e.g. page.waitForResponse on the search call).
  // Kept at your original values: long on the first open, short afterwards.
  await page.waitForTimeout(world.appListWarmed ? 1000 : 15000);
  world.appListWarmed = true;

  await appButton.click();
}

// ===========================================================================
// Background steps
// ===========================================================================
// Given('I log in to Skygrade as an admin', async function () {
//   await this.page.goto(data.baseURL);
//   await this.page.getByRole('textbox', { name: 'Username' }).fill(data.skygrade.username);
//   await this.page.getByRole('button', { name: 'Next' }).click();
//   await this.page.getByRole('textbox', { name: 'Password' }).fill(data.skygrade.password);
//   await this.page.getByRole('button', { name: 'Continue' }).click();
// });

Given('I navigate to Modernization Settings', async function () {
  const page = this.page;

  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Modernization' }).nth(1)).toBeVisible();
  await page.getByRole('button', { name: 'Modernization' }).nth(1).click();
  await expect(page.getByRole('link', { name: 'App Modernization' })).toBeVisible();
  await page.getByRole('link', { name: 'App Modernization' }).click();
  await expect(page.locator('div').filter({ hasText: /^Modernization Settings$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tools' })).toBeVisible();
});

// ===========================================================================
// Disable a tool
// ===========================================================================
Given('the {string} tool is turned off in Modernization Settings', async function (toolName) {
  const tool = getTool(toolName);

  // Record before toggling so the After hook can restore it even if this fails midway
  (this.disabledTools ??= new Set()).add(toolName);

  await openToolSection(this.page, tool);
  await setToggle(this.page, 'Off');
});

// ===========================================================================
// Open the application (used both before and after re-enabling)
// ===========================================================================
When('I open the Cloud Ops section of the target application', async function () {
  await openTargetApp(this);
  await this.page.getByRole('button', { name: 'Cloud Ops Cloud Ops' }).click();
});

Then('the {string} tab should show that the tool is not enabled', async function (toolName) {
  const tool = getTool(toolName);

  await tool.appTab(this.page).click();
  await expect(
    this.page.getByRole('paragraph').filter({ hasText: tool.disabledMessage })
  ).toBeVisible({ timeout: CONTENT_TIMEOUT });
});

// ===========================================================================
// Re-enable a tool
// ===========================================================================
When('I return to Modernization Settings', async function () {
  await this.page.locator(`a[href="${SETTINGS_PATH}"]`).click();
});

When('I turn the {string} tool back on', async function (toolName) {
  const tool = getTool(toolName);

  await openToolSection(this.page, tool);
  await setToggle(this.page, 'On');
  this.disabledTools?.delete(toolName);
});

Then('the {string} tab should show the tool details', async function (toolName) {
  const tool = getTool(toolName);

  await tool.appTab(this.page).click();
  await tool.assertEnabled(this.page);
});

// ===========================================================================
// Cleanup - never leave a tool switched off for the whole environment
// If a scenario fails between "turned off" and "turned back on", restore it.
// ===========================================================================
After({ tags: '@modernizationtools' }, async function () {
  if (!this.disabledTools || this.disabledTools.size === 0) return;

  try {
    for (const toolName of [...this.disabledTools]) {
      await this.page.goto(new URL(SETTINGS_PATH, data.baseURL).href);
      await openToolSection(this.page, getTool(toolName));
      await setToggle(this.page, 'On');
      this.disabledTools.delete(toolName);
    }
  } catch (error) {
    // Don't mask the original failure - just make the leftover state obvious
    console.warn(
      `[cleanup] Could not re-enable: ${[...this.disabledTools].join(', ')}. ` +
        `Please turn it back on manually. (${error.message})`
    );
  }
});*/

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const data = require('../../config/data.js');

// ---------------------------------------------------------------------------
// Helper: whichever tool section is currently open, make sure its toggle
// ends up in the "Off" state - turning it off first if it was "On" - and
// confirm the final state before moving on.
// ---------------------------------------------------------------------------
async function ensureToggleOff(page) {
  const onSwitch = page.getByRole('switch', { name: 'On' }).first();
  const offSwitch = page.getByRole('switch', { name: 'Off' }).first();

  if (await onSwitch.isVisible().catch(() => false)) {
    await onSwitch.click();
  }

  await expect(offSwitch).toBeVisible();
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
// Given('I log in to Skygrade as an admin', async function () {
//   await this.page.goto(data.baseURL);
//   await this.page.getByRole('textbox', { name: 'Username' }).fill(data.skygrade.username);
//   await this.page.getByRole('button', { name: 'Next' }).click();
//   await this.page.getByRole('textbox', { name: 'Password' }).fill(data.skygrade.password);
//   await this.page.getByRole('button', { name: 'Continue' }).click();
// });

Given('I navigate to Modernization Settings', async function () {
  const page = this.page;

  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Modernization' }).nth(1)).toBeVisible();
  await page.getByRole('button', { name: 'Modernization' }).nth(1).click();
  await expect(page.getByRole('link', { name: 'App Modernization' })).toBeVisible();
  await page.getByRole('link', { name: 'App Modernization' }).click();
  await expect(page.locator('div').filter({ hasText: /^Modernization Settings$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tools' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Disable each tool
// ---------------------------------------------------------------------------
When('I open the Observability tool section and ensure its toggle is off', async function () {
  const page = this.page;

  await expect(page.getByText('Observability')).toBeVisible();
  await page.getByText('Observability').click();
  await expect(page.getByText('Datadog')).toBeVisible();
  await ensureToggleOff(page);
});

When('I open the Security tool section and ensure its toggle is off', async function () {
  const page = this.page;

  await expect(page.getByText('Security')).toBeVisible();
  await page.getByText('Security').click();
  await expect(page.getByText('Prisma Cloud')).toBeVisible();
  await ensureToggleOff(page);
});

When('I open the FinOps tool section and ensure its toggle is off', async function () {
  const page = this.page;

  await expect(page.locator('div').filter({ hasText: 'FinOps' }).nth(5)).toBeVisible();
  await page.locator('div').filter({ hasText: 'FinOps' }).nth(5).click();
  await expect(page.getByText('Apptio Cloudability')).toBeVisible();
  await ensureToggleOff(page);
});

// ---------------------------------------------------------------------------
// Navigate to target app and verify disabled messages
// ---------------------------------------------------------------------------
When('I navigate to the target application\'s Cloud Ops section', async function () {
  const page = this.page;
  const appName = data.toolsToggle.applicationName;
  this.appName = appName;

  const portfolioAnalysis = page.getByRole('link', { name: 'Portfolio Analysis' });
const appModernization = page.getByRole('button', { name: 'App Modernization' });
const modernization = page.getByRole('button', { name: 'Modernization' }).first();

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

  // await expect(page.locator('button').filter({ hasText: 'Modernization+' })).toBeVisible();
  // await page.locator('button').filter({ hasText: 'Modernization+' }).click();
  // await page.getByRole('link', { name: 'App Modernization' }).first().click();
  await page.getByRole('textbox', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill(appName.toLowerCase());
  await page.getByText('View Apps').click();
  await expect(page.getByRole('button', { name: appName })).toBeVisible({ timeout: 35000 });
  await page.waitForTimeout(15000);
  await page.getByRole('button', { name: appName }).click();
  await page.getByRole('button', { name: 'Cloud Ops Cloud Ops' }).click();
});

Then('the Observability tab should show it is not enabled', async function () {
  const page = this.page;

  await expect(page.getByText('Observability', { exact: true })).toBeVisible();
  await page.getByText('Observability', { exact: true }).click();
  await expect(page.getByText('Observability tool is not')).toBeVisible();
  await expect(page.getByRole('paragraph')).toContainText(
    'Observability tool is not enabled in Modernization Settings. Please contact your administrator.'
  );
});

Then('the Security tab should show it is not enabled', async function () {
  const page = this.page;

  await expect(page.getByText('Security')).toBeVisible();
  await page.getByText('Security').click();
  await expect(page.getByText('Cloud Security monitoring')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('paragraph')).toContainText(
    'Cloud Security monitoring tool is not enabled in Modernization Settings. Please contact your administrator.'
  );
});

Then('the FinOps tab should show it is not enabled', async function () {
  const page = this.page;

  await expect(page.getByText('FinOps')).toBeVisible();
  await page.getByText('FinOps').click();
  await expect(page.getByText('FinOps tool is not enabled in')).toBeVisible();
  await expect(page.getByRole('paragraph')).toContainText(
    'FinOps tool is not enabled in Modernization Settings. Please contact your administrator.'
  );
});

// ---------------------------------------------------------------------------
// Navigate back and re-enable each tool
// ---------------------------------------------------------------------------
When('I navigate back to Modernization Settings', async function () {
  const { page } = this;

  await page.locator('a[href="/skygrade-modernization-settings"]').dispatchEvent('click');

  // confirm we actually landed on the settings page
  await expect(page.getByRole('button', { name: 'Tools' })).toBeVisible();
});

When('I turn the Observability tool back on', async function () {
  const page = this.page;

  await page.getByText('Observability').click();
  await page.getByRole('switch', { name: 'Off' }).click();
  await expect(page.getByRole('switch', { name: 'On' })).toBeVisible();
});

When('I turn the Security tool back on', async function () {
  const page = this.page;

  await page.getByText('Security').click();
  await page.getByRole('switch', { name: 'Off' }).first().click();
  await expect(page.getByRole('switch', { name: 'On' })).toBeVisible();
});

When('I turn the FinOps tool back on', async function () {
  const page = this.page;

  await page.locator('div').filter({ hasText: 'FinOps' }).nth(5).click();
  await page.getByRole('switch', { name: 'Off' }).click();
  await expect(page.getByRole('switch', { name: 'On' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Navigate to app again and verify tools are now enabled
// ---------------------------------------------------------------------------
When('I navigate to the target application again', async function () {
  const page = this.page;
  const appName = this.appName;
  const portfolioAnalysis = page.getByRole('link', { name: 'Portfolio Analysis' });
const appModernization = page.getByRole('button', { name: 'App Modernization' });
const modernization = page.getByRole('button', { name: 'Modernization' }).first();

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


  //await page.getByRole('link', { name: 'App Modernization' }).first().click();
  await page.getByRole('textbox', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill(appName.toLowerCase());
  await page.getByText('View Apps').click();
  await expect(page.getByRole('button', { name: appName })).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: appName }).click({ timeout: 30000 });
});

Then('the Observability tab should show application log details', async function () {
  const page = this.page;

  await expect(page.getByText('Application Log details')).toBeVisible({timeout: 30000});
  //await expect(page.getByRole('article')).toContainText('No data available for selected period');
});

Then('the Security tab should show cloud security alerts', async function () {
  const page = this.page;

  await page.getByText('Security').click();
  await expect(page.getByRole('heading', { name: 'Cloud Security Alerts' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('article')).toContainText('No alerts available. You caught up with all alerts');
});

Then('the FinOps tab should show Fin Ops details', async function () {
  const page = this.page;

  await page.getByText('FinOps').click();
  await expect(page.getByRole('heading', { name: 'Fin Ops Details' })).toBeVisible();
});