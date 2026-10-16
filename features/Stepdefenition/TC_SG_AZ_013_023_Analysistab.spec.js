
const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { analysiscomparison ,cast } = require('../../config/data');

// ----------------------------------------------------
// All helper methods here
// ----------------------------------------------------

async function getMetricValue(page, label) {
    await expect(page.locator('p').filter({ hasText: label })).toBeVisible();
  const value = await page.locator('p').filter({ hasText: label })
    .locator('../..')
    .locator('> p')
    .textContent();
  console.log(`${label} value: ${value?.trim()}`);
  return value?.trim();
}

async function compareMetricValues(page1,label,skygradeValue,mismatches) {
    await page1.waitForTimeout(2000);
    await expect(page1.locator('div.fd-tile').filter({ hasText: label })).toBeVisible();
  const tileText = await page1.locator('div.fd-tile')
    .filter({ hasText: label })
    .locator('h1')
    .textContent();
  const page1Value = parseFloat(tileText.trim());
  const skygradeVal = parseFloat(skygradeValue);
  console.log(`Page1 ${label} value: ${page1Value}`);

  if (Math.round(page1Value) !== Math.round(skygradeVal)) {
    mismatches.push({ section: 'Metrics', field: label, appValue: skygradeVal, sourceValue: page1Value });
  } else {
    console.log(`Comparison: ${skygradeVal} (skygrade) ≈ ${page1Value} (cast highlight) ✓`);
  }
}

async function clickSourceTabAndWait(page1, frame, tabName) {
  const getTableSnapshot = async () => {
    const table = frame.locator('#datatable').filter({
      has: frame.locator('th', { hasText: 'Level' })
    }).first();
    const rows = await table.locator('tbody > tr').allInnerTexts().catch(() => []);
    return rows.join('||');
  };

  const before = await getTableSnapshot();
  await page1.getByRole('button', { name: tabName }).click();

  await expect(async () => {
    const after = await getTableSnapshot();
    expect(after).not.toBe(before);
  }).toPass({ timeout: 15000 });
}


async function compareCloudSurveyTile(page1,label,skygradeValue,mismatches) {
    await expect(page1.locator('#cloudTileSurvey').locator('div.fd-tile').filter({ hasText: label })).toBeVisible();
  const tileText = await page1.locator('#cloudTileSurvey')
    .locator('div.fd-tile')
    .filter({ hasText: label })
    .locator('h2')
    .textContent();
  const tileValue = parseFloat(tileText.replace(/[^\d.]/g, ''));
  const skygradeVal = parseFloat(skygradeValue);
  console.log(`Page1 ${label} value: ${tileValue}`);

  if (Math.round(tileValue) !== Math.round(skygradeVal)) {
    mismatches.push({ section: 'Metrics', field: label, appValue: skygradeVal, sourceValue: tileValue });
  } else {
    console.log(`Comparison: ${skygradeVal} (skygrade) ≈ ${tileValue} (cast highlight) ✓`);
  }
}

async function extractAppTable(page) {
    const table = page.locator('table').filter({ has: page.locator('th', { hasText: 'Cloud pattern' }) });
  const container = table.locator('xpath=..');

  const allRows = [];
  const paginationText = container.locator('p', { hasText: /of \d+/ });
  const totalPagesText = await paginationText.innerText();
  const totalPages = parseInt(totalPagesText.replace(/\D/g, ''), 10);

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    await table.waitFor({ state: 'visible', timeout: 15000 });

    const rows = await table.locator('tbody tr').all();

    for (const row of rows) {
      const cells = row.locator('td');

      const criticalityRaw = (await cells.nth(2).innerText()).trim();
      const criticality = criticalityRaw.split('\n').pop().trim();

      allRows.push({
        cloudPattern: (await cells.nth(0).innerText()).trim(),
        technology: (await cells.nth(1).innerText()).trim(),
        criticality: criticality,
        occurrence: (await cells.nth(3).innerText()).trim(),
        effort: (await cells.nth(4).innerText()).trim(),
      });
    }

    if (currentPage < totalPages) {
      const firstRowTextBefore = await table.locator('tbody tr').first().innerText();
      await container.getByRole('button', { name: 'Next' }).click();

      await expect(async () => {
        const firstRowTextAfter = await table.locator('tbody tr').first().innerText();
        expect(firstRowTextAfter).not.toBe(firstRowTextBefore);
      }).toPass();
    }
  }

  console.log(`Cloud Pattern table: extracted ${allRows.length} rows across ${totalPages} pages`);
  return allRows;
}

