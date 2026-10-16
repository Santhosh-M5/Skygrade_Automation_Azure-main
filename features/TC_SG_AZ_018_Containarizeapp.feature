@containerize
Feature: Containerize App - Add Host and validate against Chai

  Scenario: Validate Add Host form, create a host if needed, and compare data with Chai site
    Given I am logged in as "application-developer"
    And I navigate to the containerize app and open the "Plan" tab
    And I proceed to the "App Engineering" section
    When I compare the application details from plan tab to build tab
    And I initiate containerization if the application is not yet linked
    Then the "Add Host", "Refresh", and "Edit Tag" buttons should be visible
    And I capture the existing host table data

    When I validate the Add Host form for "linux" OS with "basic" connection type
    And I validate the Add Host form for "linux" OS with "ssh" connection type
    And I validate the Add Host form for "windows" OS with "basic" connection type
    # And I validate the Add Host form for "windows" OS with "kerberos" connection type

    Then I capture the final host table data
    And I open the first host's alias link to the Chai site
    And I log in to the Chai site
    And I search and open the application on the Chai site
    And I navigate to the Discover page on the Chai site
    Then the host data on the app and the Chai site should match