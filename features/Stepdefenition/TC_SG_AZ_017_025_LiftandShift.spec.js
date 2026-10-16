const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const { getScenarioData } = require('../../support/testdatahelper.js');

async function shot1(w, l) { try { if (l) w.attach(l, 'text/plain'); if (w.page) w.attach(await w.page.screenshot(), 'image/png'); } catch (e) {} }

const {LiftAndShift,matilda} = require('../../config/data.js');

function generateRandomIP() {
    return `10.${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10) + 1}`;
}

function normalize(value) {

    const v = value?.trim() || '';

    return v === ''
        ? '-'
        : v;
}

When(
'I open the Lift And Shift application',

async function () {

    this.newServer = generateRandomIP();

    do {

        this.addServer =
            generateRandomIP();

    } while (
        this.addServer ===
        this.newServer
    );

    await this.page
        .getByRole('textbox', {
            name: 'Search'
        })
        .fill(
            LiftAndShift.applicationName
        );

    await this.page
        .getByText('View Apps')
        .click();

    const appButton = this.page.getByRole('button', {
    name: LiftAndShift.applicationName
    });

    await appButton.waitFor({
        state: 'visible',
        timeout: 60000
    });

    await appButton.click();

    //await this.page.getByRole('button', {name:LiftAndShift.applicationName}).click();

    await this.page
        .locator(
            'div[role="button"]'
        )
        .filter({
            hasText: 'Build'
        })
        .click();

    await this.page
        .getByText(
            'App Engineering'
        )
        .click();
});

When('I configure Lift And Shift', async function () {
    await this.page.getByText('Build').click();
    await this.page.getByText('App Engineering').click();
    
    this.newServer = generateRandomIP();

    do {
        this.addServer =generateRandomIP();
    } while (
        this.addServer ===
        this.newServer
    );


    const liftShiftBtn = this.page.getByRole('button', { name: 'Initiate Lift And Shift' });

    const liftShiftVisible = await liftShiftBtn
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);

    if (liftShiftVisible) {

        await liftShiftBtn.click();

        await this.page.getByRole('textbox', { name: 'e.g.' }).fill(this.newServer);

        await Promise.all([
            this.page.waitForEvent('popup'),
            this.page.getByRole('button', { name: 'Save' }).click()
        ]);
    }

    await this.page.getByRole('button', { name: 'add Add' }).click();

    await this.page.getByRole('textbox', { name: 'e.g.' }).fill(this.addServer);

    await this.page.getByRole('button', { name: 'Save' }).click();
});

When(
'I update Lift And Shift tags',

async function () {

    // await this.page.getByRole('button', {name: 'add Add'}).click();

    // await this.page.getByRole('textbox', {name: 'e.g.'}).fill(this.addServer);

    // await this.page.getByRole('button', {name: 'Save'}).click();

    await this.page
        .getByRole('button', {
            name:
            'edit Edit Tags'
        })
        .click();

    await this.page
        .getByRole('textbox')
        .fill(
            LiftAndShift.invalidAppName
        );

    await this.page
        .getByRole('button', {
            name: 'Update'
        })
        .click();

    await expect(
        this.page.locator('body')
    ).toContainText(
        "App name entered doesn't match."
    );

    await this.page
        .getByRole('textbox')
        .fill(
            LiftAndShift
                .comparisonApplication
        );

    await this.page
        .getByRole('button', {
            name: 'Update'
        })
        .click();

    //await this.page.getByRole('button', {name: 'close'}).click();

    await this.page
        .getByRole('button', {
            name:
            'refresh Refresh'
        })
        .click();
});

When(
'I capture server details from Skygrade',

async function () {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    const serverTable =
        this.page.locator('table')
            .filter({
                has: this.page
                    .locator(
                        'th:has-text("IP Address")'
                    )
            });

    const sourceRows =
        serverTable.locator(
            'tbody tr'
        );

    const count =
        await sourceRows.count();

    this.sourceData = [];

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const row =
            sourceRows.nth(i);

        this.sourceData.push({

            ipAddress:
                normalize(
                    await row
                        .locator('td')
                        .nth(0)
                        .textContent()
                ),

            hostName:
                normalize(
                    await row
                        .locator('td')
                        .nth(1)
                        .textContent()
                ),

            operatingSystem:
                normalize(
                    await row
                        .locator('td')
                        .nth(2)
                        .textContent()
                ),

            environment:
                normalize(
                    await row
                        .locator('td')
                        .nth(3)
                        .textContent()
                ),

            accountGroup:
                normalize(
                    await row
                        .locator('td')
                        .nth(4)
                        .textContent()
                )
        });
    }

    console.log(
        this.sourceData
    );
});

