# MASTER GUIDE: MCE Operations via MCP Server

> **READ THIS FIRST** - Complete operational guide for creating emails, journeys, and content.

---

## 🚨 CRITICAL: DEFAULT BEHAVIOR FOR LLMs

```
WHEN USER ASKS TO "CREATE AN EMAIL":
✅ ALWAYS create EDITABLE email (with slots/blocks)
✅ NEVER create simple HTML-only email
✅ USER EXPECTATION: Email is editable in Content Builder
❌ NON-EDITABLE emails will be rejected by users

DEFAULT = EDITABLE EMAIL STRUCTURE (see Quick Start below)
```

---

## 🚀 QUICK START: MINIMAL EDITABLE EMAIL

**COPY THIS STRUCTURE as starting point for ANY email request:**

```json
{
  "name": "Email Name Here",
  "assetType": {"id": 207, "name": "templatebasedemail"},
  "views": {
    "subjectline": {"content": "Subject Line Here"},
    "html": {
      "content": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n<html>\n<head>\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n</head>\n<body>\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" align=\"center\">\n<tr><td align=\"center\">\n<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" width=\"600\" class=\"container\" align=\"center\">\n<tr><td>\n<div data-type=\"slot\" data-key=\"body\"></div>\n</td></tr>\n</table>\n</td></tr>\n</table>\n</body>\n</html>",
      "slots": {
        "body": {
          "content": "<div data-type=\"block\" data-key=\"text-block-1\"></div>",
          "design": "<p style=\"font-family:Arial;color:#ccc;font-size:12px;text-align:center;vertical-align:middle;font-weight:bold;height:150px;display:flex;flex-direction:column;justify-content:center;padding:10px;margin:0;border: #cccccc dashed 1px;\">Drop blocks or content here</p>",
          "blocks": {
            "text-block-1": {
              "assetType": {"id": 196, "name": "textblock"},
              "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 20px;\" class=\"stylingblock-content-wrapper camarker-inner\"><p style=\"margin: 0;\">Your text content here</p></td></tr></table>",
              "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 20px;\" class=\"stylingblock-content-wrapper camarker-inner\"><div class=\"default-design\" style=\"min-height:100px;\"><p style=\"margin:0; padding:0;\">Your text content here</p></div></td></tr></table>",
              "meta": {
                "wrapperStyles": {
                  "mobile": {"visible": true},
                  "styling": {"padding": "20px"}
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**TO ADD MORE BLOCKS:** Add more `<div data-type="block" data-key="block-2"></div>` to slot content, then add corresponding block object.

---

## 📐 THREE-LAYER STRUCTURE (MUST UNDERSTAND)

**Email editability requires THREE connected layers:**

```
Layer 1: HTML TEMPLATE (views.html.content)
│
├─ Contains: <div data-type="slot" data-key="body"></div>
│  (This is a PLACEHOLDER that tells Content Builder where slot content goes)
│
Layer 2: SLOT OBJECT (views.html.slots.body)
│
├─ Contains: 
│  - content: "<div data-type='block' data-key='text1'></div>"
│  - design: "<p>Drop blocks here</p>"
│  - blocks: { ... }
│
Layer 3: BLOCKS OBJECT (views.html.slots.body.blocks.text1)
│
└─ Contains:
   - assetType: {id: 196, name: "textblock"}
   - content: "RENDERED HTML for email"
   - design: "PREVIEW HTML for editor"
   - meta: {wrapperStyles: {...}}
```

**KEY CONNECTIONS:**
- HTML slot marker `data-key="body"` → `slots.body`
- Slot block marker `data-key="text1"` → `slots.body.blocks.text1`

**IF ANY LAYER IS MISSING → EMAIL IS NOT EDITABLE**

---

## 🎨 CONTENT vs DESIGN (CRITICAL DISTINCTION)

```
"content" property:
  ✅ What gets RENDERED in actual email sent to subscribers
  ✅ Must be full, valid HTML with tables
  ✅ Include all styling inline
  
"design" property:
  ✅ What appears in Content Builder EDITOR as preview
  ✅ Can be simplified HTML
  ✅ Used for visual editing interface
