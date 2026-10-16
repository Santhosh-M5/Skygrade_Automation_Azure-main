@cluster-analysis
Feature: Cluster app count and disposition breakdown validation

  Scenario: Validate app counts, disposition breakdown, and report page consistency for a cluster
    Given I am logged in as "application-architect"
    And I search for the target cluster and open its apps
    Then the cluster detail summary stats should match the card's app count

    When I count all application rows across every page of the cluster table
    Then the total table row count should match the total apps summary

    When I reset the table to the first page
    And I capture the disposition breakdown across all pages
    Then the disposition totals should match the total apps summary

    When I reset the table to the first page again
    And I capture the completed application names from the main table

    When I navigate to the View Results report page
    Then the report's disposition values should match the table's disposition counts
    And the completed application names should match between the table and the report