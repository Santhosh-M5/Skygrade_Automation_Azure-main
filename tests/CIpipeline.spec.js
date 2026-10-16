import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('test', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('https://azure-mt.skygrade.internal/');
  await page.waitForTimeout(3000);
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('listitem').filter({ hasText: 'KeycloakSign in using' }).getByRole('button').click();
  const page1 = await page1Promise;
  await page1.getByRole('textbox', { name: 'Password' }).click();
  await page1.getByRole('textbox', { name: 'Password' }).fill('Skygrade@123');
  await page1.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('qatest');
  await page.getByText('View Apps').click();
  await page.getByRole('button', { name: 'deploytest2' }).click();
  await page.getByRole('button', { name: 'Deploy Deploy' }).click();
  await expect(page.getByRole('button', { name: 'Create Pipeline' })).toBeVisible();
  await page.getByRole('button', { name: 'Create Pipeline' }).click();
  await expect(page.getByRole('heading', { name: 'Create a new component' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spring Boot With Azure CI' })).toBeVisible();
  await page.getByTestId('template-card-actions--create').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Spring Boot With Azure CI' })).toBeVisible();
  //await page.getByRole('textbox', { name: 'Java Artifact ID' }).click();
  await page.getByRole('textbox', { name: 'Java Artifact ID' }).click();
  await page.getByRole('textbox', { name: 'Java Artifact ID' }).fill('ci-demo');
  await page.getByRole('textbox', { name: 'Project Name of Checkmarx' }).click();
  await page.getByRole('textbox', { name: 'Project Name of Checkmarx' }).fill('deploytest2');
  await page.getByRole('textbox', { name: 'Project Name of Blackduck' }).click();
  await page.getByRole('textbox', { name: 'Project Name of Blackduck' }).fill('deploytest2');
  await page.getByRole('textbox', { name: 'Branch Name' }).click();
  await page.getByRole('textbox', { name: 'Branch Name' }).fill('main');
  await page.getByRole('textbox', { name: 'Runner Label' }).click();
  await page.getByRole('textbox', { name: 'Runner Label' }).fill('arc-runner-set-deploytest2');
  await expect(page.getByRole('button', { name: 'Review' })).toBeVisible();
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Run of Spring Boot With Azure')).toBeVisible();
  await page.waitForTimeout(7000);
});