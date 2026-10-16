const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { morpheus } = require('../../config/data');


async function snap(world) {
  try {
    const buffer = await world.page.screenshot({ fullPage: true });
    world.attach(buffer, 'image/png');
  } catch (e) {}
}

// ── Login ────────────────────────────────────────────────────────────────────

// ── Navigation ───────────────────────────────────────────────────────────────

Then('The user clicks the Cloud Provisioning tab and then the Service catalog tab', async function () {
  const serviceCatalogLink = this.page.getByRole('link', { name: 'Service Catalog' });
  const cloudProvisioningBtn = this.page.getByRole('button', { name: 'Cloud Provisioning' });

  // Only click Cloud Provisioning if Service Catalog is not already visible
  const isServiceCatalogVisible = await serviceCatalogLink.isVisible().catch(() => false);

  if (!isServiceCatalogVisible) {
    await cloudProvisioningBtn.waitFor({ state: 'visible', timeout: 30000 });
    await cloudProvisioningBtn.click();
    await this.page.waitForTimeout(1500);
  }

  await serviceCatalogLink.waitFor({ state: 'visible', timeout: 30000 });
  await serviceCatalogLink.click();
});

// ── Visibility checks ────────────────────────────────────────────────────────

When('The user checks the visibility of Cloud Provisioning tab', async function () {
  await expect(this.page.getByRole('button', { name: 'Cloud Provisioning' })).toBeVisible();
});

Then('The user checks the visibility of Service catalog tab', async function () {
  await expect(this.page.getByRole('link', { name: 'Service Catalog' })).toBeVisible();
});

Then('The user verfies the visibility of Elements', async function () {
  await expect(this.page.getByRole('heading', { name: 'Cloud Provisioning' })).toBeVisible();
  await expect(this.page.getByRole('heading', { name: 'Available Service Catalog' })).toBeVisible();
  await expect(this.page.getByRole('textbox', { name: 'Search' })).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'Import Catalog' })).toBeVisible();
  await expect(this.page.getByRole('heading', { name: 'Existing Service Catalogs' })).toBeVisible();
});

Then('The user select AWS from given Options', async function () {
  await this.page.getByRole('button', { name: 'AWS', exact: true }).click();
});

// ── Import Catalog ───────────────────────────────────────────────────────────

Then('The user clicks the Import Catalog without selecting values', async function () {
  await this.page.getByRole('button', { name: 'Import Catalog' }).click();
  await expect(this.page.getByRole('article'))
    .toContainText('Select at least one available service catalog and proceed');
});

Then('The user sees the error message', async function () {
  await expect(this.page.getByRole('article'))
    .toContainText('Select at least one available service catalog and proceed');
});

When('The user selects multiple Catalog results in only one selection', async function () {
  const elements = await this.page
    .locator("//div[@class='d-flex align-items-center gap-2']")
    .all();

  for (const element of elements) {
    await element.waitFor({ state: 'visible', timeout: 10000 });
    await element.click();
    await this.page.waitForTimeout(1000);
  }
});

Then('The user search the catalog {string}', async function (catalogName) {
  const searchBox = this.page.getByRole('textbox', { name: 'Search' });
  await searchBox.click();
  await searchBox.fill(catalogName);
});

Then('The error message should appear and import catalog should disable', async function () {
  await expect(this.page.getByText('No service catalog match your')).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'Import Catalog' })).toBeDisabled();
});

Then('The user checks the successfull message', async function () {
  await this.page.locator("//div[@class='d-flex align-items-center gap-2']").first().click();
  await this.page.getByRole('button', { name: 'Import Catalog' }).click();
  await expect(this.page.getByText('Service Catalog has been')).toBeVisible({ timeout: 10000 });
});

Then('The user checks the visibility of added catalog {string} in Existing Service catalogs', async function (value) {
  await expect(
    this.page.locator('tr', { hasText: value }).locator('a[href*="catalog-item"]')
  ).toBeVisible();
});

