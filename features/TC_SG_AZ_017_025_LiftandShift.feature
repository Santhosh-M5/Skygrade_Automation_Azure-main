@liftandshift
Feature: Lift And Shift Accelerator

  Scenario: Validate Lift And Shift Accelerator Data

    Given I am logged in as "application-developer"

    When I open the Lift And Shift application

    And I compare the application details from plan tab to build tab

    And I configure Lift And Shift

    And I update Lift And Shift tags

    And I capture server details from Skygrade

    Then I validate server details in Matilda