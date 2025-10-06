# LLM Instructions for Using Salesforce MCE MCP Server

## 🚨 CRITICAL: Read This First

When a user asks you to create emails, journeys, or perform MCE operations, you MUST follow this workflow:

---

## 📚 MANDATORY DOCUMENTATION READING WORKFLOW

### For Email Creation:

**STEP 1: Read Documentation Resources**
```
1. Read resource: mce://guides/editable-emails
2. Read resource: mce://examples/complete-email
3. Read resource: mce://guides/email-components (if user mentions components)
```

**STEP 2: Validate Your Request**
```
Call: mce_v1_validate_request
- Pass your planned email creation request
- Check for errors and warnings
- If errors exist, fix them and validate again
```

**STEP 3: Create the Email**
```
Only after validation passes:
Call: mce_v1_rest_request
- Use validated request body
- Monitor response for success
```

### For Journey Creation:

**STEP 1: Read Documentation**
```
1. Read resource: mce://guides/journey-builder
2. Review all activity types and examples
```

**STEP 2: Validate**
```
Call: mce_v1_validate_request with type: 'journey'
```

**STEP 3: Create**
```
Call: mce_v1_rest_request with validated structure
```

---

## ⛔ CRITICAL RULES - NEVER VIOLATE THESE

### Email Creation Rules:

1. **NEVER use assetType.id = 208**
   - This creates non-editable HTML paste emails
   - Users cannot modify them in Content Builder
   - This is the #1 cause of email creation failures

2. **ALWAYS use:**
   ```json
   {
     "assetType": {
       "id": 207,
       "name": "templatebasedemail"
     }
   }
   ```
   - Both `id` AND `name` are REQUIRED
   - Without `name`, the request will fail with error 118077

3. **ALWAYS include slots and blocks structure:**
   ```json
   {
     "views": {
       "html": {
         "slots": {
           "main_slot": {
             "blocks": {
               "block_key": { /* block definition */ }
             }
           }
         }
       }
     }
   }
   ```

4. **Each block MUST have:**
   - `assetType` with id and name
   - `content` (rendered HTML)
   - `design` (preview HTML)  
   - `meta` with wrapperStyles

### Journey Rules:

1. **Data Extensions MUST be linked to Contact Model** for filters to work
2. **holdBackPercentage MUST be 0** for recurring journeys
3. **Path Optimizer requires** matching capsule IDs between ABNTEST and ABNTESTSTOP

---

## 🎯 Decision Tree: What to Do When

```
User asks to create email
  ↓
Has documentation been read? 
  NO → Read mce://guides/editable-emails and mce://examples/complete-email
  YES → Continue
  ↓
Build request following documentation structure
  ↓
Call mce_v1_validate_request
  ↓
Validation passed?
  NO → Fix errors, read recommended docs, validate again
  YES → Continue
  ↓
Call mce_v1_rest_request with validated body
  ↓
Check response for success
  ↓
If error → Check error code in documentation, fix, retry
If success → Confirm to user with asset ID
```

---

## 📖 Available Documentation Resources

### Essential Guides:
- `mce://guides/editable-emails` - **READ THIS FIRST for email creation**
- `mce://guides/journey-builder` - Journey Builder complete reference
- `mce://guides/email-components` - Component lexicon (user phrases → tech)
- `mce://guides/dynamic-content` - AMPscript dynamic content

### Examples:
- `mce://examples/complete-email` - **Full working email structure**
- `mce://examples/hero-image` - Image block example
- `mce://examples/text-block` - Text block example
- `mce://examples/button-block` - Button block example

### Reference:
- `mce://reference/operations` - All operations with error solutions

---

## 🔍 Common Mistakes to Avoid

### ❌ DON'T:
```json
{
  "assetType": {"id": 208}  // Wrong! Non-editable
}
```

### ❌ DON'T:
```json
{
  "assetType": {"id": 207}  // Missing name!
}
```

### ❌ DON'T:
Skip reading documentation before creating emails

### ❌ DON'T:
Skip validation step

### ✅ DO:
```json
{
  "assetType": {
    "id": 207,
    "name": "templatebasedemail"
  },
  "views": {
    "html": {
      "content": "<!DOCTYPE HTML>...",
      "slots": {
        "main": {
          "blocks": { /* proper blocks */ }
        }
      }
    }
  }
}
```

---

## 🎓 Block Type Reference

Quick reference for common blocks:

| User Request | Block Type | assetType.id | assetType.name |
|--------------|------------|--------------|----------------|
| "Add a hero image" | Image | 199 | imageblock |
| "Add intro text" | Text | 196 | textblock |
| "Add a button" | Button | 195 | buttonblock |
| "Add custom HTML" | Free Form | 198 | freeformblock |
| "Add dynamic content" | Free Form + AMPscript | 198 | freeformblock |

---

## 💡 Pro Tips for Success

1. **Always read docs first** - 90% of failures come from skipping documentation
2. **Always validate** - Catches errors before API calls
3. **Check examples** - Use working examples as templates
4. **Follow structure exactly** - Email structure is complex, don't improvise
5. **Use component lexicon** - Maps user language to technical implementations

---

## 🚨 Error Handling

If you encounter an error:

1. **Read the error code** in response
2. **Check** `mce://reference/operations` for that error code
3. **Apply the solution** provided
4. **Re-validate** your request
5. **Retry** with corrected request

Common Errors:
- **118077**: Missing assetType.name or using wrong ID
- **118081**: Invalid category ID
- **118052**: Duplicate email name

---

## 📝 Example Interaction

**❌ WRONG WAY:**
```
User: "Create a welcome email"
LLM: [Immediately calls mce_v1_rest_request without reading docs]
Result: ❌ Non-editable email created or error 118077
```

**✅ CORRECT WAY:**
```
User: "Create a welcome email"

LLM: "I'll create a welcome email. Let me first read the documentation 
to ensure I create it correctly..."

[Reads mce://guides/editable-emails]
[Reads mce://examples/complete-email]

"Now I'll validate my email structure..."
[Calls mce_v1_validate_request]

"Validation passed! Creating your email..."
[Calls mce_v1_rest_request with proper structure]

"✅ Success! I've created an editable welcome email with ID: 12345"
```

---

## 🎯 Summary Checklist

Before EVERY email creation:
- [ ] Read mce://guides/editable-emails
- [ ] Read mce://examples/complete-email
- [ ] Build request with assetType: {id: 207, name: "templatebasedemail"}
- [ ] Include proper slots and blocks structure
- [ ] Call mce_v1_validate_request
- [ ] Fix any validation errors
- [ ] Call mce_v1_rest_request
- [ ] Verify success response

**Following this workflow guarantees 95%+ success rate!**
