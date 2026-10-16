@rehost
Feature: Rehost end-to-end (non-mainframe) with deploy pipelines and cloud ops

  Scenario: Rehost lifecycle -> IaC -> Lift and Shift -> Containarize app -> deploy (CI/CD) -> cloud ops
     # ---- Admin: portfolio + onboard + assign ----
    #  Given I am logged in as "skygrade-admin"
    #  And admin assigns cluster scope

     #---- Architect: analysis + set Rehost disposition ----
      Given I am logged in for rbac as "application-architect"
      # And I search for the app in Search button
      # And I Run analysis and wait for completion
      # Then the analysis status should be "Completed"

    #------Analysis+Plan page------------------
     Given I open the onboarded app
    #  Then I verify Analysis Details page
    #  And I compare data with CAST Highlight
     And I edit the plan and set disposition to "Rehost"

    # ---- Infra-developer: IaC generation ----
    Given I am logged in for rbac as "infra-developer"
    And I open the onboarded app
    When I validate IaC Generation status
    Then I capture available services
    And I validate App Stack resources in StackGen for full flow

    # ---- Application-developer: lift & shift ----
     Given I am logged in for rbac as "application-developer"
     And I open the onboarded app
     And I proceed to the "App Engineering" section
     When I configure Lift And Shift
    #  And I update Lift And Shift tags
     Then I capture server details from Skygrade
     And I validate server details in Matilda for fullflow

    # -- Containarize app ---
    Given I am logged in as "application-developer"
    And I open the onboarded app
    And I proceed to the "App Engineering" section
    When I initiate containerization if the application is not yet linked
    Then the "Add Host", "Refresh", and "Edit Tag" buttons should be visible
    And I capture the existing host table data

    When I validate the Add Host form for "linux" OS with "basic" connection type
    And I validate the Add Host form for "linux" OS with "ssh" connection type
    And I validate the Add Host form for "windows" OS with "basic" connection type
    #--- Removed ssh option for windows OS
    # And I validate the Add Host form for "windows" OS with "kerberos" connection type

    Then I capture the final host table data
    And I open the first host's alias link to the Chai site
    And I log in to the Chai site
    And I search and open the application on the Chai site for full flow
    And I navigate to the Discover page on the Chai site
    Then the host data on the app and the Chai site should match
    
    # ---- Deploy: CI/CD pipelines ----
    
    Then I create a CI Pipeline
    And I open the onboarded app
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