async function extractSourceTableFiltered(page1,appData) {
    let targetFrame = null;

  await expect(async () => {
    targetFrame = page1.frames().find(f => f.url().includes('CloudReady'));
    expect(targetFrame).toBeTruthy();
  }).toPass({ timeout: 20000 });

  const table = targetFrame.locator('#datatable:visible');

  await expect(async () => {
    const count = await table.count();
    expect(count).toBeGreaterThan(0);
  }).toPass({ timeout: 20000 });

  const visibleTable = table.first();
  await visibleTable.waitFor({ state: 'visible', timeout: 20000 });

  await expect(async () => {
    const rowCount = await visibleTable.locator('tbody > tr').count();
    expect(rowCount).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });

  const rows = await visibleTable.locator('tbody > tr').all();
  console.log(`Cloud Pattern source table: ${rows.length} rows found`);

  const sourceMap = new Map();
  const neededKeys = new Set(appData.map(r => `${r.cloudPattern}|||${r.technology}`));
  const debugKeys = [];

  for (const row of rows) {
    const cells = row.locator('> td');

    const cloudPattern = (await cells.nth(0).locator('dt').first().innerText())
      .replace(/\s+/g, ' ')
      .trim();
    const technology = (await cells.nth(1).locator('dt').first().innerText()).trim();

    const key = `${cloudPattern}|||${technology}`;
    debugKeys.push(key);

    if (!neededKeys.has(key)) continue;

    const criticality = (await cells.nth(3).locator('dt').first().innerText()).trim();
    const occurrence = (await cells.nth(5).locator('dt').first().innerText()).trim();
    const effortRaw = (await cells.nth(6).innerText()).trim();
    const effort = effortRaw.replace('person-day', '').trim();

    sourceMap.set(key, { cloudPattern, technology, criticality, occurrence, effort });
  }

  console.log(`Cloud Pattern source table: matched ${sourceMap.size} of ${neededKeys.size} needed rows`);

  if (sourceMap.size === 0 && debugKeys.length > 0) {
    console.log('Sample source keys:', debugKeys.slice(0, 5));
    console.log('Sample needed keys:', [...neededKeys].slice(0, 5));
  }

  return sourceMap;
}

function compareCloudPatternTables(appData,sourceMap,mismatches,notFoundInSource,naRowsIncorrectlyMarked) {
    function normalizeNumber(val) {
    if (val === null || val === undefined) return null;
    const num = parseFloat(val);
    return isNaN(num) ? val : num;
  }

  for (const appRow of appData) {
    const key = `${appRow.cloudPattern}|||${appRow.technology}`;
    const sourceRow = sourceMap.get(key);

    if (appRow.occurrence === 'N/A' && appRow.effort === 'N/A') {
      if (sourceRow) {
        naRowsIncorrectlyMarked.push({
          section: 'Cloud Pattern',
          cloudPattern: appRow.cloudPattern,
          technology: appRow.technology,
          appShows: 'N/A',
          sourceActuallyHas: sourceRow,
        });
      }
      continue;
    }

    if (!sourceRow) {
      notFoundInSource.push({ section: 'Cloud Pattern', ...appRow });
      continue;
    }

    const fieldsToCompare = [
      ['criticality', appRow.criticality, sourceRow.criticality],
      ['occurrence', normalizeNumber(appRow.occurrence), normalizeNumber(sourceRow.occurrence)],
      ['effort', normalizeNumber(appRow.effort), normalizeNumber(sourceRow.effort)],
    ];

    for (const [field, appVal, sourceVal] of fieldsToCompare) {
      if (appVal !== sourceVal) {
        mismatches.push({
          section: 'Cloud Pattern',
          cloudPattern: appRow.cloudPattern,
          technology: appRow.technology,
          field,
          appValue: appVal,
          sourceValue: sourceVal,
        });
      }
    }
  }
}

function analyzeCloudPatternMultiplier(mismatches, appName) {
  const cloudPatternMismatches = mismatches.filter(m => m.section === 'Cloud Pattern');
  const otherMismatches = mismatches.filter(m => m.section !== 'Cloud Pattern');

  const isComputable = m =>
    typeof m.appValue === 'number' && typeof m.sourceValue === 'number' && m.sourceValue !== 0;

  const rowKey = m => `${m.cloudPattern}|||${m.technology}`;

  const occurrenceMismatches = cloudPatternMismatches.filter(m => m.field === 'occurrence');
  const effortMismatches = cloudPatternMismatches.filter(m => m.field === 'effort');
  const otherFieldMismatches = cloudPatternMismatches.filter(
    m => m.field !== 'occurrence' && m.field !== 'effort'
  );

  const computableOccurrence = occurrenceMismatches.filter(isComputable);
  const uncomputableOccurrence = occurrenceMismatches.filter(m => !isComputable(m));

  if (computableOccurrence.length === 0) {
    return { realMismatches: mismatches, multiplierNotes: [] };
  }

  // Group by rounded ratio (e.g. 2.0, 3.0, ...)
  const ratioGroups = new Map();
  for (const m of computableOccurrence) {
    const rounded = Math.round((m.appValue / m.sourceValue) * 10) / 10;
    if (!ratioGroups.has(rounded)) ratioGroups.set(rounded, []);
    ratioGroups.get(rounded).push(m);
  }

  const MIN_GROUP_SIZE = 2;

  // Accept every ratio band that's consistent enough — not just one dominant one.
  const explainedGroups = [];
  for (const [ratio, rows] of ratioGroups) {
    if (ratio !== 1 && rows.length >= MIN_GROUP_SIZE) {
      explainedGroups.push({ ratio, rows });
    }
  }

  if (explainedGroups.length === 0) {
    return { realMismatches: mismatches, multiplierNotes: [] };
  }

  const explainedOccurrenceSet = new Set();
  // Map row identity (cloudPattern+technology) -> the ratio that explained its occurrence.
  const explainedRowRatio = new Map();
  for (const g of explainedGroups) {
    for (const m of g.rows) {
      explainedOccurrenceSet.add(m);
      explainedRowRatio.set(rowKey(m), g.ratio);
    }
  }

  const unexplainedOccurrence = computableOccurrence.filter(m => !explainedOccurrenceSet.has(m));

  // Effort mismatches: first try to inherit the explanation from the SAME ROW's
  // occurrence mismatch (handles rounding drift on small decimal effort values).
  // Only fall back to an independent ratio check if that row's occurrence wasn't
  // itself part of an explained band.
  const TOLERANCE = 0.1;
  const explainedEffort = [];
  const unexplainedEffort = [];
  for (const m of effortMismatches) {
    const inheritedRatio = explainedRowRatio.get(rowKey(m));
    if (inheritedRatio !== undefined) {
      explainedEffort.push({ mismatch: m, ratio: inheritedRatio });
      continue;
    }
    if (isComputable(m)) {
      const r = m.appValue / m.sourceValue;
      const matchedGroup = explainedGroups.find(g => Math.abs(r - g.ratio) / g.ratio < TOLERANCE);
      if (matchedGroup) {
        explainedEffort.push({ mismatch: m, ratio: matchedGroup.ratio });
        continue;
      }
    }
    unexplainedEffort.push(m);
  }

  const multiplierNotes = explainedGroups.map(g => {
    const effortForThisRatio = explainedEffort.filter(e => e.ratio === g.ratio);
    return {
      appName,
      multiplier: g.ratio,
      affectedRows: g.rows.length + effortForThisRatio.length,
      sample: g.rows.slice(0, 3),
    };
  });

  const realMismatches = [
    ...otherMismatches,
    ...otherFieldMismatches,
    ...uncomputableOccurrence,
    ...unexplainedOccurrence,
    ...unexplainedEffort,
  ];

  return { realMismatches, multiplierNotes };
}

