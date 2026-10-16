@cloud @azure-field-validation @shared-session
Feature: Cloud Settings - Azure Add Account field validation

  Background:
    Given I log in as infra-architect
    And I open Settings Cloud
    And I open Add Account for "Azure"

  @positive @smoke @regression
  Scenario: Add a valid Azure cloud account
    When I enter a unique Azure account
    And I submit the account
    Then the account should be added successfully

  @positive @regression
  Scenario: Submit enabled only when all fields valid
    When I enter a unique Azure account
    Then the "Add Account" submit should be enabled

  @negative @smoke @regression
  Scenario: All fields blank -> submit disabled
    Then the "Add Account" submit should be disabled

  @negative @regression
  Scenario: Missing Tenant ID -> submit disabled
    When I fill Azure Account Name "NoTenant"
    And I fill Azure Subscription ID "3f5c2a91-7b6d-4d2e-9c4f-1a2b3c4d5e68"
    And I fill Azure Service Connection "skygrade-azure-service-conn"
    Then the "Add Account" submit should be disabled

  @negative @regression
  Scenario: Missing Subscription ID -> submit disabled
    When I fill Azure Account Name "NoSub"
    And I fill Azure Tenant ID "9a8b7c6d-5e4f-3a2b-1c0d-abcdef123456"
    And I fill Azure Service Connection "skygrade-azure-service-conn"
    Then the "Add Account" submit should be disabled

  @negative @regression
  Scenario: Invalid Tenant ID format
    When I fill Azure Account Name "BadTenant"
    And I fill Azure Tenant ID "not-a-guid"
    And I fill Azure Subscription ID "3f5c2a91-7b6d-4d2e-9c4f-1a2b3c4d5e68"
    And I fill Azure Service Connection "skygrade-azure-service-conn"
    Then I should see the validation message "Must be a valid GUID"
    And the "Add Account" submit should be disabled

  @negative @regression
  Scenario: Subscription ID limited to 36 characters
    When I type 40 characters into the Azure Subscription ID
    Then the Azure Subscription ID should hold at most 36 characters

  @negative @regression
  Scenario: Account Name limited to 50 characters
    When I type 60 characters into the Azure Account Name
    Then the Azure Account Name should hold at most 50 characters
