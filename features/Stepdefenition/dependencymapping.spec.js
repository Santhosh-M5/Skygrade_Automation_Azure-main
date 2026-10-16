const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const data = require('../../config/data');

// ---------- Helpers ----------
function getDialog(page) {
  return page.getByRole('dialog', { name: 'Add Dependency' });
}

function getSelectionCounter(page) {
  return getDialog(page).locator('[aria-live="polite"]');
}

function getApplyButton(page) {
  return page.getByRole('button', { name: 'Apply' });
}

function getLevelContainer(page, levelNumber) {
  return page.getByText(`Level ${levelNumber}`, { exact: true }).locator('xpath=..');
}

async function checkAllCheckboxes(page) {
  const checkboxes = getDialog(page).getByRole('checkbox');
  const totalCount = await checkboxes.count();
  for (let i = 0; i < totalCount; i++) {
    const checkbox = checkboxes.nth(i);
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }
  return totalCount;
}

async function removeAllDependencies(page) {
  const removeButtons = page.getByRole('button', { name: /^Remove /i });

  let remaining = await removeButtons.count();
  console.log(`Dependencies to remove: ${remaining}`);

  while (remaining > 0) {
    await removeButtons.first().click();
    remaining = await removeButtons.count();
  }
}

async function navigateToRoot(page, targetAppName) {
  const appModernizationLink = page.getByRole('link', { name: 'App Modernization' });

  if (!(await appModernizationLink.isVisible())) {
    await page.getByTestId('sidebar-root').getByRole('button', { name: 'Modernization' }).click();
  }

  await appModernizationLink.click();

  const searchBox = page.getByRole('textbox', { name: 'Search' });
  await searchBox.click();
  await searchBox.fill('');
  await searchBox.fill(targetAppName);
  await page.waitForTimeout(1500);

  await page.getByText('View Apps').click();

  const appButton = page.getByRole('button', { name: targetAppName });
  await appButton.waitFor({ state: 'visible', timeout: 30000 });
  await appButton.click();

  // Let the app detail page fully load before looking for its tabs
  await page.waitForLoadState('networkidle').catch(() => {});

  const planButton = page.getByRole('button', { name: 'Plan Plan' });
  await planButton.waitFor({ state: 'visible', timeout: 30000 });
  await planButton.click();

  const depMappingButton = page.getByRole('button', { name: 'Dependency Mapping', exact: true });
  await depMappingButton.waitFor({ state: 'visible', timeout: 30000 });
  await depMappingButton.click();
}

async function replayPath(page, path) {
  for (let i = 0; i < path.length; i++) {
    const level = i + 1;
    const container = getLevelContainer(page, level);
    const viewButton = container.getByRole('button', { name: `View dependency mapping for ${path[i]}` });
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await page.waitForTimeout(1500);
  }
}

async function verifyDependentToContains(page, expectedAppName) {
  const dependentToSection = page
    .locator('div')
    .filter({ hasText: 'Dependent To' })
    .filter({ hasNotText: 'Dependent On' })
    .first();

  await expect(dependentToSection).toBeVisible();

  const dependentToLinks = dependentToSection.locator('a[title]');
  await expect(dependentToLinks.first()).toBeVisible({ timeout: 10000 });

  const displayedNames = await dependentToLinks.evaluateAll(
    (links) => links.map((link) => link.getAttribute('title'))
  );

  console.log(`"Dependent To" shows: ${displayedNames.join(', ')} | Expecting: "${expectedAppName}"`);
  expect(displayedNames).toContain(expectedAppName);
}

async function getChildNames(container) {
  return container.locator('a[title]').evaluateAll(
    (links) => links.map((link) => link.getAttribute('title'))
  );
}