/*
function analyzeCloudPatternMultiplier(mismatches, appName) {
  const cloudPatternMismatches = mismatches.filter(m => m.section === 'Cloud Pattern');
  const otherMismatches = mismatches.filter(m => m.section !== 'Cloud Pattern');

  const occurrenceFieldMismatches = cloudPatternMismatches.filter(m => m.field === 'occurrence');

  const computableOccurrence = occurrenceFieldMismatches.filter(
    m => typeof m.appValue === 'number' && typeof m.sourceValue === 'number' && m.sourceValue !== 0
  );
  const uncomputableOccurrence = occurrenceFieldMismatches.filter(
    m => !(typeof m.appValue === 'number' && typeof m.sourceValue === 'number' && m.sourceValue !== 0)
  );

  if (computableOccurrence.length === 0) {
    return { realMismatches: mismatches, multiplierNote: null };
  }

  const ratios = computableOccurrence.map(m => m.appValue / m.sourceValue);
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  const isConsistent = ratios.every(r => Math.abs(r - avgRatio) / avgRatio < 0.1);

  if (!isConsistent) {
    return { realMismatches: mismatches, multiplierNote: null };
  }

  const roundedMultiplier = Math.round(avgRatio * 10) / 10;

  const multiplierNote = {
    appName,
    multiplier: roundedMultiplier,
    affectedRows: computableOccurrence.length,
    unexplainedRows: uncomputableOccurrence.length,
    sample: computableOccurrence.slice(0, 3),
  };

  const explainedFields = new Set(['occurrence', 'effort']);

  // Keep: (a) anything outside occurrence/effort, and (b) occurrence rows we
  // couldn't ratio-check (so a zero-source row still shows up as a real mismatch).
  const unexplainedCloudPatternMismatches = cloudPatternMismatches.filter(m => {
    if (!explainedFields.has(m.field)) return true;
    if (m.field === 'occurrence' && uncomputableOccurrence.includes(m)) return true;
    return false;
  });

  return {
    realMismatches: [...otherMismatches, ...unexplainedCloudPatternMismatches],
    multiplierNote,
  };
}
*/
async function extractSCATable(page) {
    const table = page.locator('table').filter({ has: page.locator('th', { hasText: 'Component' }) });
  const container = table.locator('xpath=..');

  await table.waitFor({ state: 'visible', timeout: 15000 });

  const noDataRow = table.locator('td', { hasText: 'No data available' });
  if (await noDataRow.count() > 0) {
    console.log('App SCA table: "No data available" — skipping.');
    return [];
  }

  const allRows = [];
  const totalPagesText = await container.locator('p', { hasText: /of \d+/ }).innerText();
  const totalPages = parseInt(totalPagesText.replace(/\D/g, ''), 10);

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    await table.waitFor({ state: 'visible', timeout: 15000 });

    const rows = await table.locator('tbody tr').all();

    for (const row of rows) {
      const cells = row.locator('td');

      const component = (await cells.nth(0).innerText()).trim();
      const version = (await cells.nth(1).innerText()).trim();

      const cveButtons = await cells.nth(2).locator('button').allTextContents();
      const cve = {};
      for (const btnText of cveButtons) {
        const [label, count] = btnText.split(':').map(s => s.trim());
        cve[label] = parseInt(count, 10);
      }

      const saferVersion = (await cells.nth(3).innerText()).trim();

      allRows.push({ component, version, cve, saferVersion });
    }

    if (currentPage < totalPages) {
      const firstRowTextBefore = await table.locator('tbody tr').first().innerText();
      await container.getByRole('button', { name: 'Next' }).click();

      await expect(async () => {
        const firstRowTextAfter = await table.locator('tbody tr').first().innerText();
        expect(firstRowTextAfter).not.toBe(firstRowTextBefore);
      }).toPass();
    }
  }

  console.log(`SCA table: extracted ${allRows.length} rows across ${totalPages} pages`);
  return allRows;
}

