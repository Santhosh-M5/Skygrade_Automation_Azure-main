@pipeline
Feature: Pipeline Creation

  Background:
    Given I am logged in as "application-developer"

  Scenario: Validate CI Pipeline Creation

    When I open the Pipeline application
    Then I create a CI Pipeline
    And I verify the CI Pipeline is created

  Scenario: Validate CD Pipeline Creation

    When I open the Pipeline application
    Then I create a CD Pipeline
    And I verify the CD Pipelines are created