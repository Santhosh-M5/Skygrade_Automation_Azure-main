const { BeforeAll, AfterAll, Before, After, Status, setDefaultTimeout } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');

setDefaultTimeout(60000);

Before(async function (scenario) {
  this.pickle = scenario.pickle;
  await this.openBrowser();   // launches on scenario 1, reuses afterward
});

After(async function (scenario) {
  if (scenario.result && scenario.result.status === Status.FAILED && this.page) {
    try {
      const dir = path.resolve(__dirname, '../screenshots');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `FAILED_${scenario.pickle.name.replace(/\s+/g, '_')}_${Date.now()}.png`);
      const buffer = await this.page.screenshot({ path: file, fullPage: true });
      this.attach(buffer, 'image/png');
    } catch (e) { /* ignore */ }
  }
  // NOTE: do NOT close here anymore
});

AfterAll(async function () {
  // Close the single shared browser after all scenarios finish
  const CustomWorld = require('./world');
  await new CustomWorld({}).close();
});