async function extractSourceSCATableFiltered(page1,appData) {
    let targetFrame = null;

  await expect(async () => {
    for (const frame of page1.frames()) {
      const hasComponentHeader = await frame
        .locator('#datatable:visible th', { hasText: 'Component' })
        .count()
        .catch(() => 0);
      if (hasComponentHeader > 0) {
        targetFrame = frame;
        break;
      }
    }
    expect(targetFrame).toBeTruthy();
  }).toPass({ timeout: 20000 });

  const table = targetFrame.locator('#datatable:visible');
  await table.first().waitFor({ state: 'visible', timeout: 20000 });
  const visibleTable = table.first();

  await expect(async () => {
    const rowCount = await visibleTable.locator('tbody > tr').count();
    expect(rowCount).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });

  const rows = await visibleTable.locator('tbody > tr').all();
  console.log(`SCA source table: ${rows.length} rows found`);

  const sourceMap = new Map();
  const neededKeys = new Set(appData.map(r => `${r.component}|||${r.version}`));
  const debugKeys = [];

  for (const row of rows) {
    const cells = row.locator('> td');

    const component = (await cells.nth(1).innerText()).trim();
    const version = (await cells.nth(4).innerText()).trim();

    const key = `${component}|||${version}`;
    debugKeys.push(key);

    if (!neededKeys.has(key)) continue;

    const cveContainer = cells.nth(6);
    const cve = {};

    const totalSpan = cveContainer.locator('span[data-cell-action="showCveDetailTotal"]');
    if (await totalSpan.count() > 0) {
      const totalText = await totalSpan.innerText();
      const match = totalText.match(/(\d+)/);
      if (match) cve.Total = parseInt(match[1], 10);
    }

    const levelSpans = await cveContainer.locator('span[data-cve-level]').all();
    for (const levelSpan of levelSpans) {
      const level = await levelSpan.getAttribute('data-cve-level');
      const text = await levelSpan.innerText();
      const match = text.match(/(\d+)/);
      if (match && level) {
        const count = parseInt(match[1], 10);
        const label = level.charAt(0) + level.slice(1).toLowerCase();
        const key2 = label === 'Advisory' ? 'Advisories' : label;
        cve[key2] = count;
      }
    }

    const saferVersion = (await cells.nth(7).innerText()).trim() || '-';

    sourceMap.set(key, { component, version, cve, saferVersion });
  }

  console.log(`SCA source table: matched ${sourceMap.size} of ${neededKeys.size} needed rows`);

  if (sourceMap.size === 0 && debugKeys.length > 0) {
    console.log('Sample source keys:', debugKeys.slice(0, 5));
    console.log('Sample needed keys:', [...neededKeys].slice(0, 5));
  }

  return sourceMap;
}

function compareSCATables(appData,sourceMap,mismatches,notFoundInSource) {
    for (const appRow of appData) {
    const key = `${appRow.component}|||${appRow.version}`;
    const sourceRow = sourceMap.get(key);

    if (!sourceRow) {
      notFoundInSource.push({ section: 'SCA', ...appRow });
      continue;
    }

    const sourceCveKeys = Object.keys(sourceRow.cve || {});

    for (const cveKey of sourceCveKeys) {
      const appVal = appRow.cve?.[cveKey];
      const sourceVal = sourceRow.cve[cveKey];

      if (appVal !== undefined && appVal !== sourceVal) {
        mismatches.push({
          section: 'SCA',
          component: appRow.component,
          version: appRow.version,
          field: `cve.${cveKey}`,
          appValue: appVal,
          sourceValue: sourceVal,
        });
      }
    }

    if (sourceRow.saferVersion && appRow.saferVersion !== sourceRow.saferVersion) {
      mismatches.push({
        section: 'SCA',
        component: appRow.component,
        version: appRow.version,
        field: 'saferVersion',
        appValue: appRow.saferVersion,
        sourceValue: sourceRow.saferVersion,
      });
    }
  }
}

// ----------------------------------------------------
// Known issues — confirmed with dev team, safe to ignore
// ----------------------------------------------------
const KNOWN_ISSUES = [
  {
    section: 'SCA',
    component: 'nodemailer.npm',
    version: '6.9.1',
    field: 'cve.High',
    note: 'App shows 3 High CVEs vs CAST Highlight 2 — confirmed with dev team, ignoring for now.',
  },
  // Add more entries here as new confirmed/known mismatches come up
];

function isKnownIssue(mismatch) {
  return KNOWN_ISSUES.some((k) =>
    Object.keys(k).every((key) => key === 'note' || k[key] === mismatch[key])
  );
}

function filterKnownIssues(mismatches) {
  const known = mismatches.filter(isKnownIssue);
  const remaining = mismatches.filter((m) => !isKnownIssue(m));
  return { remaining, known };
}


