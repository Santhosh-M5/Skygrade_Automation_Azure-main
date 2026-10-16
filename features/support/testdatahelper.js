// features/support/testDataHelper.js
const testData = require('../config/data');

function getScenarioData(world) {
  const tagNames = world.pickle.tags.map(t => t.name.replace('@', ''));
  const knownKeys = Object.keys(testData.nonMainframe);
  const matches = tagNames.filter(t => knownKeys.includes(t));

  if (matches.length === 0) {
    const runtimeCluster = world.cluster || world.currentCluster || process.env.TEST_CLUSTER;
    const runtimeApp = world.appName || world.currentApp || process.env.TEST_APP;

    if (runtimeCluster && runtimeApp) {
      return { appName: runtimeApp, clusterName: runtimeCluster, searchCluster: runtimeCluster };
    }

    if (tagNames.includes('mainframe')) {
      return {
        appName: 'Main_App_1',
        clusterName: 'Mainmainframe_application12',
        searchCluster: 'Mainmainframe_application12',
      };
    }

    throw new Error(
      `No matching data.js key found in scenario tags [${tagNames.join(', ')}]. Valid: ${knownKeys.join(', ')}`
    );
  }
  if (matches.length > 1) {
    throw new Error(`Multiple conflicting accelerator tags found: [${matches.join(', ')}]. Only one is allowed.`);
  }
  return testData.nonMainframe[matches[0]];
}

module.exports = { getScenarioData };