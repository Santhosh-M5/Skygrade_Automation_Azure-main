@dependencymapping
Feature: Full dependency tree traversal and verification

  Scenario: Ensure clean state, bulk add/remove dependencies, add specific Level 1 apps, then walk and verify the entire dependency tree
    Given I am logged in as "application-architect"
    And I open the target application's Dependency Mapping section
    Then I ensure the application starts with no existing dependencies

    When I open the Add Dependencies dialog
    And I search dependencies for the bulk search term and select all matching applications
    Then the selection counter should match the total checkboxes selected
    And I apply the selected dependencies

    When I open the edit dependency dialog
    And I remove all mapped dependencies
    And I apply the selected dependencies
    Then no dependencies should be mapped for the application

    When I add the configured Level 1 applications individually
    Then the selection counter should match the individually added applications
    And I apply the selected dependencies

    Then the Level 1 applications should be read from the page
    And I walk and verify the full dependency tree for each Level 1 application