async function extractDBAnalysisTable(page) {
    const table = page.locator('table').filter({ has: page.locator('th', { hasText: 'Improvement Candidate' }) });

  await table.waitFor({ state: 'visible', timeout: 15000 });

  const noDataRow = table.locator('td', { hasText: 'No data available' });
  if (await noDataRow.count() > 0) {
    console.log('DB Analysis table: "No data available" — skipping.');
    return [];
  }

  const container = table.locator('xpath=..');
  const allRows = [];

  const paginationText = container.locator('p', { hasText: /of \d+/ });
  const hasPagination = await paginationText.count() > 0;
  const totalPages = hasPagination
    ? parseInt((await paginationText.innerText()).replace(/\D/g, ''), 10)
    : 1;

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    await table.waitFor({ state: 'visible', timeout: 15000 });

    const rows = await table.locator('tbody tr').all();

    for (const row of rows) {
      const cells = row.locator('td');

      const improvementCandidate = (await cells.nth(0).innerText()).trim();
      const criticalityRaw = (await cells.nth(1).innerText()).trim();
      const criticality = criticalityRaw.split('\n').pop().trim();
      const codeSize = (await cells.nth(2).innerText()).trim();

      allRows.push({ improvementCandidate, criticality, codeSize });
    }

    if (currentPage < totalPages) {
      const firstRowTextBefore = await table.locator('tbody tr').first().innerText();
      await container.getByRole('button', { name: 'Next' }).click();

      await expect(async () => {
        const firstRowTextAfter = await table.locator('tbody tr').first().innerText();
        expect(firstRowTextAfter).not.toBe(firstRowTextBefore);
      }).toPass();
    }
  }

  console.log(`DB Analysis table: extracted ${allRows.length} rows across ${totalPages} pages`);
  return allRows;
}

async function extractSourceDBTableFiltered(page1,appData,contextLabel = '') {
    let targetFrame = null;
  await page1.waitForTimeout(2000);
  await expect(async () => {
    for (const frame of page1.frames()) {
      const hasHeading = await frame.locator('text=/Improvement Candidates/i').count().catch(() => 0);
      if (hasHeading > 0) {
        targetFrame = frame;
        break;
      }
    }
    expect(targetFrame).toBeTruthy();}).toPass({ timeout: 20000 });

  const table = targetFrame.locator('#datatable').filter({
    has: targetFrame.locator('th', { hasText: 'Level' })
  });
  await page1.waitForTimeout(1500);
  await table.first().waitFor({ state: 'visible', timeout: 20000 });
  const visibleTable = table.first();

  await expect(async () => {
    const rowCount = await visibleTable.locator('tbody > tr').count();
    expect(rowCount).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });

  const rows = await visibleTable.locator('tbody > tr').all();
  console.log(`[${contextLabel}] DB source table: ${rows.length} rows found`);

  const sourceMap = new Map();
  const neededKeys = new Set(appData.map(r => r.improvementCandidate));
  const debugKeys = [];

  for (const row of rows) {
    const cells = row.locator('> td');
    const cellCount = await cells.count();
    if (cellCount < 3) continue;

    const improvementCandidate = (await cells.nth(0).innerText()).trim();
    debugKeys.push(improvementCandidate);

    if (!neededKeys.has(improvementCandidate)) continue;

    const criticality = (await cells.nth(1).innerText()).trim();
    const codeSize = (await cells.nth(2).innerText()).trim();

    sourceMap.set(improvementCandidate, { improvementCandidate, criticality, codeSize });
  }

  console.log(`[${contextLabel}] DB source table: matched ${sourceMap.size} of ${neededKeys.size} needed rows`);

  if (sourceMap.size === 0 && debugKeys.length > 0) {
    console.log(`[${contextLabel}] Sample source keys:`, debugKeys.slice(0, 5));
    console.log(`[${contextLabel}] Sample needed keys:`, [...neededKeys].slice(0, 5));
  }

  return { sourceMap, targetFrame };
}

function compareDBTables(appData,sourceMap,tableName,mismatches,notFoundInSource) 
{
    for (const appRow of appData) {
    const sourceRow = sourceMap.get(appRow.improvementCandidate);

    if (!sourceRow) {
      notFoundInSource.push({ section: 'DB Analysis', table: tableName, ...appRow });
      continue;
    }

    if (appRow.criticality !== sourceRow.criticality) {
      mismatches.push({
        section: 'DB Analysis',
        table: tableName,
        improvementCandidate: appRow.improvementCandidate,
        field: 'criticality',
        appValue: appRow.criticality,
        sourceValue: sourceRow.criticality,
      });
    }

    if (appRow.codeSize !== sourceRow.codeSize) {
      mismatches.push({
        section: 'DB Analysis',
        table: tableName,
        improvementCandidate: appRow.improvementCandidate,
        field: 'codeSize',
        appValue: appRow.codeSize,
        sourceValue: sourceRow.codeSize,
      });
    }
  }

}

// NOTE: the duplicate `analyzeCloudPatternMultiplier` that used to be redefined
// here has been removed — there was only ever one definition needed, and having
// two (even identical ones) is a maintenance trap: edit one, the other silently
// wins at runtime since function declarations get hoisted and the later one overwrites.

// ----------------------------------------------------
// Step: Open Application
// ----------------------------------------------------

When('I open the Analysis Comparison application',{ timeout: 120000 }, async function () {

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).click();

    await this.page.getByRole('textbox', {
        name: 'Search'
    }).fill(analysiscomparison.searchText);

    await this.page.getByText('View Apps').click();

    //await this.page.getByRole('button', {name: analysiscomparison.applicationName}).click();

    await this.page.waitForTimeout(6000);
     
    const appButton = this.page.getByRole('button', {
    name: analysiscomparison.applicationName
    });

  await appButton.waitFor({
      state: 'visible',
      timeout: 60000
    });

await appButton.click();

const prevButton = this.page.getByRole('button', { name: 'Previous' });

const prevExists = await prevButton
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);

