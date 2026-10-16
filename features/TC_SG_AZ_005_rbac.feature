@rbac
Feature: Role Based Access Control

  @rbac-setup
  Scenario: Admin assigns all cluster scopes from JSON
    Given I am logged in for rbac as 'skygrade-admin'
    When admin assigns all cluster scopes

  @rbac-probe
  Scenario Outline: Role access probe check
    Given I am logged in for rbac as '<role>'
    When I attempts to '<permission>'
    Then The access should be '<expected>'

    Examples:
      # ── independent setup checks ──────────────────────────────
      | role                  | permission                 | expected |
      | skygrade-admin        | CREATE_PORTFOLIO           | allowed  |
      | skygrade-admin        | ONBOARD_TRACK              | allowed  |
      | skygrade-admin        | CREATE_EMAIL_GROUP_MAPPING | allowed  |
      | skygrade-admin        | DELETE_EMAIL_GROUP_MAPPING | allowed  |
      | skygrade-admin        | ADD_NEW_APPLICATION        | allowed  |
      | infra-architect       | ADD_CLOUD_ACCOUNT          | allowed  |
      | infra-architect       | DELETE_CLOUD_ACCOUNT       | allowed  |
      | infra-architect       | IMPORT_SERVICE_CATALOG     | allowed  |
      | infra-architect       | EDIT_PLAN                  | allowed  |
      # ── application-architect drives the app THROUGH approval ─
      | application-architect | RUN_ANALYSIS               | allowed  |
      | application-architect | RE_RUN_ANALYSIS            | allowed  |
      | application-architect | EDIT_PLAN                  | allowed  |
      | application-architect | APPROVE_PLAN               | allowed  |
      | application-architect | ADD_MIGRATION_CONFIG       | allowed  |
      # ── plan now approved → infra-developer can initiate IAC ──
      | infra-developer       | INITIATE_IAC_GENERATION    | allowed  |
      # ── build done → deploy / engineering ─────────────────────
      | application-developer | CREATE_PIPELINE            | allowed  |
      | application-developer | INITIATE_BRE_ANALYSIS      | allowed  |
      | application-developer | RE_RUN_BRE_ANALYSIS        | allowed  |
      # ── cloud ops sub-tabs, FinOps last ──────────────────────
      | application-architect | OBSERVABILITY              | allowed  |
      | application-architect | SECURITY                   | allowed  |
      | application-architect | FINOPS                     | allowed  |
      # ── negative scenarios ───────────────────────────────────
      | infra-developer       | CREATE_PORTFOLIO           | denied   |
      | infra-developer       | ONBOARD_TRACK              | denied   |
      | infra-developer       | ADD_CLOUD_ACCOUNT          | denied   |
      | infra-developer       | EDIT_PLAN                  | denied   |
      | infra-developer       | APPROVE_PLAN               | denied   |
      | application-developer | EDIT_PLAN                  | denied   |
      | application-developer | APPROVE_PLAN               | denied   |
      | application-developer | INITIATE_IAC_GENERATION    | denied   |

  @rbac-teardown
  Scenario: Cleanup - remove all cluster scope assignments
    Given I am logged in for rbac as 'skygrade-admin'
    When admin removes all cluster scopes