Then('The user clicks the rest catalog and import', async function () {
  await this.page.waitForTimeout(2000);
  const catalogLocator = this.page.locator("//div[@class='d-flex align-items-center gap-2']");
  const count = await catalogLocator.count();

  if (count === 0) {
    await expect(this.page.getByText(/No service catalog/i)).toBeVisible();
    return;
  }

  if (count === 1) {
    await catalogLocator.first().waitFor({ state: 'visible', timeout: 10000 });
    await catalogLocator.first().click();
    await this.page.getByRole('button', { name: 'Import Catalog' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
    return;
  }

  for (;;) {
    const current = await this.page
      .locator("//div[@class='d-flex align-items-center gap-2']").count();
    if (current === 0) break;

    await this.page.locator("//div[@class='d-flex align-items-center gap-2']").first().click();
    await this.page.getByRole('button', { name: 'Import Catalog' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
    await this.page.waitForTimeout(1000);
  }
});

// ── Morpheus ─────────────────────────────────────────────────────────────────

When('The user clicks the catalog name with description {string} and redirects to Morpheus page', async function (description) {
  this.catalogDescription = description;
  const link = this.page.locator('tr', { hasText: description }).locator('a[href*="catalog-item"]');
  await link.waitFor({ state: 'visible', timeout: 30000 });
  this.catalogName = (await link.textContent()).trim();

  const [page1] = await Promise.all([
    this.page.context().waitForEvent('page'),
    link.click(),
  ]);
  this.page1 = page1;
  await page1.waitForLoadState();
  await snap(this);
});

When('The user clicks the order link for catalog {string}', async function (description) {
  this.catalogDescription = description;
  const row = this.page.locator('tr', {
    has: this.page.locator('td.text-muted', { hasText: description })
  });
  this.catalogName = (await row.locator('a[href*="catalog-item"]').textContent()).trim();

  const orderLink = row.locator('a[href*="provisioning/catalog/create"]');
  await orderLink.waitFor({ state: 'visible', timeout: 30000 });

  const [page1] = await Promise.all([
    this.page.context().waitForEvent('page'),
    orderLink.click(),
  ]);
  this.page1 = page1;
  await page1.waitForLoadState();
});

Then('The user fills the Morphues login credentials', async function () {
  await this.page1.getByRole('textbox', { name: 'Username' }).fill(morpheus.username);
  await this.page1.getByRole('textbox', { name: 'Password' }).fill(morpheus.password);
  await this.page1.getByRole('button', { name: 'Log In' }).click();
});

Then('The user verifies the catalog in Morpheus page', async function () {
  const morpheusSearchName = this.catalogName.replace('-catalog-item', '');

  await this.page1.locator('[id="instanceType.filter.phrase"]').click();
  await this.page1.getByRole('link', { name: 'Library' }).click();
  await this.page1.getByRole('link', { name: 'Blueprints' }).click();
  await this.page1.locator('[id="instanceType.filter.phrase"]').fill(morpheusSearchName);
  await expect(this.page1.getByRole('link', { name: morpheusSearchName }).first()).toBeVisible();

  await this.page1.getByRole('tab', { name: 'Layouts', exact: true }).click();
  await this.page1.locator('[id="instanceTypeLayout.filter.phrase"]').fill(morpheusSearchName);
  await expect(this.page1.getByRole('link', { name: morpheusSearchName }).first()).toBeVisible();

  await this.page1.getByRole('tab', { name: 'Catalog Items' }).click();
  await this.page1.locator('[id="catalogItems.filter.phrase"]').fill(morpheusSearchName);
  await expect(this.page1.getByText(this.catalogName).first()).toBeVisible();
});


Then('The user verifies the order details', async function () {
  await expect(this.page1.getByText(this.catalogDescription).first()).toBeVisible();
  await expect(this.page1.getByRole('heading', { name: this.catalogName }).first()).toBeVisible();
});
