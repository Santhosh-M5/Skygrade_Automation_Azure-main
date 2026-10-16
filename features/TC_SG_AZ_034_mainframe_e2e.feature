@mainframe @e2e
Feature: Mainframe modernization end-to-end

  Scenario: Day 1 - Mainframe project creation, analysis, and BRE trigger
    Given I am logged in for rbac as "skygrade-admin"
    And The user clicks the Create Portfolio button
    And The user enters the portfolio name "MainFrm" and clicks submit
    And I onboard a unique cluster using CSV "onboarding-mainframe.csv"
    And admin assigns the onboarded cluster to mainframe role users

    Given I am logged in for rbac as "application-architect"
    And I open the mainframe app
    And I generate analysis and wait for completion
    Then mainframe analysis is complete
    And I select BRE tool "Swimm.io AI-powered codebase" in edit details
    And I approve the plan and proceed

    Given I am logged in for rbac as "application-developer"
    And I open the mainframe app
    And I trigger BRE analysis
    Then BRE run is blocked while in progress
    And I save the run state

  Scenario: Day 2 - Resume saved run, verify BRE completion, and continue to data engineering
    Given I am logged in for rbac as "application-developer"
    And I resume the saved run
    And I open the mainframe app
    When I wait until BRE is complete
    And I continue to data engineering

    Given I am logged in for rbac as "application-architect"
    And I open the mainframe app
    When I create migration configuration "MFDistribution"
    Then migration configuration "MFDistribution" is visible
    And I set migration details for "MFDistribution"