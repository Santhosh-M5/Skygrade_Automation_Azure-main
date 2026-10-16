// cucumber.js
module.exports = {
  default: {
    require: [
      'features/step-definitions/**/*.js',
      'features/support/**/*.js',
    ],
    format: [
      'progress-bar',
      'json:reports/cucumber-report.json',
      'html:reports/cucumber-report.html',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    // no `paths` here — let the CLI argument decide which feature runs
  },
};
