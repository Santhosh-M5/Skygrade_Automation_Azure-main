/*
const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { InfraEng ,stackgen} = require('../config/data');
//const { appName } = require('../support/_shared');

When('I Click the Infra Engineering', async function () {

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).click();

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(InfraEng.searchText);

    await this.page.getByText('View Apps').click();

    const appnameButton = this.page.getByRole('button', {name: InfraEng.applicationName});

    await appnameButton.waitFor({state: 'visible',timeout: 30000});

    await appnameButton.click();

    //await this.page.getByRole('button', {name: InfraEng.applicationName}).click();

    
});

Then('I validate IaC Generation status', async function () {

    await this.page.getByRole('button', { name: 'Build' }).click();

    const initiateButton =
        this.page.getByRole('button', {
            name: 'Initiate IaC Generation'
        });

    const updateAppStackButton =
        this.page.getByRole('button', {
            name: 'Update App Stack'
        });

    await this.page.waitForTimeout(3000);

    if (await initiateButton.isVisible().catch(() => false)) {

        console.log('IaC Generation is pending');

        await initiateButton.click();

        await expect(
            this.page.getByText(
                'App Stack Created Successfully'
            )
        ).toBeVisible();

    } else if (
        await updateAppStackButton
            .isVisible()
            .catch(() => false)
    ) {

        await updateAppStackButton.click();

        await expect(
            this.page.getByText(
                'App Stack Updated Successfully'
            )
        ).toBeVisible();

        await expect(
            this.page.getByText(
                'Supported resources are'
            )
        ).toBeVisible();

    } else {

        console.log(
            'IaC Generation already completed'
        );
    }

    await expect(
        this.page.getByRole('link', {
            name: 'View App Stack'
        })
    ).toBeVisible();
//     const screenshot = await this.page.screenshot({ fullPage: true });
//   this.attach(screenshot, "image/png");
});

Then('I capture supported resources', async function () {

    await expect(
        this.page.getByRole('link', {
            name: 'View App Stack'
        })
    ).toBeVisible();

    const supportedSection =
        this.page.getByText(
            'Supported',
            { exact: true }
        ).locator('..');

    this.supportedApps =
        await supportedSection
            .locator('span')
            .allTextContents()
            .then(list => list.map(s => (s || '').trim()).filter(s => s !== '' && !/^none$/i.test(s)));

    console.log(
        '===== Supported Apps ====='
    );

    if (!this.supportedApps || this.supportedApps.length === 0) {
        console.log('No supported apps found (Supported shows None or empty)');
    } else {
        this.supportedApps.forEach((app, index) => console.log(`${index + 1}. ${app}`));
    }
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");
});

Then(
'I validate App Stack resources in StackGen',

async function () {

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
        .getByTestId(
            'filter-search-text-box'
        )
        .fill(
            this.appName
        );

    await this.page1.waitForTimeout(2000);
    // await this.page1
    //     .locator(
    //         '[data-testid^="appstack-name-link-"]'
    //     )
    //     .filter({
    //         hasText:
    //         this.appName
    //     })
    //     .click();
    await this.page1
    .locator('[data-testid^="appstack-name-link-"]')
    .filter({ hasText: this.appName })
    .first()
    .waitFor({ state: 'visible' });

    await this.page1
    .locator('[data-testid^="appstack-name-link-"]')
    .filter({ hasText: this.appName })
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

    // If StackGen shows no resource nodes, fail with a helpful message
    if (!names || names.length === 0) {
        const msg = 'StackGen returned no resource nodes for app: ' + this.appName + '. Ensure App Stack was created/updated.';
        this.attach(msg, 'text/plain');
        throw new Error(msg);
    }

    console.log(names);

    console.log(
        '===== Resource Comparison ====='
    );

    for (const app of this.supportedApps) {

        const appWords = app
            .toLowerCase()
            .replace('amazon', '')
            .trim()
            .split(/\s+/);

        const matched =
            names.some(resource => {

            const normalizedResource =
                resource
                    .toLowerCase()
                    .replace('aws_', '')
                    .replace(/_/g, ' ');

            return appWords.some(word =>
                normalizedResource.includes(word)
            );
        });

        console.log(`${matched ? '✅' : '❌'} ${app}`);

        if (!matched) {
            const msg = `No matching StackGen resource found for supported app: ${app}. See attached StackGen screenshot.`;
            this.attach(msg, 'text/plain');
            throw new Error(msg);
        }
    }
});

Then('I Validate the edit tag button',async function(){

    await expect(this.page.getByRole('button', { name: 'Edit Tags' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Edit Tags' }).click();

    await expect(this.page.getByRole('heading', { name: 'Edit Tags' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    const textbox = this.page.getByRole('textbox');

    // Validate AppStack from another cloud provider
    await textbox.clear();
    await textbox.fill(InfraEng.crossProviderAppStack);
    await this.page.getByRole('button', { name: 'Save' }).click();

    await expect(this.page.getByText(/Cannot link AppStacks across different cloud providers/i)).toBeVisible();

    // Validate invalid AppStack
    await textbox.clear();
    await textbox.fill(InfraEng.invalidAppStack);
    await this.page.getByRole('button', { name: 'Save' }).click();

    await expect(this.page.getByText(`Invalid AppStack name "${InfraEng.invalidAppStack}`)).toBeVisible();

    // Validate valid AppStack
    await textbox.clear();
    await textbox.fill(InfraEng.validAppStack);
    await this.page.getByRole('button', { name: 'Save' }).click();
});


Then(
'I validate App Stack resources in StackGen separte',

async function () {

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

    await this.page1.waitForTimeout(5000);

    await this.page1
        .getByTestId(
            'filter-search-text-box'
        )
        .fill(
            InfraEng.applicationName
        );

    await this.page1
    .locator('[data-testid^="appstack-name-link-"]', {
        hasText: InfraEng.applicationName
    })
    .first()
    .click();

    // await this.page1
    //     .locator(
    //         '[data-testid^="appstack-name-link-"]'
    //     )
    //     .filter({
    //         hasText:
    //         InfraEng.searchText
    //     })
    //     .click();

    await this.page1.waitForTimeout(5000);

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

    console.log(
        '===== Resource Comparison ====='
    );

    for (const app of this.supportedApps) {

        const appWords = app
            .toLowerCase()
            .replace('amazon', '')
            .trim()
            .split(/\s+/);

        const matched =
            names.some(resource => {

            const normalizedResource =
                resource
                    .toLowerCase()
                    .replace('aws_', '')
                    .replace(/_/g, ' ');

            return appWords.some(word =>
                normalizedResource.includes(word)
            );
        });

        console.log(
            `${matched ? '✅' : '❌'} ${app}`
        );

        expect(matched).toBeTruthy();
    }
});
*/