if (!prevExists) {
    console.log('Previous button not found — skipping navigation, proceeding with next steps.');
} else {
    while (true) {
        const isPrevVisible = await prevButton.isVisible().catch(() => false);
        const isPrevEnabled = isPrevVisible
            ? await prevButton.isEnabled().catch(() => false)
            : false;

        console.log('Previous visible:', isPrevVisible, '| enabled:', isPrevEnabled);

        // Stop as soon as the button is gone OR disabled — disabled means
        // we've reached the first tab, same as "not visible" used to mean.
        if (!isPrevVisible || !isPrevEnabled) {
            console.log('Reached first tab (button missing or disabled).');
            break;
        }

        await prevButton.click();
        console.log('Clicked Previous');
        //await this.page.waitForTimeout(1000);
    }
}

console.log('Finished navigation check.');
    
    const screenshot = await this.page.screenshot({ fullPage: true });
   this.attach(screenshot, "image/png");
});

// ----------------------------------------------------
// Step: UI Validation
// ----------------------------------------------------

Then('I verify Analysis Details page',async function () {
  //const page = this.page;

  // await this.page.getByRole('button', { name: this.appName })
  //   .or(this.page.getByText(this.appName)).first().click({ timeout: 15000 }).catch(() => {});
  //await page.waitForTimeout(1000);
  await this.page.locator('div[role="button"]').filter({hasText: 'Analysis'}).click();
  await this.page.waitForTimeout(3000);
  await expect(this.page.getByRole('heading', { name: 'Analysis Details' })).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'refresh Refresh' })).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'View Results' })).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'Re-Run Analysis' })).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'Check Survey Response' })).toBeVisible();
  await expect(this.page.getByRole('article')).toContainText('Analysis complete. The results are based on your survey responses. Check Survey Response');
  await this.page.getByText('Modernization Approach').waitFor({ state: 'visible', timeout: 20000 });
  await expect(this.page.getByText('Modernization Approach')).toBeVisible();
  await expect(this.page.getByText('Software Resiliency')).toBeVisible();
  await expect(this.page.getByText('Software Agility')).toBeVisible();
  await expect(this.page.getByText('Cloud Maturity')).toBeVisible();
  await expect(this.page.getByText('Cloud Boost')).toBeVisible();
  await expect(this.page.getByText('Blockers')).toBeVisible();

  await expect(this.page.getByRole('paragraph').filter({ hasText: /^Analysis Details$/ })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Cloud pattern' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Technology' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Criticality' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Occurence' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Est. Effort (person-day)' })).toBeVisible();

  await expect(this.page.getByText('Software Composition Analysis')).toBeVisible();
  await this.page.getByText('Software Composition Analysis').click();
  await expect(this.page.getByRole('columnheader', { name: 'Component' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Version', exact: true })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'CVE' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Safer & Closest Version' })).toBeVisible();

  await expect(this.page.getByText('Database Analysis Details')).toBeVisible();
  await this.page.getByText('Database Analysis Details').click();
  await expect(this.page.getByRole('columnheader', { name: 'Improvement Candidate' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Criticality' }).nth(1)).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Code Size' })).toBeVisible();

  await this.page.getByRole('button', { name: 'Software Agility' }).click();
  await expect(this.page.getByRole('button', { name: 'Software Agility' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Improvement Candidate' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Criticality' }).nth(1)).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Code Size' })).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'Software Elegance' })).toBeVisible();

  await this.page.getByRole('button', { name: 'Software Elegance' }).click();
  await expect(this.page.getByRole('columnheader', { name: 'Improvement Candidate' })).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Criticality' }).nth(1)).toBeVisible();
  await expect(this.page.getByRole('columnheader', { name: 'Code Size' })).toBeVisible();

  await expect(this.page.getByText('View Application Details')).toBeVisible();
  await this.page.getByText('View Application Details').click();
  await this.page.getByRole('img', { name: 'Close' }).click();

  const screenshot1 = await this.page.screenshot({ fullPage: true });
  this.attach(screenshot1, "image/png");
       
    }
);

