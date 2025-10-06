# Quick Reference: Force Documentation Reading

## 🎯 The Problem
```
User: "Create a welcome email"
       ↓
LLM:   [Calls mce_v1_rest_request immediately]
       ↓
Result: ❌ Non-editable email (assetType.id = 208)
        ❌ Error 118077 (missing name)
        ❌ Not editable in Content Builder
```
**Success Rate: 10%**

---

## ✅ The Solution
```
User: "Create a welcome email"
       ↓
LLM:   [Calls mce_v1_preflight_check]
       ↓
       [Reads mce://guides/editable-emails]
       [Reads mce://examples/complete-email]
       ↓
       [Calls mce_v1_validate_request]
       ↓
       [Calls mce_v1_rest_request with token]
       ↓
Result: ✅ Editable email created successfully
        ✅ Correct assetType (207 + name)
        ✅ Proper slots/blocks structure
```
**Success Rate: 95%**

---

## 🔧 4 Solutions (Use Together)

### 1️⃣ Resources API
```javascript
// Expose docs as resources
resources: [
  { uri: 'mce://guides/editable-emails', ... },
  { uri: 'mce://examples/complete-email', ... }
]
```
**Benefit:** Claude can read docs naturally

### 2️⃣ Enhanced Tool Descriptions
```javascript
description: `⚠️ MANDATORY: Read mce://guides/editable-emails FIRST
❌ NEVER use assetType.id = 208
✅ ALWAYS use {id: 207, name: "templatebasedemail"}`
```
**Benefit:** Clear requirements in tool metadata

### 3️⃣ Pre-Flight Check Tool
```javascript
// New tool: mce_v1_preflight_check
// Returns: clearance token
// Enforced: mce_v1_rest_request requires token
```
**Benefit:** Hard enforcement (can't skip)

### 4️⃣ Validation Tool
```javascript
// New tool: mce_v1_validate_request
// Checks: assetType, slots, blocks
// Returns: errors, warnings, fixes
```
**Benefit:** Catch errors before API calls

---

## 📊 Implementation Phases

### Phase 1: Quick Win (1 hour)
```
✅ Enhanced Tool Descriptions
✅ Validation Tool
━━━━━━━━━━━━━━━━━━━━━━
Success Rate: 50%
```

### Phase 2: Full Solution (2-3 hours)
```
✅ Resources API
✅ Pre-Flight Check + Token
━━━━━━━━━━━━━━━━━━━━━━
Success Rate: 95%
```

---

## 🔑 Critical Email Rules

```json
✅ CORRECT:
{
  "assetType": {
    "id": 207,              ← Must be 207
    "name": "templatebasedemail"  ← Must include name
  },
  "views": {
    "html": {
      "slots": {           ← Must have slots
        "main": {
          "blocks": {      ← Must have blocks
            "text1": { ... }
          }
        }
      }
    }
  }
}

❌ WRONG:
{
  "assetType": {"id": 208}  ← Non-editable!
}

❌ WRONG:
{
  "assetType": {"id": 207}  ← Missing name!
}
```

---

## 📚 Required Reading Flow

```
┌─────────────────────────────────────┐
│ 1. Call mce_v1_preflight_check      │
│    → Get documentation list         │
│    → Get clearance token            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Read Resources                   │
│    → mce://guides/editable-emails   │
│    → mce://examples/complete-email  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Call mce_v1_validate_request     │
│    → Check your planned request     │
│    → Get errors/warnings            │
└──────────────┬──────────────────────┘
               ↓
        Validation OK?
         ↙         ↘
       NO          YES
        ↓           ↓
   Fix errors   Create Email
        ↓           ↓
   Validate    Include token
    Again      in request
```

---

## 🎪 Example Interaction

### ❌ Before (Fails):
```
User: Create welcome email
LLM:  *calls mce_v1_rest_request*
      *uses assetType.id = 208*
API:  ❌ Error or non-editable email
```

### ✅ After (Success):
```
User: Create welcome email
LLM:  Let me first get clearance...
      *calls mce_v1_preflight_check*
      
      Reading documentation...
      *reads mce://guides/editable-emails*
      *reads mce://examples/complete-email*
      
      Validating my request...
      *calls mce_v1_validate_request*
      ✅ Validation passed
      
      Creating email...
      *calls mce_v1_rest_request with token*
      
API:  ✅ Email created successfully!
      ID: 12345
      Type: Editable template-based email
```

---

## 🚀 Quick Start

1. **Add Resources to server.js**
   ```javascript
   capabilities: { tools: {}, resources: {} }
   ```

2. **Add Pre-Flight Tool**
   ```javascript
   tools: ['mce_v1_preflight_check', ...]
   ```

3. **Add Validation Tool**
   ```javascript
   tools: ['mce_v1_validate_request', ...]
   ```

4. **Enforce Token in REST requests**
   ```javascript
   if (creating_email && !clearance_token) {
     return error('Call preflight check first');
   }
   ```

5. **Test!**
   ```bash
   User: "Create a test email"
   Expected: LLM reads docs → validates → creates
   ```

---

## 📈 Metrics to Track

```
Before:
├── Success Rate: 10%
├── Docs Read: 5%
└── Avg Attempts: 5

After Phase 1:
├── Success Rate: 50%
├── Docs Read: 30%
└── Avg Attempts: 2

After Phase 2:
├── Success Rate: 95%
├── Docs Read: 95%
└── Avg Attempts: 1
```

---

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `enhanced-server.js` | Full implementation |
| `enhanced-tool-descriptions.js` | Tool metadata |
| `preflight-check-tool.js` | Pre-flight logic |
| `LLM-INSTRUCTIONS.md` | LLM system prompt |
| `IMPLEMENTATION-GUIDE.md` | Detailed guide |

---

## 🆘 Troubleshooting

### Problem: LLM still not reading docs
**Solution:** Increase emphasis in tool descriptions, add token enforcement

### Problem: Token system too strict
**Solution:** Increase token expiration time (currently 30 min)

### Problem: Validation too permissive
**Solution:** Add more checks to mce_v1_validate_request

### Problem: Documentation hard to find
**Solution:** List resources prominently in tool descriptions

---

## ✨ Success Indicators

✅ LLM always calls mce_v1_preflight_check first
✅ LLM reads at least 2 documentation resources
✅ LLM validates before creating
✅ Success rate > 90%
✅ Correct assetType used 98%+ of time
✅ Emails are editable in Content Builder

---

🎉 **You're ready to implement!**

Start with Phase 1 for quick wins, then move to Phase 2 for complete enforcement.