const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { InfraEng ,stackgen} = require('../../config/data');
//const { appName } = require('../support/_shared');

When('I Click the Infra Engineering', async function () {

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).click();

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(InfraEng.searchText);

    await this.page.getByText('View Apps').click();

    const appnameButton = this.page.getByRole('button', {name: InfraEng.applicationName});

    await appnameButton.waitFor({state: 'visible',timeout: 30000});

    await appnameButton.click();

    //await this.page.getByRole('button', {name: InfraEng.applicationName}).click();

    
});

Then('I validate IaC Generation status', async function () {

    await this.page.getByRole('button', { name: 'Build' }).click();

    const initiateButton =
        this.page.getByRole('button', {
            name: 'Initiate IaC Generation'
        });

    const updateAppStackButton =
        this.page.getByRole('button', {
            name: 'Update App Stack'
        });

    await this.page.waitForTimeout(3000);

    if (await initiateButton.isVisible().catch(() => false)) {

        console.log('IaC Generation is pending');

        await initiateButton.click();

        await expect(
            this.page.getByText(
                'App Stack Created Successfully'
            )
        ).toBeVisible();

    } else if (
        await updateAppStackButton
            .isVisible()
            .catch(() => false)
    ) {

        await updateAppStackButton.click();

        await expect(
            this.page.getByText(
                'App Stack Updated Successfully'
            )
        ).toBeVisible();

        await expect(
            this.page.getByText(
                'Supported resources are'
            )
        ).toBeVisible();

    } else {

        console.log(
            'IaC Generation already completed'
        );
    }

    await expect(
        this.page.getByRole('link', {
            name: 'View App Stack'
        })
    ).toBeVisible();
//     const screenshot = await this.page.screenshot({ fullPage: true });
//   this.attach(screenshot, "image/png");
});

