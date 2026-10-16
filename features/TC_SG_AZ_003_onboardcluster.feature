@onboard
Feature: Onboard Cluster

  Background:
    Given I am logged in

  @regression
  Scenario: Onboard a cluster into an EXISTING portfolio with a valid CSV
    When I open the Onboard Cluster panel
    And I select the existing portfolio "AutTest01"
    And I enter a unique cluster name
    And I enter the cluster description "App that tests"
    And I upload a fresh valid application CSV
    Then the CSV should be accepted
    And I onboard the cluster
    Then the cluster should be onboarded successfully

  @regression
  Scenario: Onboard a cluster into a NEWLY created portfolio
    Given I create a new portfolio
    When I open the Onboard Cluster panel
    And I select the portfolio I created
    And I enter a unique cluster name
    And I enter the cluster description "App that tests"
    And I upload a fresh valid application CSV
    Then the CSV should be accepted
    And I onboard the cluster
    Then the cluster should be onboarded successfully

  @negative
  Scenario: Reject CSV with a duplicate app name
    When I open the Onboard Cluster panel
    And I select the existing portfolio "AutTest01"
    And I enter the cluster name "DupCluster"
    And I enter the cluster description "negative"
    And I upload the application CSV "onboarding-duplicate.csv"
    Then an error popup should be shown

  @negative
  Scenario: Reject CSV with an empty mandatory field
    When I open the Onboard Cluster panel
    And I select the existing portfolio "AutTest01"   
    And I enter the cluster name "MissingCluster"
    And I enter the cluster description "negative"
    And I upload the application CSV "onboarding-missing.csv"
    Then an error popup should be shown

    @negative
  Scenario Outline: Reject CSV with invalid SCM during onboarding
    When I open the Onboard Cluster panel
    And I select the existing portfolio "AutTest01"
    And I enter the cluster name "InvalidSCMCluster"
    And I enter the cluster description "negative"
    And I upload a CSV with SCM "<scm>"
    Then an error popup should be shown

    Examples:
      | scm          |
      | GitLab       |
      | Bitbucket    |
      | Azure DevOps |
      | SVN          |

  @negative
  Scenario Outline: Reject CSV with same current and target platform during onboarding
    When I open the Onboard Cluster panel
    And I select the existing portfolio "AutTest01"
    And I enter the cluster name "SamePlatCluster"
    And I enter the cluster description "negative"
    And I upload a CSV with same platform "<provider>" and "<platform>"
    Then an error popup should be shown

    Examples:
      | provider | platform             |
      | AWS      | EC2                  |
      | AWS      | EKS                  |
      | AWS      | ECS                  |
      | AWS      | Lambda               |
      | AWS      | Beanstalk            |
      | Azure    | AKS                  |
      | Azure    | App Service          |
      | Azure    | Azure Function       |
      | Azure    | Azure VM             |
      | Azure    | Azure Container Apps |
      | GCP      | GKE                  |
      | GCP      | Compute Engine       |
      | GCP      | Cloud Run            |
      | GCP      | Cloud Functions      |
      | GCP      | App Engine           |
  
