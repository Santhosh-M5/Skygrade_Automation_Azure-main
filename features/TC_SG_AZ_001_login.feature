@login
Feature: Login
  As a Skygrade user
  I want to log in with valid credentials
  So that I can reach the App Modernization overview

  @smoke @valid-login
  Scenario: Log in with valid credentials
    Given I am logged in
    Then I should land on the App Modernization overview