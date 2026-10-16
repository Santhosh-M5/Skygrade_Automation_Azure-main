@rearchitect
Feature: Rearchitect end-to-end (non-mainframe) with deploy pipelines and cloud ops

  Scenario: Rearchitect lifecycle -> IaC -> Monolith to Microservice -> deploy (CI/CD) -> cloud ops
    # ---- Admin: portfolio + onboard + assign ----
    Given I am logged in as "skygrade-admin"
    And admin assigns cluster scope

     # ---- Architect: analysis + set Rearchitect disposition ----
    Given I am logged in for rbac as "application-architect"
    # And I search for the app in Search button
    # And I Run analysis and wait for completion
    # Then the analysis status should be "Completed"

    #------Analysis+Plan page------------------
    Given I open the onboarded app
    # Then I verify Analysis Details page
    # And I compare data with CAST Highlight
    And I edit the plan and set disposition to "Rearchitect"

    # ---- Infra-developer: IaC generation ----
    Given I am logged in for rbac as "infra-developer"
    And I open the onboarded app
    When I validate IaC Generation status
    Then I capture available services
    And I validate App Stack resources in StackGen for full flow

    # ---- Application-developer: lift & shift ----
     Given I am logged in for rbac as "application-developer"
     And I open the onboarded app
    When I configure Monolith Breakdown
    And I capture App Engineering metrics
    Then I validate Learning metrics
    And I validate High Debt metrics

    # ---- Deploy: CI/CD pipelines ----
    
    Then I create a CI Pipeline
    And I open the onboarded app
    And I cliked previous button
    Then I create a CD Pipeline

    # ---- Cloud Ops ----
    Given I am logged in for rbac as "application-architect"
    And I open the onboarded app
    And I go to the "Cloud Ops" phase
    When I go to the "Observability" phase
    And I edit observability tags
    Then the application log details should be visible
    When I go to the "Security" phase
    And I edit security tags
    Then the cloud security alerts should be visible
    When I go to the "FinOps" phase
    And I edit finops tags
    Then the finops cost details should be visible

    #---Delete user permission -----
    Given I am logged in for rbac as "skygrade-admin"
    And I delete the user permission I have given to the cluster
