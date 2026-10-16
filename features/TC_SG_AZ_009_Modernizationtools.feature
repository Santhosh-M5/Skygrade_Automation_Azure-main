# @modernizationtools
# Feature: Modernization Settings tool enable/disable propagation
#   As an admin, I want the tool toggles in Modernization Settings to control
#   what the Cloud Ops tab shows for an application, so that disabled tools are
#   clearly flagged and re-enabled tools work again.

#   Background:
#     Given I am logged in as "skygrade-admin"
#     And I navigate to Modernization Settings

#   Scenario Outline: Turning a tool off disables it on the application, and turning it back on restores it
#     Given the "<tool>" tool is turned off in Modernization Settings
#     When I open the Cloud Ops section of the target application
#     Then the "<tool>" tab should show that the tool is not enabled

#     When I return to Modernization Settings
#     And I turn the "<tool>" tool back on
#     And I open the Cloud Ops section of the target application
#     Then the "<tool>" tab should show the tool details

#     Examples:
#       | tool          |
#       | Observability |
#       | Security      |
#       | FinOps        |


@modernizationtools
Feature: Modernization Settings tool enable/disable propagation

  Scenario: Disable Observability, Security, and FinOps tools and verify disabled state on the app, then re-enable and verify enabled state
    Given I am logged in as "skygrade-admin"
    And I navigate to Modernization Settings

    When I open the Observability tool section and ensure its toggle is off
    And I open the Security tool section and ensure its toggle is off
    And I open the FinOps tool section and ensure its toggle is off

    When I navigate to the target application's Cloud Ops section
    Then the Observability tab should show it is not enabled
    And the Security tab should show it is not enabled
    And the FinOps tab should show it is not enabled

    When I navigate back to Modernization Settings
    And I turn the Observability tool back on
    And I turn the Security tool back on
    And I turn the FinOps tool back on

    When I navigate to the target application again
    Then the Observability tab should show application log details
    And the Security tab should show cloud security alerts
    And the FinOps tab should show Fin Ops details