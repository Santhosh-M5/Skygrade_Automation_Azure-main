const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const {AppEng, vFunction} = require('../../config/data');

When('I open the App Engineering application',async function () {

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(AppEng.searchText);

    await this.page.getByText('View Apps')
        .click();

    await this.page.waitForTimeout(5000);

    await this.page.getByRole('button', {
        name: AppEng.applicationName
    }).click();

    await this.page.waitForTimeout(1000);

    await this.page
        .locator('div[role="button"]')
        .filter({
            hasText: 'Build'
        })
        .click();

    await this.page
        .getByText('App Engineering')
        .click();

    await this.page.waitForTimeout(2000);
});

When('I compare the application details from plan tab to build tab', async function () {
    
    async function getAccelerators(container) {
    const itemSelector = 'div:has(> img)';
    await container.locator(itemSelector).first().waitFor({ state: 'visible' });

    const items = await container.locator(itemSelector).all();
    const accelerators = [];

    for (const item of items) {
        const label = (await item.textContent())?.trim();
        if (label) accelerators.push(label);
    }

    return accelerators;
    }

    // ---------------------------------------------------------
      // STEP 1: Capture Services (Chips) — resilient to prefix drift (v5- -> v6- etc.)
      // ---------------------------------------------------------
      const chipLabelSelector = '[class*="MuiChip-label"]';
      await this.page.locator(chipLabelSelector).first().waitFor({ state: 'visible' });
    
      const rawServices = await this.page.locator(chipLabelSelector).allTextContents();
      const services = rawServices.map(s => s.trim()).filter(s => s.length > 0);
    
      console.log('Captured services:', services);
      console.log('Total services count:', services.length);
      expect(services.length).toBeGreaterThan(0);
    
      // ---------------------------------------------------------
      // STEP 2: Capture Accelerators BEFORE clicking "Plan"
      // ---------------------------------------------------------
      const acceleratorsBefore = await getAccelerators(this.page.locator('body'));
      console.log('Accelerators before Plan click:', acceleratorsBefore);
      expect(acceleratorsBefore.length).toBeGreaterThan(0);
    
      // ---------------------------------------------------------
      // STEP 3: Click "Plan" and capture Accelerators AFTER
      // ---------------------------------------------------------
      await this.page.getByRole('button', { name: 'Plan Plan' }).click();
    
      // Scope to the flex-wrap container seen in the Plan screen HTML
      const planContainer = this.page.locator('div[style*="display: flex"][style*="flex-wrap: wrap"]');
      const acceleratorsAfter = await getAccelerators(planContainer);
      console.log('Accelerators after Plan click:', acceleratorsAfter);
      expect(acceleratorsAfter.length).toBeGreaterThan(0);
    
      // ---------------------------------------------------------
      // STEP 4: Dynamic comparison between before & after lists
      // ---------------------------------------------------------
      const normalize = value => value.trim().toLowerCase();
      const setBefore = new Set(acceleratorsBefore.map(normalize));
      const setAfter = new Set(acceleratorsAfter.map(normalize));
    
      const missing = acceleratorsBefore
        .map(normalize)
        .filter(x => !setAfter.has(x));
      const added = acceleratorsAfter
        .map(normalize)
        .filter(x => !setBefore.has(x));
      const matched = acceleratorsBefore
        .map(normalize)
        .filter(x => setAfter.has(x));
    
      console.log(' Matched:', matched);
      console.log(' Missing (was on Build page, not on Plan page):', missing);
      console.log(' Added (new on Plan page):', added);
    
      // Assert the two lists are identical regardless of order and case
      expect([...setBefore].sort()).toEqual([...setAfter].sort());
    
      await this.page.getByRole('button', { name: 'Build Build' }).click();
    

});