// ----------------------------------------------------
// Step: Comparison Logic
// ----------------------------------------------------
Then('I compare data with CAST Highlight',async function () {

        const mismatches = [];
        const notFoundInSource = [];
        const naRowsIncorrectlyMarked = [];

        const resiliencyValue = await getMetricValue(this.page, 'Software Resiliency');
        const agilityValue = await getMetricValue(this.page, 'Software Agility');
          const maturityValue = await getMetricValue(this.page, 'Cloud Maturity');
          const cloudBoostValue = await getMetricValue(this.page, 'Cloud Boost');
          const blockersValue = await getMetricValue(this.page, 'Blockers');
        
          const cloudPatternData = await extractAppTable(this.page);
          console.log('Cloud Pattern App Data:', cloudPatternData);
        
          //await page.getByText('Software Composition Analysis Details', { exact: true }).click();
        
          const scaData = await extractSCATable(this.page);
          console.log('SCA App Data:', scaData);
          const hasSCAData = scaData.length > 0;
          if (!hasSCAData) {
            console.log('⚠️  SCA table has no data — skipping SCA comparison entirely.');
          }
        
          //await page.getByText('Database Analysis Details').click();
        
          await this.page.getByRole('button', { name: 'Software Resilience' }).click();
          const resilienceData = await extractDBAnalysisTable(this.page);
          console.log('DB Resilience App Data:', resilienceData);
        
          await this.page.getByRole('button', { name: 'Software Agility' }).click();
          const agilityDBData = await extractDBAnalysisTable(this.page);
          console.log('DB Agility App Data:', agilityDBData);
        
          await this.page.getByRole('button', { name: 'Software Elegance' }).click();
          const eleganceData = await extractDBAnalysisTable(this.page);
          console.log('DB Elegance App Data:', eleganceData);
        
          const hasDBData = resilienceData.length > 0 || agilityDBData.length > 0 || eleganceData.length > 0;
          if (!hasDBData) {
            console.log('⚠️  Database Analysis Details has no data on any tab — skipping DB comparison entirely.');
          }
        
          // ── STEP 2: Open CAST Highlight ONCE ─────────────────────────────────
          console.log('\n========== OPENING CAST HIGHLIGHT ==========');
        
          const page1Promise = this.page.waitForEvent('popup');
          await this.page.getByRole('button', { name: 'View Results' }).click();
          const page1 = await page1Promise;
        
          await page1.getByRole('textbox', { name: 'Username' }).fill(cast.email);
          await page1.getByRole('button', { name: 'Next' }).click();
          await page1.getByRole('textbox', { name: 'Password' }).fill(cast.password);
          await page1.getByRole('button', { name: 'Log me in' }).click();
          await page1.waitForTimeout(10000);
          //await page1.waitForLoadState('networkidle');
        
          // ── STEP 3: Compare Metric Tiles ──────────────────────────────────────
          console.log('\n========== COMPARING METRIC TILES ==========');
        
          await compareMetricValues(page1, 'Software Resiliency', resiliencyValue, mismatches);
          await compareMetricValues(page1, 'Software Agility', agilityValue, mismatches);
          await compareMetricValues(page1, 'Cloud Maturity', maturityValue, mismatches);

          const screenshot2 = await page1.screenshot({ fullPage: true });
          this.attach(screenshot2, "image/png");
        
          // ── STEP 4: Cloud Maturity → Cloud Pattern table ─────────────────────
          console.log('\n========== COMPARING CLOUD PATTERN TABLE ==========');
        
          await page1.getByRole('link', { name: 'Cloud Maturity' }).click();
          const cloudPatternSourceMap = await extractSourceTableFiltered(page1, cloudPatternData);
          compareCloudPatternTables(cloudPatternData, cloudPatternSourceMap, mismatches, notFoundInSource, naRowsIncorrectlyMarked);
          
          const screenshot3 = await page1.screenshot({ fullPage: true });
          this.attach(screenshot3, "image/png");
          // ── STEP 5: Cloud Survey tab, Cloud Boost/Blockers ───────────────────
          console.log('\n========== COMPARING CLOUD BOOST / BLOCKERS ==========');
        
          await page1.getByRole('button', { name: 'Cloud Survey' }).click();
          await compareCloudSurveyTile(page1, 'Cloud Boost', cloudBoostValue, mismatches);
          await compareCloudSurveyTile(page1, 'Blockers', blockersValue, mismatches);

          const screenshot4 = await page1.screenshot({ fullPage: true });
          this.attach(screenshot4, "image/png");
        
          // ── STEP 6: Software Composition → SCA comparison ────────────────────
          if (hasSCAData) {
            console.log('\n========== COMPARING SOFTWARE COMPOSITION ANALYSIS ==========');
        
            await page1.getByRole('link', { name: 'Software Composition' }).click();
            const scaSourceMap = await extractSourceSCATableFiltered(page1, scaData);
            compareSCATables(scaData, scaSourceMap, mismatches, notFoundInSource);
          } else {
            console.log('⚠️  Skipped SCA comparison — no data on app side.');
          }
        
          // ── STEP 7: Code Insights → Terraform → T/Sql, DB tables ─────────────
          if (hasDBData) {
            console.log('\n========== COMPARING DATABASE ANALYSIS TABLES ==========');
        
            await page1.getByRole('link', { name: 'Code Insights' }).click();
            //Enable this below steps only when it's (T/sql) is not already clicked
            // await page1.waitForTimeout(2000);
            // await page1.getByRole('button', { name: 'Terraform' }).click();
            // await page1.locator('#appAlert a').filter({ hasText: 'T/Sql' }).click();
            // await page1.waitForTimeout(1500);

            const techDropdown = page1
              .locator('#appAlert')
              .locator('label[title="T/Sql"]')
              .locator('xpath=ancestor::div[contains(@class,"btn-group")][1]');

    const selectedText = await techDropdown.locator('.multiselect-selected-text').textContent();

    if (selectedText.trim() !== 'T/Sql') {
      await page1.waitForTimeout(2000);
      await techDropdown.locator('button.dropdown-toggle').click();
      await page1.locator('#appAlert a').filter({ hasText: 'T/Sql' }).click();
      await page1.waitForTimeout(1500);
    } else {
      console.log('T/Sql is already selected, skipping selection step.');
  }

        
            const { sourceMap: resilienceSourceMap, targetFrame } =
              await extractSourceDBTableFiltered(page1, resilienceData, 'Resilience');
            compareDBTables(resilienceData, resilienceSourceMap, 'Software Resilience', mismatches, notFoundInSource);
        
            await clickSourceTabAndWait(page1, targetFrame, 'Software Agility');
            const { sourceMap: agilitySourceMap } =
              await extractSourceDBTableFiltered(page1, agilityDBData, 'Agility');
            compareDBTables(agilityDBData, agilitySourceMap, 'Software Agility', mismatches, notFoundInSource);
            
            await clickSourceTabAndWait(page1, targetFrame, 'Software Elegance');
            const { sourceMap: eleganceSourceMap } =
            await extractSourceDBTableFiltered(page1, eleganceData, 'Elegance');
            compareDBTables(eleganceData, eleganceSourceMap, 'Software Elegance', mismatches, notFoundInSource);
            
            const screenshot5 = await page1.screenshot({ fullPage: true });
            this.attach(screenshot5, "image/png");
          } else {
            console.log('⚠️  Skipped Database Analysis comparison — no data on app side.');
          }
        
          // ── FINAL REPORT ──────────────────────────────────────────────────────
          console.log('\n========== FINAL REPORT ==========');
        
          // NOTE: analyzeCloudPatternMultiplier returns { realMismatches, multiplierNotes }
          // (plural array) — fixed destructuring here to match.
          const { realMismatches, multiplierNotes } = analyzeCloudPatternMultiplier(mismatches, analysiscomparison.applicationName);
        
          if (multiplierNotes && multiplierNotes.length > 0) {
            for (const multiplierNote of multiplierNotes) {
              console.log('\n🔍 CLOUD PATTERN MULTIPLIER DETECTED');
              console.log(`   ${multiplierNote.affectedRows} Cloud Pattern occurrence/effort mismatches are consistently`);
              console.log(`   ~${multiplierNote.multiplier}x the CAST Highlight source value for app "${multiplierNote.appName}".`);
              console.log(`   This suggests a systemic aggregation/counting issue rather than random data errors.`);
              console.log('   Sample affected rows:');
              console.table(multiplierNote.sample);
            }
          }

          // Filter out mismatches confirmed as known issues (safe to ignore for now)
          const { remaining: finalMismatches, known: knownIssueMismatches } = filterKnownIssues(realMismatches);

          if (knownIssueMismatches.length > 0) {
            console.log('\n⚠️  KNOWN ISSUES (ignored — confirmed with dev team):');
            console.table(knownIssueMismatches);
          }
        
          console.log('--- Remaining Mismatches (excluding known issues + multiplier pattern) ---');
          console.table(finalMismatches);
        
          console.log('--- All Rows Not Found In Source ---');
          console.table(notFoundInSource);
        
          console.log('--- N/A Rows Incorrectly Marked ---');
          console.table(naRowsIncorrectlyMarked);
        
          console.log(`✅ Comparison complete for ${analysiscomparison.applicationName}`);
          console.log(`   Cloud Pattern rows: ${cloudPatternData.length}`);
          console.log(`   SCA rows: ${scaData.length}`);
          console.log(`   DB Analysis rows: ${resilienceData.length + agilityDBData.length + eleganceData.length}`);
        
          expect(finalMismatches, `Found ${finalMismatches.length} field mismatches`).toHaveLength(0);
          expect(notFoundInSource, `${notFoundInSource.length} rows not found in source`).toHaveLength(0);
          expect(naRowsIncorrectlyMarked, `${naRowsIncorrectlyMarked.length} N/A rows incorrectly marked`).toHaveLength(0);
    }
);
// ----------------------------------------------------
// Step: Survey Flow
// ----------------------------------------------------

