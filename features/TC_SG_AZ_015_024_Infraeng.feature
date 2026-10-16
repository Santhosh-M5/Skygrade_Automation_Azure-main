@infraeng
Feature: App Stack Validation

  Scenario: Validate App Stack resources against StackGen

    Given I am logged in as "infra-developer"

    When I Click the Infra Engineering

    Then I validate IaC Generation status

    And I Validate the edit tag button
    
    And I capture available services
    
    And I validate App Stack resources in StackGen separte