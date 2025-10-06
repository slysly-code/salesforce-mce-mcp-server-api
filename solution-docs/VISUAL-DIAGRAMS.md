# Visual Flow Diagrams

## 🎯 The Problem (Before)

```
┌─────────────────────────────────────────────────────────┐
│                  USER REQUEST                           │
│            "Create a welcome email"                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    LLM BEHAVIOR                         │
│  • Reads tool schema only                               │
│  • Skips documentation                                  │
│  • Makes assumptions about structure                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              TOOL CALL: mce_v1_rest_request             │
│                                                          │
│  POST /asset/v1/content/assets                          │
│  {                                                       │
│    "assetType": {"id": 208},  ❌ WRONG!                 │
│    "name": "Welcome Email"                              │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   API RESPONSE                          │
│                                                          │
│  ❌ Non-editable HTML paste email created               │
│  ❌ User cannot edit in Content Builder                 │
│  ❌ Missing required structure                          │
│                                                          │
│  SUCCESS RATE: 10%                                      │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ The Solution (After)

```
┌─────────────────────────────────────────────────────────┐
│                  USER REQUEST                           │
│            "Create a welcome email"                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│         STEP 1: PRE-FLIGHT CHECK                        │
│                                                          │
│  Tool: mce_v1_preflight_check                           │
│  Args: {                                                │
│    "operation_type": "email_creation",                  │
│    "user_intent": "Create a welcome email"             │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 PRE-FLIGHT RESPONSE                     │
│                                                          │
│  📚 Required Reading:                                   │
│    1. mce://guides/editable-emails                      │
│    2. mce://examples/complete-email                     │
│                                                          │
│  ⚠️  Critical Rules:                                    │
│    • NEVER use assetType.id = 208                       │
│    • ALWAYS use id: 207, name: "templatebasedemail"     │
│                                                          │
│  🔑 Clearance Token: CLEARANCE-1234567890               │
│                                                          │
│  📊 Success Rate: 10% without → 95% with pre-flight     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│         STEP 2: READ DOCUMENTATION                      │
│                                                          │
│  Resource: mce://guides/editable-emails                 │
│  Content: [Full markdown guide]                         │
│    • Explains assetType.id = 207                        │
│    • Shows required structure                           │
│    • Provides complete examples                         │
│                                                          │
│  Resource: mce://examples/complete-email                │
│  Content: [Full JSON example]                           │
│    • Complete working structure                         │
│    • Shows slots and blocks                             │
│    • Template to follow                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│       STEP 3: BUILD REQUEST (Following Docs)            │
│                                                          │
│  LLM creates request based on documentation:            │
│  {                                                       │
│    "assetType": {                                       │
│      "id": 207,  ✅ CORRECT!                            │
│      "name": "templatebasedemail"  ✅ HAS NAME!         │
│    },                                                    │
│    "views": {                                           │
│      "html": {                                          │
│        "slots": { ... }  ✅ HAS SLOTS!                  │
│      }                                                   │
│    }                                                     │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            STEP 4: VALIDATE REQUEST                     │
│                                                          │
│  Tool: mce_v1_validate_request                          │
│  Args: {                                                │
│    "request_type": "email",                             │
│    "request_body": { ... planned request ... }          │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│               VALIDATION RESPONSE                       │
│                                                          │
│  {                                                       │
│    "valid": true,  ✅                                   │
│    "errors": [],                                        │
│    "warnings": [],                                      │
│    "recommendation": "Request looks good!"              │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           STEP 5: CREATE EMAIL (With Token)             │
│                                                          │
│  Tool: mce_v1_rest_request                              │
│  Args: {                                                │
│    "clearance_token": "CLEARANCE-1234567890",  ✅       │
│    "method": "POST",                                    │
│    "path": "/asset/v1/content/assets",                  │
│    "body": { ... validated request ... }               │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  API RESPONSE                           │
│                                                          │
│  ✅ Editable template-based email created               │
│  ✅ User can edit in Content Builder                    │
│  ✅ Has proper structure (slots + blocks)               │
│  ✅ Email ID: 12345                                     │
│                                                          │
│  SUCCESS RATE: 95%                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Token Enforcement Flow

```
┌─────────────────────────────────────────────────────────┐
│  Attempt to create email WITHOUT clearance token        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │  Has clearance token?  │
        └───────┬────────────────┘
                │
        ┌───────┴───────┐
        │               │
       NO              YES
        │               │
        ↓               ↓
┌─────────────┐  ┌─────────────────┐
│   BLOCKED   │  │  TOKEN VALID?   │
│             │  └────────┬────────┘
│ Return:     │           │
│ "⛔ Call    │    ┌──────┴──────┐
│  preflight  │    │             │
│  check      │   YES           NO
│  first"     │    │             │
└─────────────┘    ↓             ↓
           ┌──────────────┐  ┌────────────┐
           │   ALLOWED    │  │   EXPIRED  │
           │              │  │            │
           │ Proceed with │  │ Return:    │
           │ API call     │  │ "Token     │
           │              │  │  expired"  │
           └──────────────┘  └────────────┘
```

---

## 📊 Success Rate Progression

```
Week 1: Documentation Not Enforced
═════════════════════════════════════
Attempts: ████████████████████ (20)
Success:  ██ (2)
Rate:     10%

Week 2: Resources + Enhanced Descriptions
═════════════════════════════════════
Attempts: ████████████████████ (20)
Success:  ██████████ (10)
Rate:     50%

Week 3: Full Solution with Enforcement
═════════════════════════════════════
Attempts: ████████████████████ (20)
Success:  ███████████████████ (19)
Rate:     95%
```

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                  LAYER 1: RESOURCES                     │
│                                                          │
│  • Documentation exposed as MCP resources               │
│  • 9 resources available                                │
│  • Automatic file reading                               │
│  • Read tracking                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│             LAYER 2: ENHANCED TOOLS                     │
│                                                          │
│  • Clear, explicit tool descriptions                    │
│  • Mandatory workflow instructions                      │
│  • Success metrics shown                                │
│  • Common failures highlighted                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           LAYER 3: PRE-FLIGHT CHECK                     │
│                                                          │
│  • Mandatory entry point                                │
│  • Returns documentation list                           │
│  • Issues clearance token                               │
│  • Shows step-by-step checklist                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              LAYER 4: VALIDATION                        │
│                                                          │
│  • Pre-execution checks                                 │
│  • Catches common errors                                │
│  • Provides specific fixes                              │
│  • Points to relevant docs                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           LAYER 5: TOKEN ENFORCEMENT                    │
│                                                          │
│  • Email creation requires token                        │
│  • Token from pre-flight only                           │
│  • One-time use                                         │
│  • 30-minute expiration                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              LAYER 6: API EXECUTION                     │
│                                                          │
│  • Execute validated request                            │
│  • Track metrics                                        │
│  • Return result                                        │
│  • Update statistics                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 Metric Tracking Flow

```
┌─────────────────────────────────────────────────────────┐
│                  EVERY API CALL                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
                  Track:
        ┌────────────┼────────────┐
        │            │            │
        ↓            ↓            ↓
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │Attempts │  │Pre-flight│ │Docs Read│
  │  ++     │  │ Used?   │  │  Track  │
  └─────────┘  └─────────┘  └─────────┘
        │            │            │
        └────────────┼────────────┘
                     ↓
              ┌─────────────┐
              │API Response │
              └──────┬──────┘
                     │
            ┌────────┴────────┐
            │                 │
         SUCCESS            FAILURE
            │                 │
            ↓                 ↓
    ┌──────────────┐   ┌──────────────┐
    │ Successes++  │   │ Log Error    │
    │              │   │ Type         │
    └──────────────┘   └──────────────┘
            │                 │
            └────────┬────────┘
                     ↓
            ┌────────────────┐
            │ Calculate:     │
            │ - Success Rate │
            │ - Pre-flight % │
            │ - Docs Read #  │
            └────────────────┘
```

---

## 🎯 Decision Tree for LLMs

```
                    User Request
                         │
                         ↓
                  ┌──────────────┐
                  │ Is it email  │
                  │ creation?    │
                  └──────┬───────┘
                         │
                ┌────────┴────────┐
                │                 │
               YES               NO
                │                 │
                ↓                 ↓
    ┌───────────────────┐   ┌──────────────┐
    │Call pre-flight    │   │Use appropriate│
    │check              │   │tool directly  │
    └────────┬──────────┘   └──────────────┘
             │
             ↓
    ┌───────────────────┐
    │Read documentation │
    │from response      │
    └────────┬──────────┘
             │
             ↓
    ┌───────────────────┐
    │Build request      │
    │following docs     │
    └────────┬──────────┘
             │
             ↓
    ┌───────────────────┐
    │Validate request   │
    └────────┬──────────┘
             │
      ┌──────┴──────┐
      │             │
    Valid      Invalid
      │             │
      ↓             ↓
 ┌────────┐   ┌──────────┐
 │Create  │   │Fix errors│
 │email   │   │and retry │
 │with    │   │validate  │
 │token   │   └──────────┘
 └────────┘
```

---

## 🔍 Validation Logic Flow

```
                  Validate Request
                         │
                         ↓
            ┌─────────────────────┐
            │ Check assetType.id  │
            └──────────┬──────────┘
                       │
              ┌────────┴────────┐
              │                 │
            = 208             = 207
              │                 │
              ↓                 ↓
      ┌──────────────┐   ┌──────────────┐
      │❌ CRITICAL   │   │✅ Correct ID │
      │   ERROR      │   └──────┬───────┘
      └──────────────┘          │
                                ↓
                       ┌──────────────────┐
                       │Has assetType.name│
                       └────────┬─────────┘
                                │
                       ┌────────┴────────┐
                       │                 │
                      YES               NO
                       │                 │
                       ↓                 ↓
                 ┌──────────┐     ┌──────────┐
                 │✅ Good   │     │❌ ERROR  │
                 └─────┬────┘     └──────────┘
                       │
                       ↓
              ┌──────────────────┐
              │ Check for slots  │
              └────────┬─────────┘
                       │
              ┌────────┴────────┐
              │                 │
            Found            Missing
              │                 │
              ↓                 ↓
       ┌──────────┐      ┌──────────┐
       │✅ Good   │      │⚠️ Warning│
       └──────────┘      └──────────┘
              │                 │
              └────────┬────────┘
                       ↓
                  ┌─────────┐
                  │ Return  │
                  │ Results │
                  └─────────┘
```

---

## 🎨 Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                    EMAIL STRUCTURE                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  assetType: {id: 207, name: "templatebasedemail"}       │
│  │                                                       │
│  └─→ views                                              │
│      │                                                   │
│      ├─→ subjectline: {content: "..."}                  │
│      │                                                   │
│      ├─→ preheader: {content: "..."}                    │
│      │                                                   │
│      └─→ html                                           │
│          │                                               │
│          ├─→ content: "<!DOCTYPE html>..."              │
│          │                                               │
│          ├─→ slots                                      │
│          │   │                                           │
│          │   ├─→ header                                 │
│          │   │   │                                       │
│          │   │   ├─→ content: "<div data-type...>"      │
│          │   │   │                                       │
│          │   │   └─→ blocks                             │
│          │   │       │                                   │
│          │   │       └─→ logo_block                     │
│          │   │           ├─→ assetType: {199, "imageblock"}│
│          │   │           ├─→ content: "<img...>"        │
│          │   │           ├─→ design: "<div...>"         │
│          │   │           └─→ meta: {wrapperStyles...}   │
│          │   │                                           │
│          │   └─→ body                                   │
│          │       │                                       │
│          │       └─→ blocks                             │
│          │           ├─→ text_block                     │
│          │           │   └─→ assetType: {196, "textblock"}│
│          │           │                                   │
│          │           └─→ button_block                   │
│          │               └─→ assetType: {195, "buttonblock"}│
│          │                                               │
│          └─→ template: {...}                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Implementation Phases

```
┌─────────────────────────────────────────────────────────┐
│                    PHASE 1: QUICK WIN                   │
│                     (1 hour)                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Enhanced Tool Descriptions         ✅               │
│  2. Validation Tool                    ✅               │
│                                                          │
│  Expected Success Rate: 50%                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│               PHASE 2: FULL SOLUTION                    │
│                    (2-3 hours)                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Resources API                      ✅               │
│  2. Pre-Flight Check Tool              ✅               │
│  3. Token Enforcement                  ✅               │
│                                                          │
│  Expected Success Rate: 95%                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 PHASE 3: OPTIMIZATION                   │
│                    (ongoing)                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Monitor Metrics                    📊               │
│  2. Adjust Descriptions                ✏️               │
│  3. Fine-tune Validation               🔧               │
│  4. Iterate Based on Usage             🔄               │
│                                                          │
│  Target: 95%+ sustained                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**All diagrams show the complete workflow from problem to solution!** 🎉
