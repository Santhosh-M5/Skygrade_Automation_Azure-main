const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');
const state = require('./state');

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.data = {};
    this.shared = process.env.SHARE_SESSION === 'true';
  }

  async openBrowser() {
    // Reuse the shared session only if it's still alive.
    if (state.browser && state.browser.isConnected() && state.context) {
      try {
        if (!state.page || state.page.isClosed()) {
          state.page = await state.context.newPage();
          state.page.setDefaultTimeout(30000);
        }
        this.browser = state.browser;
        this.context = state.context;
        this.page = state.page;
        return;
      } catch (e) { /* context dead → relaunch below */ }
    }

    // First scenario, or the session died: launch fresh.
    await this.close().catch(() => {});
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: Number(process.env.SLOW_MO) || 300,
      args: ['--no-sandbox', '--ignore-certificate-errors', '--start-maximized'],
    });
    this.context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null,
      acceptDownloads: true,
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);

    state.browser = this.browser;
    state.context = this.context;
    state.page = this.page;
  }

  setData(key, value) { this.data[key] = value; }
  getData(key) { return this.data[key]; }

  async close() {
    if (state.page)    await state.page.close().catch(() => {});
    if (state.context) await state.context.close().catch(() => {});
    if (state.browser) await state.browser.close().catch(() => {});
    state.page = state.context = state.browser = null;
  }
}

setWorldConstructor(CustomWorld);
module.exports = CustomWorld;