```

**Example:**
```json
{
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 20px;\" class=\"stylingblock-content-wrapper camarker-inner\"><h1 style=\"margin:0;\">Welcome</h1><p>Hello World</p></td></tr></table>",
  "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 20px;\" class=\"stylingblock-content-wrapper camarker-inner\"><div class=\"default-design\" style=\"min-height:100px;\"><h1>Welcome</h1><p>Hello World</p></div></td></tr></table>"
}
```

**BOTH are REQUIRED for blocks**

---

## 🔴 CRITICAL RULES

```
EMAIL CREATION:
✅ ALWAYS: assetType: {id: 207, name: "templatebasedemail"}
❌ NEVER: assetType.id = 208 (non-editable HTML paste)
✅ BOTH id AND name REQUIRED
✅ Must have: HTML with slot markers → slots object → blocks object
✅ Each block MUST have: assetType (id+name), content, design, meta
✅ Slot content MUST reference blocks: <div data-type="block" data-key="X">
✅ Blocks object is {} (object), NOT [] (array)

JOURNEY CREATION:
🔗 Data Extensions MUST be linked to Contact Model
⚡ holdBackPercentage = 0 for recurring journeys
🔄 Path Optimizer needs matching capsule IDs
```

---

## 🌳 DECISION TREE: Email Creation

```
START: User requests email
│
├─ Does user want editable email? (99% of requests)
│  │
│  ├─ YES (DEFAULT ASSUMPTION)
│  │  └─> Use FULL three-layer structure
│  │      ├─ assetType: {id: 207, name: "templatebasedemail"}
│  │      ├─ HTML with <div data-type="slot"> markers
│  │      ├─ slots object with blocks
│  │      └─ Each block has: assetType, content, design, meta
│  │
│  └─ NO (user explicitly says "non-editable HTML only")
│     └─> Simple HTML structure
│        └─ But WARN user it won't be editable
│
DEFAULT PATH: Always assume editable unless explicitly told otherwise
```

---

## 📋 EMAIL: USER REQUEST → IMPLEMENTATION

### Component Mapping

| User Says | Block Type | assetType.id | assetType.name |
|-----------|------------|--------------|----------------|
| "hero image", "banner" | Image Block | 199 | imageblock |
| "intro text", "editorial" | Text Block | 196 | textblock |
| "button", "CTA" | Button Block | 195 | buttonblock |
| **"2 columns", "3 columns", "side by side", "layout"** | **Layout Block (PRIMARY)** | **213** | **layoutblock** |
| "custom HTML" | Free Form Block | 198 | freeformblock |
| "dynamic content" | Free Form + AMPscript | 198 | freeformblock |

### Layout Requests

| User Says | Primary Method | Fallback Method |
|-----------|---------------|-----------------|
| "2 columns", "3 columns", "side by side" | **layoutblock (213)** with nested slots | freeformblock (198) with hardcoded table |
| "full width image" | imageblock, padding: "0px" | N/A |

**CRITICAL: Multi-Column Layout Decision Rules**

```
WHEN USER REQUESTS MULTI-COLUMN LAYOUT:

PRIMARY (ALWAYS TRY FIRST): layoutblock (assetType 213)
  ✅ Creates true editable columns
  ✅ Each column is an independent slot
  ✅ Users can drag/drop blocks into each column
  ✅ Each column has its own blocks object
  ✅ Best for: 2-column, 3-column standard layouts

FALLBACK (ONLY IF NEEDED): freeformblock (assetType 198)
  ✅ Valid alternative when layoutblock too complex
  ✅ Uses hardcoded HTML table for columns
  ⚠️  Column content is NOT independently editable
  ✅ Email overall is still editable
  ✅ Use for: Highly custom/complex table layouts