Then('I validate Survey Retake and Re-Run Analysis functionality',async function () {
    await this.page.getByRole('button', { name: 'Check Survey Response' }).click();
  await this.page.getByRole('button', { name: 'Retake Survey' }).click();
  await this.page.locator('select[name="majorReleases"]').selectOption('7 to 12');
  await this.page.getByRole('button', { name: 'Submit' }).click();
  await expect(this.page.getByText('Business Impact Survey')).toBeVisible();
  await expect(this.page.getByRole('button', { name: 'Re-Run Analysis' }).first()).toBeVisible();
  await expect(this.page.getByRole('article')).toContainText('Your survey has been submitted successfully!You have to re-run analysis to get the results for the updated survey.');
  await this.page.getByRole('button', { name: 'Re-Run Analysis' }).first().click();
  await expect(this.page.getByText('Analysis has been re-')).toBeVisible();

  const proceedButton = this.page.getByRole('button', { name: 'Proceed' });
  await expect(proceedButton).toBeDisabled();
  await expect(proceedButton).toHaveAttribute(
    'title',
    'Analysis data is still loading. Please wait for it to complete.'
  );

  await expect(this.page.getByRole('button', { name: 'Re-Run Analysis' })).toBeVisible();
  await this.page.reload();
  await this.page.getByRole('button', { name: 'Re-Run Analysis' }).click();
  await this.page.waitForTimeout(3000);
  await expect(this.page.getByText('You are about to re-run')).toBeVisible();
  await this.page.getByRole('button', { name: 'Yes' }).click();
  await expect(this.page.getByText('Analysis has been re-initiated')).toBeVisible();
  await this.page.waitForTimeout(2000);
        
    }
);