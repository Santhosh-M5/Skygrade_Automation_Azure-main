@portfolio
Feature: Skygrade Portfolio Management

  Background:
    Given I am logged in

  @smoke
  Scenario: Verify Create Portfolio button is visible
    When The user checks the visibility of create portfolio button

  @smoke
  Scenario: Create a new portfolio
    Then The user clicks the Create Portfolio button
    Then The user enters the portfolio name "QAAutTest" and clicks submit

  @validation
  Scenario: Duplicate portfolio name validation
    Then The user enters the same portfolio name "QAAutTest" and checks whether dupliacte portfolio name is created or not

  @search
  Scenario: Search portfolio by name
    Then The user checks the visibility of search button
    Then The user searches the Portfolio name"QAAutTest" in search box
    Then The user must find the Portfolio name"QAAutTest" in the result