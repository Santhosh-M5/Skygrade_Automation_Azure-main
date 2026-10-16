@retire
Feature: Retire (non-mainframe) Analysis -> Plan

  Scenario: Retire lifecycle -> IaC -> Lift and Shift -> Containarize app -> deploy (CI/CD) -> cloud ops
    #  ---- Admin: portfolio + onboard + assign ----
     Given I am logged in as "skygrade-admin"
     And admin assigns cluster scope

     #---- Architect: analysis + set Rehost disposition ----
     Given I am logged in for rbac as "application-architect"
    # And I search for the app in Search button
    # And I Run analysis and wait for completion
    # Then the analysis status should be "Completed"

    #------Analysis+Plan page------------------
     Given I open the onboarded app
    #  Then I verify Analysis Details page
    #  And I compare data with CAST Highlight
     And I verify when giving "Retire" it should not proceed to next page
     And  I verify when giving "Rebuild" it should not proceed to next page

     #--Delete the permission given to cluster
     Given I am logged in for rbac as "skygrade-admin"
    And I delete the user permission I have given to the cluster