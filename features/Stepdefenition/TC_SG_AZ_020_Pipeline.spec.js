const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { pipeline } = require('../../config/data');

When('I open the Pipeline application', async function () {

    await this.page.getByRole('textbox', {name: 'Search'}).click();

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(pipeline.searchText);

    await this.page.getByText('View Apps').click();

    await this.page.waitForTimeout(6000);

    await this.page.getByRole('button', {
        name: pipeline.applicationName
    }).click();

    await this.page.getByRole('button', { name: 'Deploy Deploy' }).click();

    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");
});

Then('I create a CI Pipeline', async function () {

    await this.page.getByRole('button', { name: 'Deploy Deploy' }).click();

    await this.page.waitForSelector(
        'button:has-text("Create New Pipeline"), button:has-text("Create Pipeline")',
        { timeout: 10000 }
    );

    const isNewPipeline = await this.page
        .getByRole('button', {
            name: 'Create New Pipeline'
        })
        .isVisible()
        .catch(() => false);

    if (isNewPipeline) {

        await expect(
            this.page.getByRole('heading', {
                name: 'No Pipelines yet'
            })
        ).toBeVisible();

        await this.page.getByRole('button', {
            name: 'Create New Pipeline'
        }).click();

    } else {

        await this.page.getByRole('button', {
            name: 'Create Pipeline'
        }).click();
    }

    await expect(
        this.page.getByRole('heading', {
            name: 'Create a new component'
        })
    ).toBeVisible();

    await this.page
        .getByRole('heading', {
            name: 'Spring Boot With Azure CI using GitHub Actions'
        })
        .locator('../..')
        .getByRole('button', {
            name: 'Choose'
        })
        .click();

    await this.page.getByRole('textbox', { name: 'Java Artifact ID' }).click();
    await this.page.getByRole('textbox', { name: 'Java Artifact ID' }).fill('ci-demo');
    await this.page.getByRole('textbox', { name: 'Project Name of Checkmarx' }).click();
    await this.page.getByRole('textbox', { name: 'Project Name of Checkmarx' }).fill(pipeline.applicationName);
    await this.page.getByRole('textbox', { name: 'Project Name of Blackduck' }).click();
    await this.page.getByRole('textbox', { name: 'Project Name of Blackduck' }).fill(pipeline.applicationName);
    await this.page.getByRole('textbox', { name: 'Branch Name' }).click();
    await this.page.getByRole('textbox', { name: 'Branch Name' }).fill('main');
    await this.page.getByRole('textbox', { name: 'Runner Label' }).click();
    await this.page.getByRole('textbox', { name: 'Runner Label' }).fill(`arc-runner-set-${pipeline.applicationName}`);
    await expect(this.page.getByRole('button', { name: 'Review' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Review' }).click();
    await expect(this.page.getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Back' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Create' }).click();
    await expect(this.page.getByText('Run of Spring Boot With Azure')).toBeVisible();
    await this.page.waitForTimeout(7000);
    

    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");
});

Then('I verify the CI Pipeline is created', async function () {

    const modernization = this.page.getByRole('button', { name: /^Modernization/ });
    const appModernization = this.page.getByRole('button', { name: /^App Modernization/ });
    const portfolioAnalysis = this.page.getByText('Portfolio Analysis', { exact: true });

    await modernization.waitFor({ state: 'visible' });

    const isExpanded = async (btn) => (await btn.textContent()).includes('−');

    if (!(await portfolioAnalysis.isVisible())) {
    if (!(await appModernization.isVisible())) {
        await modernization.click();
    }
    if (!(await isExpanded(appModernization))) {
        await appModernization.click();
        }
    }
    await portfolioAnalysis.click();

    

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(pipeline.searchText);

    await this.page.getByText('View Apps').click();

    await this.page.waitForTimeout(5000);

    await this.page.getByRole('button', {
        name: pipeline.applicationName
    }).click();

    await this.page.getByRole('button', { name: 'Deploy Deploy' }).click();

    await expect(
        this.page.getByText(
            `skygrade-${pipeline.applicationName}-ci`
        )
    ).toBeVisible();
});

Then('I create a CD Pipeline', async function () {

    await this.page.getByRole('button', { name: 'Deploy Deploy' }).click();

    const isNewPipeline = await this.page
        .getByRole('button', {
            name: 'Create New Pipeline'
        })
        .isVisible()
        .catch(() => false);

    if (isNewPipeline) {

        await this.page.getByRole('button', {
            name: 'Create New Pipeline'
        }).click();

    } else {

        await this.page.getByRole('button', {
            name: 'Create Pipeline'
        }).click();
    }

    await expect(
        this.page.getByRole('heading', {
            name: 'Azure CD pipeline using Github'
        })
    ).toBeVisible();

    const card = this.page.locator('div')
        .filter({
            has: this.page.locator('h4', {
                hasText: 'Azure CD pipeline using Github Actions'
            })
        })
        .filter({
            has: this.page.getByTestId('template-card-actions--create')
        })
        .last();

    await card
        .getByTestId('template-card-actions--create')
        .click();

    await this.page.getByRole('textbox', { name: 'Azure Location' }).click();
    await this.page.getByRole('textbox', { name: 'Azure Location' }).fill('eastus');
    await this.page.getByRole('textbox', { name: 'Branch Name' }).click();
    await this.page.getByRole('textbox', { name: 'Branch Name' }).fill('main');
    await this.page.getByRole('textbox', { name: 'App Name' }).click();
    await this.page.getByRole('textbox', { name: 'App Name' }).fill(pipeline.applicationName.toLowerCase());
    await this.page.getByRole('textbox', { name: 'Image Name' }).click();
    await this.page.getByRole('textbox', { name: 'Image Name' }).fill(`crskygrade.azurecr.io/${pipeline.applicationName}`);
    await this.page.getByRole('textbox', { name: 'Runner Label' }).click();
    await this.page.getByRole('textbox', { name: 'Runner Label' }).fill(`arc-runner-set-${pipeline.applicationName}`);    await this.page.getByRole('textbox', { name: 'Namespace Name' }).click();
    await this.page.getByRole('textbox', { name: 'Namespace Name' }).fill('skygrade');
    await this.page.getByRole('textbox', { name: 'Cluster Name' }).click();
    await this.page.getByRole('textbox', { name: 'Cluster Name' }).fill('AKS');
    await this.page.getByRole('textbox', { name: 'Cluster Name' }).fill('AKS-skygrade-dev');
    await this.page.getByRole('textbox', { name: 'Storage Account Name' }).click();
    await this.page.getByRole('textbox', { name: 'Storage Account Name' }).fill('strgskygradedev');
    await this.page.getByRole('textbox', { name: 'Container Name' }).click();
    await this.page.getByRole('textbox', { name: 'Container Name' }).fill('skygrade-pipeline');
    await this.page.getByRole('textbox', { name: 'Managed Identity Client ID' }).click();
    await this.page.getByRole('textbox', { name: 'Managed Identity Client ID' }).fill('f0cb6743-ac87-40c1-84c2-ffb46596fc71');
    await this.page.getByRole('textbox', { name: 'Resource Group Name' }).click();
    await this.page.getByRole('textbox', { name: 'Resource Group Name' }).fill('RG-skygrade');
    await expect(this.page.getByRole('button', { name: 'Review' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Review' }).click();
    await this.page.waitForTimeout(3000);

    await expect(this.page.getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Back' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Create' }).click();
    await expect(this.page.getByText('Run of Azure CD pipeline using Github Actions')).toBeVisible();
    await this.page.waitForTimeout(7000);
  
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");

});

Then('I verify the CD Pipelines are created', async function () {

    const modernization = this.page.getByRole('button', { name: /^Modernization/ });
    const appModernization = this.page.getByRole('button', { name: /^App Modernization/ });
    const portfolioAnalysis = this.page.getByText('Portfolio Analysis', { exact: true });

    await modernization.waitFor({ state: 'visible' });

    const isExpanded = async (btn) => (await btn.textContent()).includes('−');

    if (!(await portfolioAnalysis.isVisible())) {
    if (!(await appModernization.isVisible())) {
        await modernization.click();
    }
    if (!(await isExpanded(appModernization))) {
        await appModernization.click();
        }
    }
    await portfolioAnalysis.click();

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(pipeline.searchText);

    await this.page.getByText('View Apps').click();

    await this.page.waitForTimeout(5000);

    await this.page.getByRole('button', {
        name: pipeline.applicationName
    }).click();

    await this.page.getByRole('button', { name: 'Deploy Deploy' }).click();

    await expect(
        this.page.getByText(
            `skygrade-${pipeline.applicationName}-cd-pipeline-dev`
        )
    ).toBeVisible();

    await expect(
        this.page.getByText(
            `skygrade-${pipeline.applicationName}-cd-pipeline-qa`
        )
    ).toBeVisible();

    await expect(
        this.page.getByText(
            `skygrade-${pipeline.applicationName}-cd-pipeline-prod`
        )
    ).toBeVisible();
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");
});