When('I configure Monolith Breakdown',async function () {
    await this.page.getByText('Build').click();
    await this.page
        .getByText('App Engineering')
        .click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);

    const initiateMonobtn =
        this.page.getByRole('button', {
            name: /Initiate Monolith Breakdown/i
        });

    const message =
        this.page.getByText(
            'Learning not started or no'
        );

    if (await initiateMonobtn.isVisible().catch(() => false)) {
        await initiateMonobtn.click();
        await expect(this.page.getByRole('article')).toContainText(
            'Learning not started or no measurements yet.');

        await this.page.getByRole('button', {
            name: 'edit Edit Tags'}).click();

        await this.page
            .getByRole('textbox')
            .fill(AppEng.tagId);

        await this.page.getByRole('button', {
            name: 'Update'}).click();

    } else if (
        await message
            .isVisible()
            .catch(() => false)
    ) {

        await this.page.getByRole('button', {
            name: 'edit Edit Tags'
        }).click();

        await this.page
            .getByRole('textbox')
            .fill(AppEng.tagId);

        await this.page.getByRole('button', {
            name: 'Update'
        }).click();
    }
});

When('I capture App Engineering metrics',async function () {

    const appRow = this.page
        .locator('span[role="button"]')
        .filter({
            hasText:
            AppEng.orderApplicationName
        })
        .locator('../../..');

    const spans =
        appRow.locator('span');

    this.domains =
        (await spans.nth(11).textContent()).trim();

    this.functions =
        (await spans.nth(12).textContent()).trim();

    this.resources =
        (
            await spans.nth(13)
                .textContent()
        ).trim();

    this.highDebts =
        (
            await spans.nth(14)
                .textContent()
        ).trim();

    console.log({
        domains: this.domains,
        functions: this.functions,
        resources: this.resources,
        highDebts: this.highDebts
    });
    const screenshot = await this.page.screenshot({ fullPage: true });
  this.attach(screenshot, "image/png");
});

Then('I validate Learning metrics',async function () {

    const [page1] =
        await Promise.all([
            this.page.waitForEvent(
                'popup'
            ),

            this.page.getByRole(
                'button',
                {
                    name:
                    'Open application'
                }
            ).click()
        ]);

    this.page1 = page1;


await page1
    .getByTestId('email')
    .fill(vFunction.email);

await page1
    .getByTestId('password')
    .fill(vFunction.password);


    await page1
        .getByTestId('loginButton')
        .click();

    await page1
        .waitForLoadState(
            'networkidle'
        );

    await page1.waitForTimeout(5000);

    await page1
        .getByRole('link', {
            name: 'Learning'
        })
        .click();

    this.functions1 =
        (
            await page1
                .getByTestId(
                    'FunctionsValue'
                )
                .innerText()
        ).trim();

    this.resources1 =
        (
            await page1
                .getByTestId(
                    'ResourcesValue'
                )
                .innerText()
        ).trim();

    this.domains1 =
        (
            await page1
                .getByTestId(
                    'DomainsValue'
                )
                .innerText()
        ).trim();

    expect(this.domains1).toBe(this.domains);

    expect(
        this.functions1
    ).toBe(this.functions);

    expect(
        this.resources1
    ).toBe(this.resources);


    console.log({
        domains1: this.domains1,
        functions1: this.functions1,
        resources1: this.resources1
    });
    const screenshot = await page1.screenshot({ fullPage: true });
  this.attach(screenshot, "image/png");
});

Then('I validate High Debt metrics',async function () {

    await this.page1
        .getByTestId(
            'viewTechDebtReportButton'
        )
        .click();

    const highDebtClasses =
        (
            await this.page1
                .getByText(
                    'High Debt Classes'
                )
                .locator(
                    'xpath=following-sibling::div'
                )
                .first()
                .textContent()
        ).trim();

    if (
        highDebtClasses ===
        this.highDebts
    ) {

        console.log(
            ' High Debt matched'
        );

    } else {

        console.log(
            ` High Debt mismatch. Skygrade=${this.highDebts}, V-function=${highDebtClasses}`
        );
    }

    await this.page1
        .getByTestId(
            'closeReport-closeIcon'
        )
        .click();

    await this.page1
        .getByRole('link', {
            name: 'Analysis'
        })
        .click();

    const highDebtClassesAnalysis =
        await this.page1
            .locator(
                'p:has-text("High Debt Classes")'
            )
            .locator(
                'xpath=following-sibling::p'
            )
            .textContent();

    console.log(
        'High Debt Classes value from Analysis Page',
        highDebtClassesAnalysis
    );
    const screenshot = await this.page1.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");

   await this.page.getByRole('button', { name: 'Proceed' }).click();
});