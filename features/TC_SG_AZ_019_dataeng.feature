@data-eng @regression
Feature: Data Engineering - configure migration

  Scenario: Configure a migration for a non-mainframe app and reject a duplicate
    Given I am logged in as "application-architect"
    And I open the data engineering application
    And I go to the data engineering phase
    When I configure migration "test"
    Then the migration configuration should be created
    When I try to add the same migration configuration again
    Then the duplicate migration configuration should be rejected
