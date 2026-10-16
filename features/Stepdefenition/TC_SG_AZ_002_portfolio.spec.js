const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const shared = require('../../support/state');


When('The user checks the visibility of create portfolio button', async function () {
  await expect(this.page.getByRole('button', { name: 'Create Portfolio' })).toBeVisible();
});

Then('The user clicks the Create Portfolio button', async function () {
  await this.page.getByRole('button', { name: 'Create Portfolio' }).click();
});

Then('The user enters the portfolio name {string} and clicks submit', async function (baseName) {
  shared.portfolioName = `${baseName}_${Date.now()}`;
  await this.page.getByPlaceholder('Type here').first().fill(shared.portfolioName);   // name field (new placeholder)
  await this.page.waitForTimeout(500);
  await this.page.getByRole('button', { name: 'Create Portfolio' }).last().click();    // modal submit (last = the modal's button)
});

Then('The user enters the same portfolio name {string} and checks whether dupliacte portfolio name is created or not', async function (baseName) {
  const name = shared.portfolioName || baseName;
  await this.page.getByRole('button', { name: 'Create Portfolio' }).first().click();    // open modal (page button)
  await this.page.getByPlaceholder('Type here').first().fill(name);
  await this.page.getByRole('button', { name: 'Create Portfolio' }).last().click();      // submit
  const alert = this.page.getByRole('alert');
  await expect(alert).toContainText('already exists');
  await expect(alert).toContainText(name);
  await this.page.getByRole('button', { name: 'Close' }).first().click();
});


Then('The user checks the visibility of search button', async function () {
  await expect(this.page.getByRole('textbox', { name: 'Search' })).toBeVisible();
});

Then('The user searches the Portfolio name{string} in search box', async function (baseName) {
  const name = shared.portfolioName || baseName;
  await this.page.getByRole('textbox', { name: 'Search' }).fill(name);
});

Then('The user must find the Portfolio name{string} in the result', async function (baseName) {
  const name = shared.portfolioName || baseName;
  await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 15000 });
});