// Recursive tree walk - path = ordered app names from Level 1 down to current node
async function visit(page, targetAppName, path) {
  const level = path.length;
  const currentAppName = path[level - 1];
  const parentAppName = level > 1 ? path[level - 2] : targetAppName;

  console.log(`\nVisiting "${currentAppName}" at Level ${level} (parent: "${parentAppName}")`);

  const containerLevel = getLevelContainer(page, level);
  const nameLink = containerLevel.getByRole('link', { name: currentAppName, exact: true });
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await page.getByRole('button', { name: 'Plan Plan' }).click();
  await page.getByRole('button', { name: 'Dependency Mapping', exact: true }).click();

  await verifyDependentToContains(page, parentAppName);

  await navigateToRoot(page, targetAppName);
  await replayPath(page, path);

  const childLevel = level + 1;
  const childContainer = getLevelContainer(page, childLevel);

  const noDependenciesMessage = childContainer.getByText('No dependent-on applications found');

  if (await noDependenciesMessage.isVisible()) {
    console.log(`"${currentAppName}" has no further dependencies - stopping this branch.`);
    return;
  }

  const childNames = await getChildNames(childContainer);
  console.log(`"${currentAppName}"'s children: ${childNames.join(', ')}`);

  for (const childName of childNames) {
    const viewButton = childContainer.getByRole('button', { name: `View dependency mapping for ${childName}` });
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await page.waitForTimeout(1500);

    await visit(page, targetAppName, [...path, childName]);

    await navigateToRoot(page, targetAppName);
    await replayPath(page, path);
  }
}

// ---------- Login / navigation ----------
Given('I log in to Skygrade as an application architect', async function () {
  await this.page.goto(data.baseURL);
  await this.page.getByRole('textbox', { name: 'Username' }).fill(data.applicationArchitect.username);
  await this.page.getByRole('button', { name: 'Next' }).click();
  await this.page.getByRole('textbox', { name: 'Password' }).fill(data.applicationArchitect.password);
  await this.page.getByRole('button', { name: 'Continue' }).click();
});

Given('I open the target application\'s Dependency Mapping section', async function () {
  const appName = data.dependencyTreeWalk.applicationName;
  this.targetAppName = appName;

  await this.page.getByRole('textbox', { name: 'Search' }).click();
  await this.page.getByRole('textbox', { name: 'Search' }).fill(appName);
  await this.page.getByText('View Apps').click();
  await this.page.getByRole('button', { name: appName }).click();
  await this.page.getByRole('button', { name: 'Plan Plan' }).click();
  await this.page.getByRole('button', { name: 'Dependency Mapping' }).click();
});

