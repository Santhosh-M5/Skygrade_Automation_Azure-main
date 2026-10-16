const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

const RBAC  = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/rbac-data.json'), 'utf8'));
const PERM  = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/rbac-permissions.json'), 'utf8'));
const APPS  = PERM.apps;
const SCOPE = PERM.scopeAssignments || [];
const APP_URL = RBAC.appUrl.replace(/\/+$/, '');

const emailOf     = (u) => u.email || `${u.username}@${RBAC.emailDomain || 'cognizant.com'}`;
const resolveUser = (role) => {
  const u = RBAC.users[role];
  if (!u) throw new Error(`No user "${role}" in rbac-data.json`);
  return { username: u.username, password: u.password };
};
async function shot(w, l) { if (l) w.attach(l, 'text/plain'); if (w.page) w.attach(await w.page.screenshot(), 'image/png'); }

// ── Auth (Keycloak popup) ────────────────────────────────────────────────────
const keycloakBtn = (p) => p.getByRole('listitem').filter({ hasText: /Keycloak/i }).getByRole('button');
const landing = (p) => p.getByRole('button', { name: 'Create Portfolio' }).or(p.getByRole('button', { name: 'Settings' })).first();
let currentRole = null;

async function login(page, username, password) {
  const popupPromise = page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);
  await keycloakBtn(page).click().catch(() => {});
  const popup = await popupPromise;
  if (popup) {
    await popup.getByRole('textbox', { name: 'Username or email' }).fill(username).catch(() => {});
    await popup.getByRole('textbox', { name: 'Password' }).fill(password).catch(() => {});
    await popup.getByRole('button', { name: 'Sign In' }).click().catch(() => {});
  }
  await landing(page).waitFor({ state: 'visible', timeout: 60000 });
}

async function logout(page) {
  await page.getByRole('button', { name: /^profile/i }).click().catch(() => {});
  await page.getByRole('menuitem', { name: 'Log Out' }).click().catch(() => {});
  await keycloakBtn(page).waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
}
async function ensureRole(page, role) {
  const { username, password } = resolveUser(role);
  if (currentRole !== role) {
    await page.context().clearCookies().catch(() => {});   // kill SSO so the new user's popup appears
  }
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  const loggedIn = await landing(page).isVisible({ timeout: 5000 }).catch(() => false);
  if (loggedIn && currentRole === role) return;
  await login(page, username, password);
  currentRole = role;
}


