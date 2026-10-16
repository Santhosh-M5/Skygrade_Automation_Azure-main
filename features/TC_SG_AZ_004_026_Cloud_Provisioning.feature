@cloudprovisioning
Feature: Importing catalog

  @smoke
  Scenario: The user clicks the AWS Option
    Given I am logged in as 'infra-architect'
    Then The user clicks the Cloud Provisioning tab and then the Service catalog tab
    When The user checks the visibility of Cloud Provisioning tab
    Then The user checks the visibility of Service catalog tab
    And The user verfies the visibility of Elements
    And The user select AWS from given Options

  @negative
  Scenario: Rejects empty Import Catalog
    Given I am logged in as 'infra-architect'
    And The user clicks the Cloud Provisioning tab and then the Service catalog tab
    And The user clicks the Import Catalog without selecting values
    Then The user sees the error message
    And The user selects multiple Catalog results in only one selection
    And The user search the catalog "Nothing!!!"
    And The error message should appear and import catalog should disable

  @validation
  Scenario: Successfully Importing catalog from list
    Given I am logged in as 'infra-architect'
    And The user clicks the Cloud Provisioning tab and then the Service catalog tab
    Then The user search the catalog "Namespace in AWS"
    And The user checks the successfull message
    And The user checks the visibility of added catalog "Create a Namespace in AWS EKS Cluster." in Existing Service catalogs

  @negative
  Scenario: Import button disabled
    Given I am logged in as 'infra-architect'
    And The user clicks the Cloud Provisioning tab and then the Service catalog tab
    Then The user clicks the rest catalog and import
    And The error message should appear and import catalog should disable

  @smoke
  Scenario: Successful redirection to Morpheus
    Given I am logged in as 'infra-architect'
    And The user clicks the Cloud Provisioning tab and then the Service catalog tab
    Then The user clicks the catalog name with description "Create a Namespace in AWS EKS Cluster." and redirects to Morpheus page
    And The user fills the Morphues login credentials
    And The user verifies the catalog in Morpheus page

  @smoke
  Scenario: Verify Order details
    Given I am logged in as 'infra-architect'
    And The user clicks the Cloud Provisioning tab and then the Service catalog tab
    Then The user clicks the order link for catalog "Create a Namespace in AWS EKS Cluster."
    # And The user fills the Morphues login credentials
    And The user verifies the order details