// ---------- Ensure clean starting state (new conditional cleanup) ----------
Then('I ensure the application starts with no existing dependencies', async function () {
  const page = this.page;

  // Declare shared locators before any branch uses them
  const dialog = getDialog(page);
  const selectionCounter = getSelectionCounter(page);
  const applyButton = getApplyButton(page);

  const noDependenciesText = page.getByText('No dependencies mapped yet.');
  const addDependenciesButton = page.getByRole('button', { name: 'Add Dependencies' });

  let isAddDependenciesVisible = false;
  try {
    await addDependenciesButton.waitFor({ state: 'visible', timeout: 5000 });
    isAddDependenciesVisible = true;
  } catch {
    isAddDependenciesVisible = false;
  }

  if (!isAddDependenciesVisible) {
    console.log('Add Dependencies button not visible - existing dependencies found. Removing them first.');

    await expect(page.getByRole('button', { name: 'Edit Edit' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit Edit' }).click();
    await expect(page.getByText('Dependent On').nth(2)).toBeVisible();

    await removeAllDependencies(page);

    await expect(page.getByRole('button', { name: /^Remove /i })).toHaveCount(0);
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    await expect(noDependenciesText).toBeVisible();
    await expect(addDependenciesButton).toBeVisible();
  } else {
    console.log('No existing dependencies - Add Dependencies button is visible. Proceeding.');
    await expect(noDependenciesText).toBeVisible();
  }
});

// ---------- Add Dependencies dialog ----------
When('I open the Add Dependencies dialog', async function () {
  await this.page.getByRole('button', { name: 'Add Dependencies' }).click();
  await expect(this.page.getByLabel('Add Dependency')).toContainText('Enter at least 2 characters to search.');
  await expect(this.page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(this.page.getByRole('textbox', { name: 'Search application' })).toBeVisible();
});

// ---------- Bulk search and select all ----------
When('I search dependencies for the bulk search term and select all matching applications', async function () {
  const page = this.page;
  const searchTerm = data.dependencyTreeWalk.bulkSearchText;

  await page.getByRole('textbox', { name: 'Search application' }).click();
  await page.getByRole('textbox', { name: 'Search application' }).fill(searchTerm);
  await page.waitForTimeout(3000);

  this.totalCheckboxCount = await checkAllCheckboxes(page);
});

Then('the selection counter should match the total checkboxes selected', async function () {
  const page = this.page;
  const dialog = getDialog(page);
  const selectionCounter = getSelectionCounter(page);

  const checkboxes = dialog.getByRole('checkbox');
  const checkedCheckboxes = await checkboxes.evaluateAll(
    (boxes) => boxes.filter((box) => box.checked).length
  );

  await expect(selectionCounter).toContainText(`${this.totalCheckboxCount} application`);

  const selectionText = await selectionCounter.innerText();
  const selectionCountMatch = selectionText.match(/\d+/);
  const selectionCount = selectionCountMatch ? Number(selectionCountMatch[0]) : NaN;

  console.log(`Total checkboxes: ${this.totalCheckboxCount}`);
  console.log(`Checked checkboxes (DOM): ${checkedCheckboxes}`);
  console.log(`App-reported selection text: "${selectionText}" -> parsed: ${selectionCount}`);

  expect(checkedCheckboxes).toBe(this.totalCheckboxCount);
  expect(selectionCount).toBe(this.totalCheckboxCount);
});

Then('I apply the selected dependencies', async function () {
  const applyButton = getApplyButton(this.page);
  await expect(applyButton).toBeEnabled();
  await applyButton.click();
});

Then('no dependencies should be mapped for the application', async function () {
  await expect(this.page.getByText('No dependencies mapped yet.')).toBeVisible();
});

// ---------- Edit / remove all dependencies ----------
When('I open the edit dependency dialog', async function () {
  await expect(this.page.getByRole('button', { name: 'Edit Edit' })).toBeVisible();
  await this.page.getByRole('button', { name: 'Edit Edit' }).click();
  await expect(this.page.getByText('Dependent On').nth(2)).toBeVisible();
});

When('I remove all mapped dependencies', async function () {
  await removeAllDependencies(this.page);
  await expect(this.page.getByRole('button', { name: /^Remove /i })).toHaveCount(0);
});

// ---------- Add specific Level 1 apps individually ----------
When('I add the configured Level 1 applications individually', async function () {
  const page = this.page;
  const appNames = data.dependencyTreeWalk.level1AppNames;
  this.level1AppNamesToAdd = appNames;

  await page.getByRole('button', { name: 'Add Dependencies' }).click();

  const dialog = getDialog(page);
  const searchBox = page.getByRole('textbox', { name: 'Search application' });

  for (const appName of appNames) {
    await searchBox.click();
    await searchBox.fill('');
    await searchBox.fill(appName);
    await page.waitForTimeout(2000);

    const checkbox = dialog.getByRole('checkbox', { name: appName, exact: true });
    await expect(checkbox).toBeVisible();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }
});

Then('the selection counter should match the individually added applications', async function () {
  const selectionCounter = getSelectionCounter(this.page);
  await expect(selectionCounter).toContainText(`${this.level1AppNamesToAdd.length} application`);
});

// ---------- Read Level 1 apps + full tree walk ----------
Then('the Level 1 applications should be read from the page', async function () {
  const page = this.page;

  const level1Container = getLevelContainer(page, 1);
  await expect(level1Container).toBeVisible();

  // Wait for at least one app-name link to actually render inside the container
  // before reading names - the label can appear before its links load in.
  await expect(level1Container.locator('a[title]').first()).toBeVisible({ timeout: 10000 });

  const level1AppNames = await getChildNames(level1Container);
  console.log(`Level 1 apps found: ${level1AppNames.join(', ')}`);
  expect(level1AppNames.length).toBeGreaterThan(0);

  this.level1AppNames = level1AppNames;
});

Then('I walk and verify the full dependency tree for each Level 1 application', { timeout: 600 * 1000 }, async function () {
  const page = this.page;
  const targetAppName = this.targetAppName;

  for (const level1AppName of this.level1AppNames) {
    console.log(`\n=== Starting traversal for Level 1 app: "${level1AppName}" ===`);

    const level1Container = getLevelContainer(page, 1);
    const viewButton = level1Container.getByRole('button', { name: `View dependency mapping for ${level1AppName}` });
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await page.waitForTimeout(1500);

    await visit(page, targetAppName, [level1AppName]);

    await navigateToRoot(page, targetAppName);
  }
});