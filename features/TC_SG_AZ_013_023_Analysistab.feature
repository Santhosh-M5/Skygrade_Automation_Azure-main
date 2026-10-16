@analysiscomparison
Feature: Analysis Comparison

  Scenario: Validate Analysis Comparison
    Given I am logged in as "application-architect"
    When I open the Analysis Comparison application
    Then I verify Analysis Details page
    And I compare data with CAST Highlight
    And I validate Survey Retake and Re-Run Analysis functionality