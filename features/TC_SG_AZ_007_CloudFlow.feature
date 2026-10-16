@cloud @cloud-flow
Feature: Cloud flow - infra-architect manages cloud settings; both architects edit plan

  # ===================== AWS =====================
  @aws @positive @smoke @regression
  Scenario: AWS - add account+cluster and verify in Edit Plan
    Given I am logged in as "infra-architect"
    And I open Settings Cloud
    When I open Add Account for "AWS"
    And I add the AWS cloud account from data
    Then the cloud account should exist
    When I add the AWS cluster from data
    Then the cluster should exist
    When I open Edit Plan for the configured app
    And I configure the plan for "AWS" with target "EKS"
    Then the cloud account should be selectable in the plan
    And the target cluster should be selectable in the plan

  @aws @negative @regression
  Scenario: AWS - duplicate cluster is rejected
    Given I am logged in as "infra-architect"
    And I open Settings Cloud
    When I open the "AWS" provider
    And I add the AWS cluster from data
    Then the cluster should exist
    When I try to add the same AWS cluster again
    Then the cluster should be rejected as duplicate

  @aws @negative @regression
  Scenario: AWS - duplicate Account ID is rejected
    Given I am logged in as "infra-architect"
    And I open Settings Cloud
    When I open Add Account for "AWS"
    And I enter an AWS account with a duplicate Account ID
    Then I should see the error "Account ID already exists."
    And the "Add Account" submit should be disabled

  # ===================== AZURE =====================
  @azure @positive @regression
  Scenario: Azure - add account+cluster and verify in Edit Plan
    Given I am logged in as "infra-architect"
    And I open Settings Cloud
    When I open Add Account for "Azure"
    And I add the Azure cloud account from data
    Then the Azure cloud account should exist
    When I add the Azure cluster from data
    Then the cluster should exist
    When I open Edit Plan for the configured app
    And I configure the plan for "Azure" with target "AKS"
    Then the cloud account should be selectable in the plan
    And the target cluster should be selectable in the plan

  @azure @negative @regression
  Scenario: Azure - duplicate cluster is rejected
    Given I am logged in as "infra-architect"
    And I open Settings Cloud
    When I open the "Azure" provider
    And I add the Azure cluster from data
    Then the cluster should exist
    When I try to add the same Azure cluster again
    Then the cluster should be rejected as duplicate

  # ===================== EDIT PLAN - both architects =====================
  @plan @positive @regression
  Scenario Outline: <role> can edit the plan (account & target cluster selectable)
    Given I am logged in as "<role>"
    When I open Edit Plan for the configured app
    And I configure the plan for "AWS" with target "EKS"
    Then the cloud account should be selectable in the plan
    And the target cluster should be selectable in the plan

    Examples:
      | role                  |
      | infra-architect       |
      | application-architect |

  # ===================== RBAC boundary =====================
  @cloudrbac @negative @regression
  Scenario: application-architect CANNOT add a cloud account
    Given I am logged in as "application-architect"
    Then the Add Account action should be denied

  # ===================== Target-provider rule =====================
  @rule @regression
  Scenario Outline: Target cluster enabled only for the kubernetes target provider
    Given I am logged in as "infra-architect"
    When I open Edit Plan for the configured app
    And I select cloud provider "<cloud>" and target provider "<target>"
    Then the target cluster dropdown should be "<state>"

    Examples:
      | cloud | target      | state    |
      | AWS   | EKS         | enabled  |
      | Azure | AKS         | enabled  |
      | AWS   | EC2         | disabled |
      | Azure | App Service | disabled |
