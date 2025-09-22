# MCE Journey Builder via API - LLM Reference

## Create Journey - Working Structure
```json
{
  "key": "[UNIQUE_KEY]",
  "name": "[JOURNEY_NAME]",
  "status": "Draft",
  "entryMode": "SingleEntryAcrossAllVersions",
  "definitionType": "Multistep",
  "workflowApiVersion": 1,
  "triggers": [{
    "key": "TRIGGER-1",
    "name": "Entry Trigger",
    "type": "AutomationAudience",
    "arguments": {"startActivityKey": "{{Context.StartActivityKey}}"},
    "eventDefinitionKey": "[EVENT_KEY]",
    "configurationArguments": {}
  }],
  "activities": [
    {
      "key": "[ACTIVITY_KEY]",
      "name": "[ACTIVITY_NAME]",
      "type": "[ACTIVITY_TYPE]",
      "outcomes": [{"key": "outcome-1", "next": "[NEXT_ACTIVITY_KEY]"}],
      "configurationArguments": {}
    }
  ]
}
```

## Activity Types
```
EMAILV2 = Send email
WAIT = Time delay
ENGAGEMENTDECISION = Check email engagement
MULTICRITERIADECISION = Complex decision split
ABNTEST = Path Optimizer start
ABNTESTSTOP = Path Optimizer end
STOWAIT = Einstein Send Time Optimization
RANDOMSPLIT = Random percentage split
```

## Working Email Activity
```json
{
  "key": "EMAIL-1",
  "type": "EMAILV2",
  "name": "Send Welcome Email",
  "outcomes": [{"key": "sent", "next": "WAIT-1"}],
  "configurationArguments": {
    "emailSubject": "Welcome %%firstname%%!",
    "isMultipart": true,
    "isSendLogging": true,
    "isTrackingClicks": true
  }
}
```

## Working Wait Activity
```json
{
  "key": "WAIT-1",
  "type": "WAIT",
  "name": "Wait 3 Days",
  "outcomes": [{"key": "done", "next": "DECISION-1"}],
  "configurationArguments": {
    "waitDuration": 3,
    "waitUnit": "DAYS"
  }
}
```

## Working Engagement Decision
```json
{
  "key": "ENGAGEMENT-1",
  "type": "ENGAGEMENTDECISION",
  "name": "Check If Opened",
  "outcomes": [
    {"key": "yes", "next": "EMAIL-2", "arguments": {"when": true}, "metaData": {"label": "Opened"}},
    {"key": "no", "next": "EMAIL-3", "arguments": {"when": false}, "metaData": {"label": "Not Opened"}}
  ],
  "configurationArguments": {
    "statsTypeId": 1,
    "refActivityCustomerKey": "EMAIL-1"
  }
}
```

## statsTypeId Values
```
1 = Opened
2 = Not Opened
3 = Clicked
4 = Not Clicked
5 = Bounced
6 = Not Bounced
7 = Unsubscribed
8 = Not Unsubscribed
```

## Path Optimizer Structure
```json
{
  "key": "ABNTEST-1",
  "type": "ABNTEST",
  "name": "Path Optimizer",
  "metaData": {"capsule": {"id": "CAPSULE-1", "startId": "ABNTEST-1", "endId": "ABNTESTSTOP-1"}},
  "outcomes": [
    {"key": "path1", "next": "EMAIL-A", "arguments": {"percentage": 50, "branchResult": "branchResult-1"}},
    {"key": "path2", "next": "EMAIL-B", "arguments": {"percentage": 50, "branchResult": "branchResult-2"}}
  ],
  "configurationArguments": {
    "holdBackPercentage": 0,
    "winnerEvaluationType": "Engagement",
    "engagementPeriod": 3,
    "engagementPeriodUnits": "Days",
    "engagementWinnerMetric": "Clicks"
  }
}
```

## Einstein STO Activity
```json
{
  "key": "STOWAIT-1",
  "type": "STOWAIT",
  "name": "Einstein Send Time Optimization",
  "outcomes": [{"key": "done", "next": "EMAIL-1"}],
  "configurationArguments": {
    "params": {
      "slidingWindowHours": 24,
      "enableRandomTime": true
    },
    "applicationExtensionKey": "f828061a-5f0e-46a9-975e-18c414192d17"
  }
}
```

## Multi-Criteria Decision with Filter
```json
{
  "key": "DECISION-1",
  "type": "MULTICRITERIADECISION",
  "name": "Check Criteria",
  "outcomes": [
    {"key": "path1", "next": "EMAIL-2", "metaData": {"label": "High Value", "criteriaDescription": "Order > 100"}},
    {"key": "path2", "next": "EMAIL-3", "metaData": {"label": "Low Value", "criteriaDescription": "Order <= 100"}}
  ],
  "configurationArguments": {
    "criteria": {
      "path1": "<FilterDefinition><ConditionSet Operator=\"AND\"><Condition Key=\"OrderValue\" Operator=\"GreaterThan\"><Value><![CDATA[100]]></Value></Condition></ConditionSet></FilterDefinition>",
      "path2": "<FilterDefinition><ConditionSet Operator=\"AND\"><Condition Key=\"OrderValue\" Operator=\"LessThanOrEqual\"><Value><![CDATA[100]]></Value></Condition></ConditionSet></FilterDefinition>"
    }
  }
}
```

## API Endpoints
```
POST /interaction/v1/interactions - Create journey
GET /interaction/v1/interactions/{id} - Get journey
POST /interaction/v1/interactions/publishAsync/{id} - Publish journey
POST /interaction/v1/interactions/stop/{id} - Stop journey
```

## Entry Modes
```
OnceAndDone = Contact enters only once ever
SingleEntryAcrossAllVersions = Can re-enter after exiting
MultipleEntries = Can be in journey multiple times
```

## Critical Rules
- holdBackPercentage must be 0 for recurring journeys
- Path Optimizer requires ABNTESTSTOP with matching capsule ID
- All paths must converge at ABNTESTSTOP
- Data Extensions must be linked to Contact Model for filters