@cloudops @regression
Feature: Cloud Ops - Observability, Security, FinOps

  Scenario: Observability - edit tags and view application logs
    Given I am logged in as "application-architect"
    And I open the configured application
    And I go to the "Observability" phase
    When I edit observability tags
    Then the application log details should be visible

  Scenario: Security - edit tags and view alerts
    Given I am logged in as "application-architect"
    And I open the configured application
    And I go to the "Security" phase
    When I edit security tags
    Then the cloud security alerts should be visible

  Scenario: FinOps - edit tags and view cost
    Given I am logged in as "application-architect"
    And I open the configured application
    And I go to the "FinOps" phase
    When I edit finops tags
    Then the finops cost details should be visible
