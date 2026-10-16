@plantab
Feature: Plan Tab

    Background:
    Given I am logged in as "application-architect"

    @Smoke
    Scenario: Validate Plan Tab
    When I open the Plan Tab
    Then I verify Application Details functionality
    And I verify Target Cluster visibility based on Cloud Provider
    And I verify Modernization Disposition behavior

    @negative
    Scenario: Removing all Service
    When I open the Plan Tab
    Then I verify Service validation
    And Verifies the negative message