// ── Auth Settings via URL (avoid the collapsible sidebar) ─────────────────────
async function authSettings(page, tab) {   // tab = "Auth Group" | "User Mapping"
  await page.goto(APP_URL + '/settings/auth-settings', { waitUntil: 'domcontentloaded' });
  await page.getByText('Authorization Settings').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await page.getByRole('button', { name: new RegExp('^' + tab, 'i') }).first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);
}
async function openUserMapping(page) {
  await authSettings(page, 'User Mapping');
  await page.getByRole('button', { name: 'Add New User' }).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

// ── Navigation ────────────────────────────────────────────────────────────────
async function overview(p) {
  await p.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await p.getByRole('heading', { name: /App Modernization|Overview/i })
    .or(p.getByText('Portfolios', { exact: true })).first()
    .waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
}

// Cloud accounts page — the sidebar "Settings" section is collapsed by default,
// so expand it, confirm the Cloud link appears, then open Azure.
async function cloud(p) {
  await p.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  const cloudLink = p.getByRole('link', { name: 'Cloud' });
  if (!(await cloudLink.isVisible({ timeout: 3000 }).catch(() => false))) {
    await p.getByRole('button', { name: 'Settings' }).or(p.getByText('Settings', { exact: true })).first()
           .click({ timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(600);
  }
  if (!(await cloudLink.isVisible({ timeout: 3000 }).catch(() => false))) {
    await p.locator('li,div,button').filter({ hasText: /^Settings/ }).getByRole('button').first()
           .click({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(600);
  }
  await cloudLink.click({ timeout: 15000 }).catch(() => {});
  await p.getByText('Azure', { exact: true }).click({ timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1000);
}

async function serviceCatalog(p) {
  await p.getByRole('button', { name: /Cloud Provisioning/i }).click().catch(() => {});
  await p.getByRole('link', { name: 'Service Catalog' }).click().catch(() => {});
  await p.getByRole('button', { name: /Create an EC2/i }).first().click().catch(() => {});
  await p.waitForTimeout(800);
}
async function modernizationNav(p) {
  await p.getByRole('button', { name: 'Settings' }).click().catch(() => {});
  await p.getByRole('link', { name: /Modernization/i }).click().catch(() => {});
  await p.waitForTimeout(800);
}

// Stops at the apps LIST (for ADD_NEW_APPLICATION) — does NOT open an app.
// Adaptive: use Search if it's already on the landing page (infra roles land there),
// otherwise go via Modernization → App Modernization (app-architect landing).
async function openAppsList(p, which = 'nonMainframe') {
  const a = APPS[which];
  if (!a) throw new Error(`No app "${which}" in rbac-permissions.json`);
  await p.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  let s = p.getByRole('textbox', { name: 'Search' }).or(p.getByPlaceholder(/search/i)).first();
  if (!(await s.isVisible({ timeout: 5000 }).catch(() => false))) {
    await p.getByRole('button', { name: 'Modernization' }).first().click({ timeout: 15000 }).catch(() => {});
    await p.getByRole('link', { name: 'App Modernization' }).click({ timeout: 15000 }).catch(() => {});
    s = p.getByRole('textbox', { name: 'Search' }).or(p.getByPlaceholder(/search/i)).first();
  }
  await s.waitFor({ state: 'visible', timeout: 30000 });
  await s.fill(a.search);
  await p.waitForTimeout(800);
  if (a.clusterText) await p.getByText(a.clusterText).first().click({ timeout: 15000 }).catch(() => {});
  await p.getByText('View Apps').nth(a.viewAppsIndex ?? 0).click({ timeout: 15000 });
  await p.waitForTimeout(1000);
}
async function openApp(p, which = 'nonMainframe') {
  const a = APPS[which];
  await openAppsList(p, which);
  await p.getByRole('button', { name: a.app, exact: true }).click({ timeout: 20000 });
}

// Click a lifecycle stepper icon (Analysis / Plan / Build / Deploy / Cloud Ops).
// The icons expose doubled names like "Plan Plan", so "^label\b" matches.
async function stage(p, label) {
  const icon = p.getByRole('tab', { name: new RegExp(`^${label}\\b`, 'i') })
    .or(p.getByRole('button', { name: new RegExp(`^${label}\\b`, 'i') })).first();
  await icon.click({ timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
}
// Click a sub-tab within a stage (e.g. Observability / Security / FinOps under Cloud Ops).
async function subtab(p, name) {
  await p.getByRole('tab', { name: new RegExp(`^${name}$`, 'i') })
    .or(p.getByText(name, { exact: true })).first()
    .click({ timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(700);
}


// ── PROBES ────────────────────────────────────────────────────────────────────
const PROBES = {
  CREATE_PORTFOLIO:           async(p) => { await overview(p); return p.getByRole('button', { name: 'Create Portfolio' }); },
  ONBOARD_TRACK:              async(p) => { await overview(p); return p.getByRole('button', { name: /onboard/i }).first(); },
  CREATE_EMAIL_GROUP_MAPPING: async(p) => { await authSettings(p, 'User Mapping'); return p.getByRole('button', { name: 'Add New User' }); },

  DELETE_EMAIL_GROUP_MAPPING: async(p) => {
    await authSettings(p, 'User Mapping');
    await p.getByRole('button', { name: 'application-architect' }).first().click({ timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(500);
    await p.getByRole('row').filter({ has: p.getByRole('checkbox') }).first()
          .getByRole('checkbox').first().check({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(300);
    return p.getByRole('button', { name: /^Delete$/i }).first();
  },

  ADD_NEW_APPLICATION:        async(p) => { await openAppsList(p); return p.getByRole('button', { name: /Add new application/i }); },
  SAVE_MODERNISATION_SETTING: async(p) => { await modernizationNav(p); return p.getByRole('button', { name: 'Save' }); },

  ADD_CLOUD_ACCOUNT:          async(p) => { await cloud(p); return p.getByRole('button', { name: '+ Add Account' }); },
  DELETE_CLOUD_ACCOUNT:       async(p) => {
    await cloud(p);
    const cb = p.getByRole('checkbox');
    await cb.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const n = await cb.count().catch(() => 0);
    if (n > 1) await cb.nth(1).check({ timeout: 8000 }).catch(() => {});
    else       await cb.first().check({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(500);
    return p.getByRole('button', { name: /delete/i }).or(p.getByTitle(/do not have permission to delete/i)).first();
  },

  IMPORT_SERVICE_CATALOG:     async(p) => { await serviceCatalog(p); return p.getByRole('button', { name: 'Import Catalog' }); },

  RUN_ANALYSIS:               async(p) => {
    await openApp(p); await stage(p, 'Analysis');
    return p.getByRole('button', { name: /^Run Analysis$|^Generate Analysis$|Re-?Run Analysis|Re-?initiate Analysis/i }).first();
  },
  RE_RUN_ANALYSIS:            async(p) => { await openApp(p); await stage(p, 'Analysis'); return p.getByRole('button', { name: /Re-?Run Analysis|Re-?initiate Analysis/i }); },

  EDIT_PLAN:                  async(p) => { await openApp(p); await stage(p, 'Plan'); return p.getByRole('button', { name: 'Edit Plan' }); },
     APPROVE_PLAN: async(p) => {
    await openApp(p);
    await stage(p, 'Plan');
    await p.getByRole('button', { name: 'Edit Plan' }).click({ timeout: 8000 }).catch(() => {});
    await p.locator('button.jss4-5239').or(p.getByRole('button', { name: 'Update' })).first()
           .click({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1000);

    // Actually approve so the remaining Build/Deploy phases have an approved plan.
    const approve = p.locator('button.jss4-2470').or(p.getByRole('button', { name: /Approve & Proceed/i })).first();
    await approve.click({ timeout: 8000 }).catch(() => {});
    await p.getByRole('button', { name: /^Yes$|Confirm|Proceed/i }).click({ timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(1500);

    // Approve button is gone after proceeding — go back to Plan and assert on Edit Plan,
    // which stays usable for a role that has access (denied roles won't have it).
    await stage(p, 'Plan');
    return p.getByRole('button', { name: 'Edit Plan' }).or(approve).first();
  },


INITIATE_IAC_GENERATION: async (p) => {
  await openApp(p);
  await stage(p, 'Build');
  await subtab(p, 'Infra Engineering');

  // Initiate IaC Generation -> <button>
  const initiate = p.getByRole('button', { name: /Initiate IaC Generation/i });

  // View App Stack / Update App Stack -> <a href> (role = link)
  const viewOrUpdate = p.getByRole('link', { name: /View App Stack|Update App Stack/i });

  const btn = initiate.or(viewOrUpdate).filter({ visible: true }).first();

  await btn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  return btn;
},


  CREATE_PIPELINE:            async(p) => { await openApp(p); await stage(p, 'Deploy'); return p.getByRole('button', { name: /Create( New)? Pipeline/i }); },

  OBSERVABILITY:              async(p) => { await openApp(p); await stage(p, 'Cloud Ops'); await subtab(p, 'Observability'); return p.getByRole('button', { name: /edit tag/i }); },
  SECURITY:                   async(p) => { await openApp(p); await stage(p, 'Cloud Ops'); await subtab(p, 'Security');      return p.getByRole('button', { name: /edit tag/i }); },
  FINOPS:                     async(p) => { await openApp(p); await stage(p, 'Cloud Ops'); await subtab(p, 'FinOps');        return p.getByRole('button', { name: /edit tag/i }); },

  ADD_MIGRATION_CONFIG: async(p) => {
    await openApp(p);
    await stage(p, 'Build');
    await subtab(p, 'Data Engineering');
    return p.getByRole('button', { name: /Add migration configuration|Configure Migration/i }).first();
  },

  MODERNIZE_APP: async(p) => {
    await openApp(p);
    await stage(p, 'Build');
    await subtab(p, 'App Engineering');
    return p.getByRole('button', { name: /Modernize|Initiate Monolith/i }).first();
  },

  INITIATE_BRE_ANALYSIS: async(p) => {
    await openApp(p, 'mainframe');
    await stage(p, 'Build');
    await subtab(p, 'App Engineering');
    return p.getByRole('button', {
      name: /Initiate Monolith Breakdown|Run BRE Analysis|Initiate Analysis|Re-?initiate Analysis|Re-?Run BRE/i
    }).first();
  },


  RE_RUN_BRE_ANALYSIS: async(p) => {
    await openApp(p, 'mainframe');
    await stage(p, 'Build');
    await subtab(p, 'App Engineering');
    return p.getByRole('button', { name: /Re-?initiate Analysis|Initiate Analysis|Re-?Run BRE|Re-?Run Analysis/i }).first();
  },};
const PRESENCE_ONLY = new Set(['DELETE_GROUP', 'DELETE_CLOUD_ACCOUNT', 'ADD_NEW_APPLICATION', 'IMPORT_SERVICE_CATALOG']);

// ── Steps ───────────────────────────────────────────────────────────────────
Given('I am logged in for rbac as {string}', { timeout: 240000 }, async function (role) {
  await ensureRole(this.page, role);
});

When('I attempts to {string}', { timeout: 150000 }, async function (permission) {
  const probe = PROBES[permission];
  if (!probe) throw new Error(`No probe for "${permission}"`);
  this.target         = await probe(this.page);
  this.requireEnabled = !PRESENCE_ONLY.has(permission);
  await shot(this, `Probe: ${permission}`);
});

Then('The access should be {string}', async function (expected) {
  const t = this.target.first();
  await t.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  const visible = await t.isVisible().catch(() => false);
  const enabled = visible ? await t.isEnabled().catch(() => false) : false;
  let tooltip = '';
  if (visible) {
    tooltip = await t.evaluate(el => {
      let n = el;
      for (let i = 0; i < 6 && n; i++) {
        const ti = n.getAttribute && n.getAttribute('title');
        if (ti && /do not have permission/i.test(ti)) return ti;
        n = n.parentElement;
      }
      return '';
    }).catch(() => '');
  }
  const enabledOk = this.requireEnabled === false ? true : enabled;
  const allowed   = visible && enabledOk && !tooltip;
  this.attach(`visible:${visible} enabled:${enabled} tooltip:${tooltip || 'none'} → ${allowed ? 'ALLOWED' : 'DENIED'}`, 'text/plain');
  try { this.attach(await this.page.screenshot(), 'image/png'); } catch (e) {}
  if (expected === 'allowed') expect(allowed, `Expected ALLOWED; visible=${visible} enabled=${enabled} tooltip=${tooltip}`).toBe(true);
  else                        expect(allowed, 'Expected DENIED but control is usable').toBe(false);
});

When('admin assigns all cluster scopes', { timeout: 600000 }, async function () {
  const page = this.page;
  await openUserMapping(page);
  await page.waitForTimeout(500);
  for (const a of SCOPE) {
    const u = RBAC.users[a.role];
    if (!u) continue;
    const groupName = u.group || a.role;
    for (const cluster of a.clusters) {
      await page.getByRole('button', { name: 'Add New User' }).click({ timeout: 15000 });
      await page.getByRole('textbox', { name: 'Type here' }).fill(emailOf(u));
      await page.getByRole('combobox').filter({ hasText: /skygrade-admin/i }).first().click({ timeout: 8000 });
      await page.waitForTimeout(400);
      await page.getByRole('option', { name: groupName, exact: true }).first().click({ timeout: 8000 });
      await page.waitForTimeout(400);
      const combo = page.getByRole('combobox', { name: /Select cluster/i });
      await combo.click({ timeout: 10000 });
      await combo.fill(cluster);
      await page.waitForTimeout(600);
      await page.getByRole('option', { name: cluster, exact: true }).first().click({ timeout: 8000 });
      await page.keyboard.press('Escape').catch(() => {});
      await page.getByRole('button', { name: 'Add User' }).click({ timeout: 10000 });
      await page.getByText(/added successfully|already exists/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      const exists = await page.getByText(/already exists/i).first().isVisible().catch(() => false);
      await shot(this, exists ? `${cluster} -> ${a.role}: already exists` : `${cluster} -> ${a.role}: assigned`);
      const closeBtn = page.getByRole('button', { name: /cancel|close/i }).first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) await closeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
});

When('admin removes all cluster scopes', { timeout: 600000 }, async function () {
  const page = this.page;
  await openUserMapping(page);
  await page.waitForTimeout(400);
  for (const a of SCOPE) {
    const u = RBAC.users[a.role];
    if (!u) continue;
    const groupName = u.group || a.role;
    for (const cluster of a.clusters) {
      const groupBtn = page.getByRole('button', { name: groupName }).first();
      if (await groupBtn.isVisible({ timeout: 1500 }).catch(() => false)) await groupBtn.click().catch(() => {});
      const search = page.getByRole('textbox', { name: /search/i }).or(page.getByPlaceholder(/search/i)).first();
      if (await search.isVisible({ timeout: 1500 }).catch(() => false)) { await search.fill('').catch(()=>{}); await search.fill(cluster).catch(()=>{}); }
      await page.waitForTimeout(500);
      const row = page.getByRole('row')
        .filter({ hasText: new RegExp(cluster.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .filter({ hasText: emailOf(u) }).first();
      if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) { await shot(this, `teardown: no row ${groupName}/${cluster}`); continue; }
      await row.getByRole('checkbox').first().check({ timeout: 3000 }).catch(() => {});
      const del = page.getByRole('button', { name: /^Delete$/i }).first();
      if (await del.isVisible({ timeout: 1500 }).catch(() => false)) await del.click().catch(() => {});
      const yes = page.getByRole('button', { name: /^Yes$|Confirm/i }).first();
      if (await yes.isVisible({ timeout: 1500 }).catch(() => false)) await yes.click().catch(() => {});
      await page.waitForTimeout(500);
      await shot(this, `teardown: removed ${groupName}/${cluster}`);
    }
  }
});