Then(
'I validate server details in Matilda',async function () {
    
    const [page1] =
        await Promise.all([
            this.page.waitForEvent('popup'),
            this.page.getByRole('link',{name:LiftAndShift.comparisonApplication}).click()
        ]);

    await page1
        .locator(
            'input[name="username"]'
        )
        .fill(
            matilda.username
        );

    await page1
        .locator(
            'input[name="password"]'
        )
        .fill(
            matilda.password
        );

    await page1
        .getByRole('button', {
            name: 'Sign In'
        })
        .click();

    await page1
        .getByText('Applications')
        .click();

    await page1
        .getByText('Discover')
        .click();

    await page1
        .getByRole('searchbox', {
            name: 'Search'
        })
        .fill(
            LiftAndShift
                .comparisonApplication
        );
    await page1.getByRole('button').filter({ hasText: /^$/ }).click();
    await page1.waitForLoadState('networkidle');

    // Wait for a real signal instead of relying solely on a fixed timeout
    await expect(
        page1.locator('table tbody tr').first()
    ).toBeVisible();

    // Scope to the correct table on page1 (same approach used for the source table)
    const targetTable =
        page1.locator('table')
            .filter({
                has: page1.locator(
                    'th:has-text("IP Address")'
                )
            });

    const targetData = [];

    async function collectCurrentPage() {

        const targetRows =
            targetTable.locator(
                'tbody tr'
            );

        const targetCount =
            await targetRows.count();

        for (
            let i = 0;
            i < targetCount;
            i++
        ) {

            const row =
                targetRows.nth(i);

            targetData.push({

                ipAddress:
                    normalize(
                        await row
                            .locator('td')
                            .nth(4)
                            .textContent()
                    ),

                hostName:
                    normalize(
                        await row
                            .locator('td')
                            .nth(3)
                            .textContent()
                    ),

                operatingSystem:
                    normalize(
                        await row
                            .locator('td')
                            .nth(5)
                            .textContent()
                    ),

                environment:
                    normalize(
                        await row
                            .locator('td')
                            .nth(6)
                            .textContent()
                    ),

                accountGroup:
                    normalize(
                        await row
                            .locator('td')
                            .nth(8)
                            .textContent()
                    )
            });
        }
    }

    await collectCurrentPage();

    // ngx-pagination: <li class="pagination-next"><a>...</a></li>
    // On the last page this li gets a "disabled" class, same as pagination-previous does on page 1.
    const nextPageItem =
        page1.locator(
            'nav[aria-label="Pagination"] li.pagination-next'
        );

    while (true) {

        const isDisabled =
            await nextPageItem
                .evaluate(el =>
                    el.classList.contains('disabled')
                )
                .catch(() => true);

        if (isDisabled) break;

        // Capture the first row's IP so we can confirm the table content actually changed
        const firstIpBefore =
            await targetTable
                .locator('tbody tr')
                .first()
                .locator('td')
                .nth(4)
                .textContent();

        await nextPageItem
            .locator('a')
            .click();

        // Wait until the first row's content differs from the previous page
        await expect(async () => {
            const firstIpAfter =
                await targetTable
                    .locator('tbody tr')
                    .first()
                    .locator('td')
                    .nth(4)
                    .textContent();
            expect(firstIpAfter).not.toBe(firstIpBefore);
        }).toPass({ timeout: 5000 });

        await collectCurrentPage();
    }

    console.log(targetData);

    for (
        const sourceServer
        of this.sourceData
    ) {

        const targetServer =
            targetData.find(
                t =>
                t.ipAddress ===
                sourceServer.ipAddress
            );
        
        expect.soft(
            targetServer,
            `Server not found: ${sourceServer.ipAddress}`
        ).toBeTruthy();

        if (!targetServer)
            continue;

        expect.soft(
            targetServer.hostName
        ).toBe(
            sourceServer.hostName
        );

        expect.soft(
            targetServer
                .operatingSystem
        ).toBe(
            sourceServer
                .operatingSystem
        );

        expect.soft(
            targetServer.environment
        ).toBe(
            sourceServer.environment
        );

        expect.soft(
            targetServer.accountGroup
        ).toBe(
            sourceServer.accountGroup
        );
    }

    await shot1(this, `Lift & Shift initiated`);

    await this.page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().click({ timeout: 10000 }).catch(() => {});

    await this.page.waitForTimeout(1500);

    


});