// ---------- UPDATED: capture "Available Services in App Stack" chips instead of "Supported" section ----------
Then('I capture available services', async function () {

    await expect(
        this.page.getByRole('link', {
            name: 'View App Stack'
        })
    ).toBeVisible();

    const availableServicesSection =
        this.page.getByText(
            'Available Services in App Stack',
            { exact: true }
        ).locator('..');

    this.availableServices =
        await availableServicesSection
            .locator('.v5-MuiChip-label')
            .allTextContents();

    console.log(
        '===== Available Services in App Stack ====='
    );

    this.availableServices
        .filter(app => app.trim() !== '')
        .forEach((app, index) => {

            console.log(
                `${index + 1}. ${app}`
            );
        });

    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");
});

Then(
'I validate App Stack resources in StackGen',

async function () {

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
        .getByTestId(
            'filter-search-text-box'
        )
        .fill(
            this.appName
        );

    await this.page1.waitForTimeout(2000);
    
    await this.page1
    .locator('[data-testid^="appstack-name-link-"]')
    .filter({ hasText: this.appName })
    .first()
    .waitFor({ state: 'visible' });

    await this.page1
    .locator('[data-testid^="appstack-name-link-"]')
    .filter({ hasText: this.appName })
    .first()
    .click();

    await this.page1.waitForTimeout(3000);

    const resourceNames =
        this.page1.locator(' .react-flow__node-customResourceNode .text-sm.font-semibold span');

    const names =
        await resourceNames
            .allTextContents();

    const screenshot = await this.page1.screenshot({ fullPage: true });
  this.attach(screenshot, "image/png");

    console.log(names);

    console.log(
        '===== Resource Comparison ====='
    );

    for (const app of this.availableServices) {

        const appWords = app
            .toLowerCase()
            .replace('amazon', '')
            .replace('google', '')
            .trim()
            .split(/\s+/);

        const matched =
            names.some(resource => {

            const normalizedResource =
                resource
                    .toLowerCase()
                    .replace('aws_', '')
                    .replace('gcp_', '')
                    .replace(/_/g, ' ');

            return appWords.some(word =>
                normalizedResource.includes(word)
            );
        });

        console.log(
            `${matched ? '✅' : '❌'} ${app}`
        );

        expect(matched).toBeTruthy();
    }
});

Then('I Validate the edit tag button',async function(){

    await expect(this.page.getByRole('button', { name: 'Edit Tags' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Edit Tags' }).click();

    await expect(this.page.getByRole('heading', { name: 'Edit Tags' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    const textbox = this.page.getByRole('textbox');

    // Validate AppStack from another cloud provider
    await textbox.clear();
    await textbox.fill(InfraEng.crossProviderAppStack);
    await this.page.getByRole('button', { name: 'Save' }).click();

    await expect(this.page.getByText(/Cannot link AppStacks across different cloud providers/i)).toBeVisible();

    // Validate invalid AppStack
    await textbox.clear();
    await textbox.fill(InfraEng.invalidAppStack);
    await this.page.getByRole('button', { name: 'Save' }).click();

    await expect(this.page.getByText(`Invalid AppStack name "${InfraEng.invalidAppStack}`)).toBeVisible();

    // Validate valid AppStack
    await textbox.clear();
    await textbox.fill(InfraEng.validAppStack);
    await this.page.getByRole('button', { name: 'Save' }).click();
});


Then(
'I validate App Stack resources in StackGen separte',

async function () {

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

    await this.page1.waitForTimeout(5000);

    await this.page1
        .getByTestId(
            'filter-search-text-box'
        )
        .fill(
            InfraEng.validAppStack
        );

    await this.page1
    .locator('[data-testid^="appstack-name-link-"]', {
        hasText: InfraEng.validAppStack
    })
    .first()
    .click();

    await this.page1.waitForTimeout(5000);

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

    console.log(
        '===== Resource Comparison ====='
    );

    for (const app of this.availableServices) {

        const appWords = app
            .toLowerCase()
            .replace('amazon', '')
            .replace('google', '')
            .trim()
            .split(/\s+/);

        const matched =
            names.some(resource => {

            const normalizedResource =
                resource
                    .toLowerCase()
                    .replace('aws_', '')
                    .replace('gcp_', '')
                    .replace(/_/g, ' ');

            return appWords.some(word =>
                normalizedResource.includes(word)
            );
        });

        console.log(
            `${matched ? '✅' : '❌'} ${app}`
        );

        expect(matched).toBeTruthy();
    }
});