```

---

## 🗂️ EMAIL STRUCTURE (REFERENCE)

```
Email
├── assetType: {id: 207, name: "templatebasedemail"}
├── name: "Email Name"
├── category: {id: CATEGORY_ID}
└── views
    ├── subjectline: {content: "Subject"}
    ├── preheader: {content: "Preheader"}
    └── html
        ├── content: "<html>...<div data-type='slot' data-key='SLOT_KEY'></div>...</html>"
        ├── slots
        │   └── SLOT_KEY
        │       ├── content: "<div data-type='block' data-key='BLOCK_KEY'></div>"
        │       ├── design: "<p>Drop blocks here</p>"
        │       └── blocks
        │           └── BLOCK_KEY
        │               ├── assetType: {id: X, name: "..."}
        │               ├── content: "RENDERED_HTML"
        │               ├── design: "PREVIEW_HTML"
        │               └── meta: {wrapperStyles: {...}}
        └── template: {id: 0, assetType: {id: 214, name: "defaulttemplate"}}
```

---

## 🔧 COMPLETE EMAIL EXAMPLE

```json
{
  "name": "Welcome Email",
  "assetType": {"id": 207, "name": "templatebasedemail"},
  "category": {"id": 2073800},
  "views": {
    "subjectline": {"content": "Welcome %%firstname%%!"},
    "preheader": {"content": "Start your journey"},
    "html": {
      "content": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n<html>\n<head>\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n</head>\n<body bgcolor=\"#ffffff\">\n<div style=\"font-size:0; line-height:0;\"><custom name=\"opencounter\" type=\"tracking\"><custom name=\"usermatch\" type=\"tracking\" /></div>\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n<tr><td align=\"center\">\n<table width=\"600\" class=\"container\">\n<tr><td><div data-type=\"slot\" data-key=\"header_slot\"></div></td></tr>\n<tr><td><div data-type=\"slot\" data-key=\"body_slot\"></div></td></tr>\n</table>\n</td></tr>\n</table>\n<custom type=\"footer\" />\n</body>\n</html>",
      "slots": {
        "header_slot": {
          "content": "<div data-type=\"block\" data-key=\"hero\"></div>",
          "design": "<p style=\"font-family:Arial;color:#ccc;font-size:12px;text-align:center;vertical-align:middle;font-weight:bold;height:150px;display:flex;flex-direction:column;justify-content:center;padding:10px;margin:0;border: #cccccc dashed 1px;\">Drop blocks or content here</p>",
          "blocks": {
            "hero": {
              "assetType": {"id": 199, "name": "imageblock"},
              "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\"><tr><td align=\"center\"><img src=\"https://via.placeholder.com/600x200\" alt=\"Hero\" style=\"display: block; width: 100%; max-width: 600px;\"></td></tr></table>",
              "design": "<div style=\"width:100%; height:200px; background:#f0f0f0; text-align:center; line-height:200px;\">Hero Image</div>",
              "meta": {"wrapperStyles": {"styling": {"padding": "0px"}}}
            }
          }
        },
        "body_slot": {
          "content": "<div data-type=\"block\" data-key=\"text\"></div><div data-type=\"block\" data-key=\"button\"></div>",
          "design": "<p style=\"font-family:Arial;color:#ccc;font-size:12px;text-align:center;vertical-align:middle;font-weight:bold;height:150px;display:flex;flex-direction:column;justify-content:center;padding:10px;margin:0;border: #cccccc dashed 1px;\">Drop blocks or content here</p>",
          "blocks": {
            "text": {
              "assetType": {"id": 196, "name": "textblock"},
              "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\"><tr><td style=\"padding: 20px;\"><h1>Welcome %%firstname%%!</h1><p>Your content here.</p></td></tr></table>",
              "design": "<div style=\"padding: 20px; min-height:100px;\">Text preview</div>",
              "meta": {"wrapperStyles": {"styling": {"padding": "20px"}}}
            },
            "button": {
              "assetType": {"id": 195, "name": "buttonblock"},
              "content": "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"><tr><td align=\"center\" style=\"padding: 20px;\"><table cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"background-color: #0176d3; border-radius: 4px;\"><a href=\"https://example.com\" style=\"display: inline-block; padding: 12px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;\">Get Started</a></td></tr></table></td></tr></table>",
              "design": "<div style=\"text-align:center; padding:20px;\"><span style=\"background-color: #0176d3; color: #ffffff; padding: 12px 30px; display: inline-block; border-radius: 4px;\">Button</span></div>",
              "meta": {"wrapperStyles": {"styling": {"padding": "20px"}}}
            }
          }
        }
      },
      "template": {
        "id": 0,
        "assetType": {"id": 214, "name": "defaulttemplate"},
        "name": "CONTENTTEMPLATES_C",
        "slots": {
          "header_slot": {"locked": false},
          "body_slot": {"locked": false}
        }
      }
    }
  }
}
```

---

## 📦 BLOCK TEMPLATES

### Text Block (Most Common)
```json
{
  "assetType": {"id": 196, "name": "textblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 20px;\" class=\"stylingblock-content-wrapper camarker-inner\"><h1>Headline</h1><p>Body text %%personalization%%</p></td></tr></table>",
  "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 20px;\" class=\"stylingblock-content-wrapper camarker-inner\"><div class=\"default-design\" style=\"min-height:100px;\"><h1>Headline</h1><p>Body text</p></div></td></tr></table>",
  "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {"padding": "20px"}}}
}
```

### Hero Image
```json
{
  "assetType": {"id": 199, "name": "imageblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\"><tr><td align=\"center\"><img src=\"[IMAGE_URL]\" alt=\"[ALT]\" style=\"display: block; width: 100%; max-width: 600px;\"></td></tr></table>",
  "design": "<div style=\"width:100%; height:200px; background:#f0f0f0; text-align:center; line-height:200px;\">Image</div>",
  "meta": {"wrapperStyles": {"styling": {"padding": "0px"}}}
}
```

### Button Block
```json
{
  "assetType": {"id": 195, "name": "buttonblock"},
  "content": "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"><tr><td align=\"center\" style=\"padding: 20px;\"><table cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"background-color: #0176d3; border-radius: 4px;\"><a href=\"[URL]\" style=\"display: inline-block; padding: 12px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;\">[TEXT]</a></td></tr></table></td></tr></table>",
  "design": "<div style=\"text-align:center; padding:20px;\"><span style=\"background-color: #0176d3; color: #ffffff; padding: 12px 30px; display: inline-block; border-radius: 4px;\">Button</span></div>",
  "meta": {"wrapperStyles": {"styling": {"padding": "20px"}}}
}
```

### Layout Block (2-Column) - **PRIMARY FOR MULTI-COLUMN LAYOUTS**
```json
{
  "assetType": {"id": 213, "name": "layoutblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%; \" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 10px; \" class=\"stylingblock-content-wrapper camarker-inner\"><table cellspacing=\"0\" cellpadding=\"0\" role=\"presentation\" style=\"width: 100%;\"><tr><td><table cellspacing=\"0\" cellpadding=\"0\" role=\"presentation\" style=\"width: 100%;\"><tr><td valign=\"top\" class=\"responsive-td\" style=\"width: 50%; padding-right: 3px;\"><div data-type=\"slot\" data-key=\"left-col\"></div></td><td valign=\"top\" class=\"responsive-td\" style=\"width: 50%; padding-left: 3px;\"><div data-type=\"slot\" data-key=\"right-col\"></div></td></tr></table></td></tr></table></td></tr></table>",
  "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%; \" class=\"stylingblock-content-wrapper\"><tr><td style=\"padding: 10px; \" class=\"stylingblock-content-wrapper camarker-inner\"></td></tr></table>",
  "meta": {
    "options": {
      "layout": {
        "key": "two_column",
        "spacing": 6,
        "css": {"padding": 10},
        "layoutClass": "contentlayouts-empty",
        "rows": [
          {
            "columns": [
              {"width": 50, "slot": "left-col"},
              {"width": 50, "slot": "right-col"}
            ]
          }
        ]
      }
    },
    "wrapperStyles": {
      "mobile": {"visible": true},
      "styling": {"padding": "10px"}
    }
  },
  "slots": {
    "left-col": {
      "content": "<div data-type=\"block\" data-key=\"left-text\"></div>",
      "design": "<p style=\"font-family: arial; color: #CCCCCC; font-size: 12px; font-weight: bold; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 150px; padding: 10px; margin: 0; border: 1px dashed #CCCCCC;\">Drop blocks or content here</p>",
      "blocks": {
        "left-text": {
          "assetType": {"id": 196, "name": "textblock"},
          "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%; \" class=\"stylingblock-content-wrapper\"><tr><td class=\"stylingblock-content-wrapper camarker-inner\"><p>Left column content</p></td></tr></table>",
          "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%; \" class=\"stylingblock-content-wrapper\"><tr><td class=\"stylingblock-content-wrapper camarker-inner\"><div class=\"default-design\" style=\"height:150px; overflow:hidden;\"><p class=\"textblock\" style=\"margin:0; padding:0; overflow:hidden; display:block;\">Left column content</p></div></td></tr></table>",
          "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {}}}
        }
      }
    },
    "right-col": {
      "content": "<div data-type=\"block\" data-key=\"right-img\"></div>",
      "design": "<p style=\"font-family: arial; color: #CCCCCC; font-size: 12px; font-weight: bold; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 150px; padding: 10px; margin: 0; border: 1px dashed #CCCCCC;\">Drop blocks or content here</p>",
      "blocks": {
        "right-img": {
          "assetType": {"id": 199, "name": "imageblock"},
          "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%; \" class=\"stylingblock-content-wrapper\"><tr><td class=\"stylingblock-content-wrapper camarker-inner\"><table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" role=\"presentation\"><tr><td align=\"center\"><img src=\"[IMAGE_URL]\" alt=\"\" style=\"display: block; padding: 0px; text-align: center; border: 0px solid transparent; height: auto; width: 100%;\"></td></tr></table></td></tr></table>",
          "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%; \" class=\"stylingblock-content-wrapper\"><tr><td class=\"stylingblock-content-wrapper camarker-inner\"><div class=\"default-design\"><div style=\"width:100%;height:150px;background: url(data:image/png;base64,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) repeat-x 0 0\"></div></div></td></tr></table>",
          "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {}}}
        }
      }
    }
  }
}
```

**CRITICAL LAYOUTBLOCK DETAILS (From Training Email):**
- **Content string has trailing space after `100%;`** - Use `style="min-width: 100%; "` not `style="min-width: 100%;"`
- **Nested blocks MUST have empty styling object** - `"styling": {}` not `"styling": {"padding": "20px"}`
- **Textblock design MUST include overflow styles** - `style="height:150px; overflow:hidden;"` and `<p class="textblock" style="margin:0; padding:0; overflow:hidden; display:block;">`
- **Imageblock design MUST include background data URL** - See full base64 background in template above
- **Image tag MUST include all attributes** - `style="display: block; padding: 0px; text-align: center; border: 0px solid transparent; height: auto; width: 100%;"`
- **Nested slot design string MUST match exactly** - `"Drop blocks or content here"` not `"Drop blocks here"`
- **Layoutblock outer wrapper has padding with trailing space** - `style="padding: 10px; "` not `style="padding: 10px;"`

**LAYOUTBLOCK KEY FEATURES:**
- Contains **nested slots** - each column is its own slot
- Each nested slot has its own **blocks object**
- Users can independently drag/drop into each column
- Supports responsive column widths via `meta.options.layout.rows[].columns[].width`
- Column spacing via `meta.options.layout.spacing`
- **Always use layoutblock for standard multi-column requests**

### Free Form Block
```json
{
  "assetType": {"id": 198, "name": "freeformblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\"><tr><td style=\"padding: 10px;\">Custom HTML with <a href=\"#\" style=\"color:#0176d3;\">links</a></td></tr></table>",
  "design": "<div style=\"padding: 10px; border:1px dashed #ccc;\">Free form</div>",
  "meta": {"wrapperStyles": {"styling": {"padding": "10px"}}}
}
```

### Two-Column Layout (FREEFORM FALLBACK - Use only when layoutblock not suitable)
```json
{
  "assetType": {"id": 198, "name": "freeformblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\"><tr><td width=\"50%\" valign=\"top\" style=\"padding:10px;\"><h3>Product 1</h3><p>Description</p></td><td width=\"50%\" valign=\"top\" style=\"padding:10px;\"><h3>Product 2</h3><p>Description</p></td></tr></table>",
  "design": "<div style=\"padding: 10px;\">Two columns</div>",
  "meta": {"wrapperStyles": {"styling": {"padding": "10px"}}}
}
```

### Dynamic Content (AMPscript)
```json
{
  "assetType": {"id": 198, "name": "freeformblock"},
  "content": "%%[ IF [Gender] == \"M\" THEN ]%%<h2>Welcome Sir</h2>%%[ ELSE ]%%<h2>Welcome</h2>%%[ ENDIF ]%%",
  "design": "<div style=\"padding:20px; border:2px solid #00a1e0; background:#f0f8ff;\">Dynamic Content</div>",
  "meta": {"wrapperStyles": {"styling": {"padding": "10px"}}}
}
```

---

## 🔄 JOURNEY STRUCTURE

### Basic Journey
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
    "eventDefinitionKey": "[EVENT_KEY]"
  }],
  "activities": [
    {
      "key": "EMAIL-1",
      "type": "EMAILV2",
      "name": "Send Welcome",
      "outcomes": [{"key": "sent", "next": "WAIT-1"}],
      "configurationArguments": {
        "emailSubject": "Welcome!",
        "isTrackingClicks": true
      }
    },
    {
      "key": "WAIT-1",
      "type": "WAIT",
      "name": "Wait 3 Days",
      "outcomes": [{"key": "done", "next": "END"}],
      "configurationArguments": {
        "waitDuration": 3,
        "waitUnit": "DAYS"
      }
    }
  ]
}
```

### Activity Types
```
EMAILV2              = Send email
WAIT                 = Time delay
ENGAGEMENTDECISION   = Email engagement check
MULTICRITERIADECISION = Decision split with filters
ABNTEST              = Path Optimizer start
ABNTESTSTOP          = Path Optimizer end
STOWAIT              = Einstein STO
RANDOMSPLIT          = Random split
```

### Engagement Decision
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

**statsTypeId Values:**
```
1 = Opened
2 = Not Opened
3 = Clicked
4 = Not Clicked
5 = Bounced
6 = Not Bounced
```

### Multi-Criteria Decision
```json
{
  "key": "DECISION-1",
  "type": "MULTICRITERIADECISION",
  "name": "Check Criteria",
  "outcomes": [
    {"key": "path1", "next": "EMAIL-2", "metaData": {"label": "High Value"}},
    {"key": "path2", "next": "EMAIL-3", "metaData": {"label": "Low Value"}}
  ],
  "configurationArguments": {
    "criteria": {
      "path1": "<FilterDefinition><ConditionSet Operator=\"AND\"><Condition Key=\"OrderValue\" Operator=\"GreaterThan\"><Value><![CDATA[100]]></Value></Condition></ConditionSet></FilterDefinition>",
      "path2": "<FilterDefinition><ConditionSet Operator=\"AND\"><Condition Key=\"OrderValue\" Operator=\"LessThanOrEqual\"><Value><![CDATA[100]]></Value></Condition></ConditionSet></FilterDefinition>"
    }
  }
}
```

### Path Optimizer
```json
{
  "key": "ABNTEST-1",
  "type": "ABNTEST",
  "name": "Path Optimizer",
  "metaData": {"capsule": {"id": "CAPSULE-1", "startId": "ABNTEST-1", "endId": "ABNTESTSTOP-1"}},
  "outcomes": [
    {"key": "path1", "next": "EMAIL-A", "arguments": {"percentage": 50}},
    {"key": "path2", "next": "EMAIL-B", "arguments": {"percentage": 50}}
  ],
  "configurationArguments": {
    "holdBackPercentage": 0,
    "winnerEvaluationType": "Engagement",
    "engagementPeriod": 3,
    "engagementPeriodUnits": "Days"
  }
}
```

---

## 🚀 API CALLS

### Email Creation
```
POST /asset/v1/content/assets
Headers: 
  Authorization: Bearer [TOKEN]
  Content-Type: application/json
Body: [Complete email JSON]
```

### Journey Creation
```
POST /interaction/v1/interactions
Headers:
  Authorization: Bearer [TOKEN]
  Content-Type: application/json
Body: [Journey JSON]
```

### Journey Publish
```
POST /interaction/v1/interactions/publishAsync/{id}
```

---

## ✅ VALIDATION CHECKLIST

### Email Pre-Submit Validation

**BEFORE creating email, verify ALL of these:**

- [ ] `assetType.id` === `207` (NOT 208)
- [ ] `assetType.name` === `"templatebasedemail"`
- [ ] `views.html.content` contains `<div data-type="slot" data-key="X">`
- [ ] `views.html.slots` object exists
- [ ] Each slot has `content`, `design`, and `blocks` properties
- [ ] `blocks` is an OBJECT `{}`, not an array `[]`
- [ ] Each block has ALL FOUR properties:
  - [ ] `assetType` with both `id` and `name`
  - [ ] `content` (rendered HTML)
  - [ ] `design` (editor preview HTML)
  - [ ] `meta` (with wrapperStyles)
- [ ] Slot's `content` references blocks: `<div data-type="block" data-key="Y">`
- [ ] Block key in slot content matches key in blocks object
- [ ] HTML has `<custom>` tracking tags (if full template)
- [ ] **For layoutblock (213):** Nested slots exist in `block.slots` with their own blocks objects

**Journey Pre-Submit Validation:**

- [ ] Has `triggers` array
- [ ] Has `activities` array
- [ ] All `outcomes[].next` point to valid activity keys or "END"
- [ ] `holdBackPercentage` = 0 for recurring journeys
- [ ] Data Extensions are linked to Contact Model
- [ ] Path Optimizer has matching capsule IDs in start/end activities

---

## ⚠️ COMMON ERRORS & FIXES

### Error: Email Not Editable / Locked

**Symptoms:**
- Email appears in Content Builder but is locked
- Cannot click to edit text or blocks
- Shows as "HTML Paste Email" type

**Causes:**
1. Used `assetType.id = 208` instead of 207
2. Missing `slots` or `blocks` structure
3. HTML template missing `<div data-type="slot">` markers
4. Blocks missing required properties (`content`, `design`, `meta`)

**Fix:**
- ALWAYS use `assetType: {id: 207, name: "templatebasedemail"}`
- Include complete three-layer structure
- Verify ALL validation checklist items above

### Error: "Cannot deserialize the current JSON array"

**Full Error Message:**
```
Cannot deserialize the current JSON array (e.g. [1,2,3]) into type 'ExactTarget.Entities.ContentManagement.AssetV2'
```

**Cause:**
- Used array `[]` instead of object `{}` for slots or blocks
- Common mistake: `"blocks": [...]` instead of `"blocks": {...}`

**Fix:**
```json
// ❌ WRONG
"blocks": [
  {"assetType": {...}}
]

// ✅ CORRECT
"blocks": {
  "block-key-1": {"assetType": {...}}
}
```

### Error 118077: "Asset type name is required"

**Cause:**
- Only provided `assetType.id` without `assetType.name`

**Fix:**
```json
// ❌ WRONG
"assetType": {"id": 207}

// ✅ CORRECT
"assetType": {"id": 207, "name": "templatebasedemail"}
```

### Error 118039: "Asset names must be unique"

**Cause:**
- Email with same name already exists in category

**Fix:**
- Append timestamp or version number to name
- Check existing emails first with GET request

### Journey: Filter Condition Fails

**Symptoms:**
- Journey validation error on filter conditions
- "Data Extension not found" or filter errors

**Cause:**
- Data Extension not linked to Contact Model

**Fix:**
- In MCE UI: Contact Builder → Data Extensions → Link to Contact Model
- Ensure DE has relationship defined before using in journey

### Journey: Path Optimizer Error

**Cause:**
- Mismatched capsule IDs between ABNTEST and ABNTESTSTOP
- Missing endId or startId in capsule metadata

**Fix:**
```json
// Ensure matching IDs
"metaData": {
  "capsule": {
    "id": "CAPSULE-1",
    "startId": "ABNTEST-1",
    "endId": "ABNTESTSTOP-1"
  }
}
```

---

## 🎯 WORKFLOW FOR LLMs

```
1. UNDERSTAND USER REQUEST
   ├─ Parse intent: create email, journey, or modify content
   ├─ Identify components needed: text, image, button, layout, etc.
   └─ Default assumption: user wants EDITABLE content
   
2. CHOOSE STRUCTURE
   ├─ For email: Use Quick Start template as base
   ├─ For journey: Use Basic Journey template
   ├─ For multi-column: PRIMARY = layoutblock (213), FALLBACK = freeformblock (198)
   └─ Map user requirements to block types (see Component Mapping)
   
3. BUILD JSON
   ├─ Start with template structure
   ├─ For layoutblock: Create nested slots with blocks for each column
   ├─ For freeformblock fallback: Use hardcoded table HTML
   ├─ Replace placeholder content with user's requirements
   └─ Ensure all three layers are connected
   
4. VALIDATE (CRITICAL STEP)
   ├─ Run through validation checklist
   ├─ Check assetType is correct (207 for email, 213 for layoutblock)
   ├─ Verify blocks is object, not array
   ├─ Confirm all block properties present
   ├─ For layoutblock: Verify nested slot structure
   └─ Validate slot/block key connections
   
5. CALL API
   ├─ Use mce_v1_rest_request tool
   ├─ Include clearance_token for email creation
   └─ POST to appropriate endpoint
   
6. VERIFY RESPONSE
   ├─ Check for error codes
   ├─ If error, consult Common Errors section
   └─ Return success confirmation to user
```

---

## 🧠 LLM DECISION PATTERNS

### Pattern 1: Simple Email Request
```
User says: "Create an email saying Hello World"

LLM thinks:
1. User wants email (not journey) ✓
2. Needs to be editable (default) ✓
3. Simple text content = textblock ✓
4. Use Quick Start template ✓
5. Replace placeholder text with "Hello World" ✓

Action: Copy Quick Start → Modify text → Validate → Create
```

### Pattern 2: Email with Multiple Components
```
User says: "Create welcome email with hero image, intro text, and signup button"

LLM thinks:
1. Needs 3 blocks: imageblock + textblock + buttonblock ✓
2. Could use 1 slot with 3 blocks OR 2 slots ✓
3. Decision: 1 body slot with 3 blocks (simpler) ✓

Action: 
- Create slot.body
- Add 3 blocks with unique keys
- Set content for each block
- Link blocks in slot content
```

### Pattern 3: Multi-Column Layout Request
```
User says: "Create email with 2 columns - text on left, image on right"

LLM thinks:
1. Multi-column request detected ✓
2. PRIMARY: Use layoutblock (213) ✓
3. Create layoutblock with 2 nested slots ✓
4. Left slot: Add textblock
5. Right slot: Add imageblock

Action:
- Create layoutblock with meta.options.layout defining 2 columns (50% each)
- Create left-col and right-col nested slots
- Add textblock to left-col.blocks
- Add imageblock to right-col.blocks
- Connect all layers: layoutblock.slots.left-col.blocks.text-key
- Each column is independently editable
```

### Pattern 4: Request Lacks Detail
```
User says: "Make an email"

LLM thinks:
1. User wants editable email (default) ✓
2. No specific content → use minimal template ✓
3. Ask user for details OR create simple placeholder ✓

Action: Create minimal editable email with placeholder text
```

---

## 📚 QUICK REFERENCE: Block Type Selection

```
User mentions...                    → Use block type...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"heading", "paragraph"              → textblock (196)
"image", "photo", "logo"            → imageblock (199)
"button", "CTA", "link"             → buttonblock (195)
"2 columns", "3 columns", "layout"  → layoutblock (213) PRIMARY
"custom code", "HTML"               → freeformblock (198)
"dynamic", "AMPscript"              → freeformblock (198)
```

**FALLBACK RULE:**
When layoutblock (213) not suitable for complex layouts → freeformblock (198) with table HTML is valid

---

## 🔄 ITERATION GUIDANCE

**If first email creation fails:**

1. Check error code in response
2. Look up error in "Common Errors" section
3. Identify which layer is broken (HTML/slots/blocks)
4. Fix that specific layer
5. Re-validate before retrying

**Common iteration needs:**
- Adding more blocks → Add to slot.content AND slot.blocks
- Changing layout → Modify HTML and slot structure
- Adding personalization → Use %%fieldname%% in content

---

**END OF GUIDE - Use this for ALL MCE operations. Follow structures exactly.**