Then(
'I validate server details in Matilda for fullflow',async function () {
    const { appName } = getScenarioData(this);
    const [page1] =
        await Promise.all([
            this.page.waitForEvent('popup'),
            this.page.getByRole('link',{name: appName}).click()
        ]);

    await page1
        .locator(
            'input[name="username"]'
        )
        .fill(
            matilda.username
        );

    await page1
        .locator(
            'input[name="password"]'
        )
        .fill(
            matilda.password
        );

    await page1
        .getByRole('button', {
            name: 'Sign In'
        })
        .click();

    await page1
        .getByText('Applications')
        .click();

    await page1
        .getByText('Discover')
        .click();

    await page1
        .getByRole('searchbox', {
            name: 'Search'
        })
        .fill(appName);
    await page1.getByRole('button').filter({ hasText: /^$/ }).click();
    await page1.waitForLoadState('networkidle');

    // Wait for a real signal instead of relying solely on a fixed timeout
    await expect(
        page1.locator('table tbody tr').first()
    ).toBeVisible();

    // Scope to the correct table on page1 (same approach used for the source table)
    const targetTable =
        page1.locator('table')
            .filter({
                has: page1.locator(
                    'th:has-text("IP Address")'
                )
            });

    const targetData = [];

    async function collectCurrentPage() {

        const targetRows =
            targetTable.locator(
                'tbody tr'
            );

        const targetCount =
            await targetRows.count();

        for (
            let i = 0;
            i < targetCount;
            i++
        ) {

            const row =
                targetRows.nth(i);

            targetData.push({

                ipAddress:
                    normalize(
                        await row
                            .locator('td')
                            .nth(4)
                            .textContent()
                    ),

                hostName:
                    normalize(
                        await row
                            .locator('td')
                            .nth(3)
                            .textContent()
                    ),

                operatingSystem:
                    normalize(
                        await row
                            .locator('td')
                            .nth(5)
                            .textContent()
                    ),

                environment:
                    normalize(
                        await row
                            .locator('td')
                            .nth(6)
                            .textContent()
                    ),

                accountGroup:
                    normalize(
                        await row
                            .locator('td')
                            .nth(8)
                            .textContent()
                    )
            });
        }
    }

    await collectCurrentPage();

    // ngx-pagination: <li class="pagination-next"><a>...</a></li>
    // On the last page this li gets a "disabled" class, same as pagination-previous does on page 1.
    const nextPageItem =
        page1.locator(
            'nav[aria-label="Pagination"] li.pagination-next'
        );

    while (true) {

        const isDisabled =
            await nextPageItem
                .evaluate(el =>
                    el.classList.contains('disabled')
                )
                .catch(() => true);

        if (isDisabled) break;

        // Capture the first row's IP so we can confirm the table content actually changed
        const firstIpBefore =
            await targetTable
                .locator('tbody tr')
                .first()
                .locator('td')
                .nth(4)
                .textContent();

        await nextPageItem
            .locator('a')
            .click();

        // Wait until the first row's content differs from the previous page
        await expect(async () => {
            const firstIpAfter =
                await targetTable
                    .locator('tbody tr')
                    .first()
                    .locator('td')
                    .nth(4)
                    .textContent();
            expect(firstIpAfter).not.toBe(firstIpBefore);
        }).toPass({ timeout: 5000 });

        await collectCurrentPage();
    }

    console.log(targetData);

    for (
        const sourceServer
        of this.sourceData
    ) {

        const targetServer =
            targetData.find(
                t =>
                t.ipAddress ===
                sourceServer.ipAddress
            );
        
        expect.soft(
            targetServer,
            `Server not found: ${sourceServer.ipAddress}`
        ).toBeTruthy();

        if (!targetServer)
            continue;

        expect.soft(
            targetServer.hostName
        ).toBe(
            sourceServer.hostName
        );

        expect.soft(
            targetServer
                .operatingSystem
        ).toBe(
            sourceServer
                .operatingSystem
        );

        expect.soft(
            targetServer.environment
        ).toBe(
            sourceServer.environment
        );

        expect.soft(
            targetServer.accountGroup
        ).toBe(
            sourceServer.accountGroup
        );
    }

    await shot1(this, `Lift & Shift initiated`);

    await this.page.getByRole('button', { name: /Approve & Proceed|Proceed/i }).first().click({ timeout: 10000 }).catch(() => {});

    await this.page.waitForTimeout(1500);

    


});