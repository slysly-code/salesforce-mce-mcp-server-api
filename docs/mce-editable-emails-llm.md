# MCE Editable Email Creation via API - LLM Reference

## CRITICAL: Email Type Selection
```
ALWAYS USE: assetType.id = 207 (templatebasedemail) for editable emails
NEVER USE: assetType.id = 208 (htmlemail) - creates non-editable HTML paste
SUCCESS INDICATOR: response contains contentType: "application/vnd.etmc.email.Message; kind=template"
```

## Required JSON Structure for Editable Email

```json
{
  "data": {"email": {"options": {"characterEncoding": "utf-8"}}},
  "name": "[EMAIL_NAME]",
  "assetType": {"id": 207, "name": "templatebasedemail"},
  "category": {"id": 2073800},
  "meta": {
    "globalStyles": {
      "isLocked": false,
      "body": {"font-family": "Arial,helvetica,sans-serif", "font-size": "16px", "color": "#000000", "background-color": "#FFFFFF"},
      "h1": {"font-size": "28px", "color": "#181818", "font-weight": "bold"},
      "buttons": {"font-size": "16px", "color": "#FFFFFF", "background-color": "#0176d3", "border-radius": "4px", "padding": "10px"},
      "mobile": {"body": {"font-size": "16px", "line-height": 1.5}}
    }
  },
  "views": {
    "subjectline": {"content": "[SUBJECT]"},
    "preheader": {"content": "[PREHEADER]"},
    "html": {
      "content": "[HTML_TEMPLATE_WITH_SLOTS]",
      "slots": {
        "[SLOT_KEY]": {
          "content": "<div data-type=\"block\" data-key=\"[BLOCK_KEY]\"></div>",
          "design": "<p style=\"border: #cccccc dashed 1px;\">Drop blocks or content here</p>",
          "blocks": {
            "[BLOCK_KEY]": {
              "assetType": {"id": [BLOCK_TYPE_ID], "name": "[BLOCK_TYPE_NAME]"},
              "content": "[RENDERED_HTML]",
              "design": "[PREVIEW_HTML]",
              "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {}}}
            }
          }
        }
      },
      "template": {
        "id": 0,
        "assetType": {"id": 214, "name": "defaulttemplate"},
        "name": "CONTENTTEMPLATES_C",
        "slots": {"[SLOT_KEY]": {"locked": false}}
      }
    }
  }
}
```

## Block Type IDs
```
195 = buttonblock
196 = textblock  
197 = htmlblock
198 = freeformblock
199 = imageblock
```

## HTML Template Requirements
```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
<body bgcolor="#ffffff">
  <div style="font-size:0; line-height:0;"><custom name="opencounter" type="tracking"><custom name="usermatch" type="tracking" /></div>
  <table width="100%">
    <tr><td>
      <div data-type="slot" data-key="[SLOT_NAME]"></div>
    </td></tr>
  </table>
  <custom type="footer" />
</body>
</html>
```

## Working Example - Text Block
```json
{
  "assetType": {"id": 196, "name": "textblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\" style=\"min-width: 100%;\"><tr><td style=\"padding: 20px;\"><h1>%%firstname%%</h1><p>Content here</p></td></tr></table>",
  "design": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\"><tr><td style=\"padding: 20px;\"><div style=\"min-height:100px;\">Text preview</div></td></tr></table>",
  "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {"padding": "20px"}}}
}
```

## Working Example - Image Block
```json
{
  "assetType": {"id": 199, "name": "imageblock"},
  "content": "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" role=\"presentation\"><tr><td align=\"center\"><img src=\"[IMAGE_URL]\" alt=\"[ALT_TEXT]\" style=\"display: block; width: 100%; max-width: 600px;\"></td></tr></table>",
  "design": "<div style=\"width:100%; height:150px; background:#f0f0f0; text-align:center; line-height:150px;\">Image Placeholder</div>",
  "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {"background-color": "#ffffff", "padding": "0px"}}}
}
```

## Working Example - Button Block
```json
{
  "assetType": {"id": 195, "name": "buttonblock"},
  "content": "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"><tr><td align=\"center\" style=\"padding: 20px;\"><table cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"background-color: #0176d3; border-radius: 4px;\"><a href=\"[URL]\" style=\"display: inline-block; padding: 12px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;\">[BUTTON_TEXT]</a></td></tr></table></td></tr></table>",
  "design": "<table width=\"100%\"><tr><td align=\"center\" style=\"padding: 20px;\"><span style=\"background-color: #0176d3; color: #ffffff; padding: 12px 30px; display: inline-block; border-radius: 4px;\">Button</span></td></tr></table>",
  "meta": {"wrapperStyles": {"mobile": {"visible": true}, "styling": {"padding": "20px"}}}
}
```

## API Endpoint
```
POST /asset/v1/content/assets
Headers: 
  Authorization: Bearer [ACCESS_TOKEN]
  Content-Type: application/json
Body: [JSON_STRUCTURE_ABOVE]
```

## Validation Checklist
- [ ] assetType.id === 207
- [ ] Each slot has: content, design, blocks
- [ ] Each block has: assetType, content, design, meta
- [ ] HTML template includes: <custom> tags, <div data-type="slot">
- [ ] Response shows: kind=template (not kind=paste)