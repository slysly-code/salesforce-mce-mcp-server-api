// MCE API Helper Functions - LLM Reference Implementation
// Place in: salesforce-mce-mcp-server-api/helpers/mce-api-helpers.js

/**
 * Creates fully editable MCE email (not HTML paste)
 * CRITICAL: Uses assetType 207 (templatebasedemail) NOT 208 (htmlemail)
 */
function createEditableEmail(params) {
  const { name, subject, preheader, slots } = params;
  
  return {
    data: { email: { options: { characterEncoding: "utf-8" } } },
    name,
    assetType: { 
      id: 207,  // MUST BE 207 FOR EDITABLE
      name: "templatebasedemail" 
    },
    category: { id: 2073800 },
    meta: {
      globalStyles: {
        isLocked: false,
        body: {
          "font-family": "Arial,helvetica,sans-serif",
          "font-size": "16px",
          "color": "#000000",
          "background-color": "#FFFFFF"
        },
        h1: {
          "font-size": "28px",
          "color": "#181818",
          "font-weight": "bold"
        },
        buttons: {
          "font-size": "16px",
          "color": "#FFFFFF",
          "background-color": "#0176d3",
          "border-radius": "4px",
          "padding": "10px"
        },
        mobile: {
          body: { "font-size": "16px", "line-height": 1.5 },
          h1: { "font-size": "22px", "line-height": 1 }
        }
      }
    },
    views: {
      subjectline: { content: subject },
      preheader: { content: preheader },
      html: {
        content: generateHTMLTemplate(Object.keys(slots)),
        slots: generateSlotStructure(slots),
        template: {
          id: 0,
          assetType: { id: 214, name: "defaulttemplate" },
          name: "CONTENTTEMPLATES_C",
          slots: Object.keys(slots).reduce((acc, key) => {
            acc[key] = { locked: false };
            return acc;
          }, {})
        }
      }
    }
  };
}

/**
 * Generates HTML template with slot placeholders
 */
function generateHTMLTemplate(slotKeys) {
  const slotHTML = slotKeys.map(key => 
    `<tr><td><div data-type="slot" data-key="${key}"></div></td></tr>`
  ).join('\n');
  
  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <style type="text/css">
    body {-webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0 !important;}
    @media only screen and (max-width: 480px) {
      .container {width: 100% !important;}
    }
  </style>
</head>
<body bgcolor="#ffffff">
  <div style="font-size:0; line-height:0;"><custom name="opencounter" type="tracking"><custom name="usermatch" type="tracking" /></div>
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="600" class="container">
        ${slotHTML}
      </table>
    </td></tr>
  </table>
  <custom type="footer" />
</body>
</html>`;
}

/**
 * Generates slot structure with blocks
 */
function generateSlotStructure(slots) {
  const slotStructure = {};
  
  Object.entries(slots).forEach(([slotKey, blocks]) => {
    slotStructure[slotKey] = {
      content: blocks.map(block => 
        `<div data-type="block" data-key="${block.key}"></div>`
      ).join(''),
      design: '<p style="border: #cccccc dashed 1px; padding:10px;">Drop blocks or content here</p>',
      blocks: blocks.reduce((acc, block) => {
        acc[block.key] = createBlock(block);
        return acc;
      }, {})
    };
  });
  
  return slotStructure;
}

/**
 * Creates individual block structure
 */
function createBlock(block) {
  const assetTypes = {
    text: { id: 196, name: "textblock" },
    image: { id: 199, name: "imageblock" },
    button: { id: 195, name: "buttonblock" },
    html: { id: 197, name: "htmlblock" },
    freeform: { id: 198, name: "freeformblock" }
  };
  
  return {
    assetType: assetTypes[block.type],
    content: block.content,
    design: block.design || generateDefaultDesign(block.type),
    meta: {
      wrapperStyles: {
        mobile: { visible: true },
        styling: block.styling || {}
      }
    }
  };
}

/**
 * Generates default design preview for block types
 */
function generateDefaultDesign(type) {
  const designs = {
    text: '<div style="padding:20px; min-height:100px;">Text content preview</div>',
    image: '<div style="height:150px; background:#f0f0f0; text-align:center; line-height:150px;">Image Placeholder</div>',
    button: '<div style="text-align:center; padding:20px;"><span style="background:#0176d3; color:#fff; padding:12px 30px; display:inline-block; border-radius:4px;">Button</span></div>',
    html: '<div style="padding:20px; background:#f9f9f9;">Custom HTML</div>',
    freeform: '<div style="padding:20px; border:1px solid #ddd;">Free Form Content</div>'
  };
  
  return `<table width="100%"><tr><td>${designs[type]}</td></tr></table>`;
}

/**
 * Example usage for creating welcome email
 */
function createWelcomeEmail() {
  return createEditableEmail({
    name: "Welcome Email Template",
    subject: "Welcome %%firstname%%!",
    preheader: "Start your journey with us",
    slots: {
      header: [
        {
          key: "header-logo",
          type: "image",
          content: '<table width="100%"><tr><td align="center" style="padding:20px; background:#0176d3;"><img src="https://via.placeholder.com/200x80/0176d3/ffffff?text=LOGO" alt="Logo" style="display:block;"></td></tr></table>',
          design: '<div style="height:120px; background:#0176d3; text-align:center; line-height:120px; color:white;">Logo</div>',
          styling: { "background-color": "#0176d3", "padding": "20px" }
        }
      ],
      body: [
        {
          key: "body-text",
          type: "text",
          content: '<table width="100%"><tr><td style="padding:20px;"><h1 style="color:#333;">Welcome %%firstname%%!</h1><p style="color:#666; line-height:1.6;">We are excited to have you join our community.</p></td></tr></table>'
        },
        {
          key: "body-button",
          type: "button",
          content: '<table width="100%"><tr><td align="center" style="padding:20px;"><a href="https://example.com" style="background:#0176d3; color:#fff; padding:15px 40px; text-decoration:none; display:inline-block; border-radius:4px; font-weight:bold;">Get Started</a></td></tr></table>'
        }
      ],
      footer: [
        {
          key: "footer-text",
          type: "text",
          content: '<table width="100%"><tr><td style="padding:20px; text-align:center; border-top:1px solid #ddd;"><p style="color:#999; font-size:12px;">© 2025 Company. <a href="%%unsub_center_url%%">Unsubscribe</a></p></td></tr></table>'
        }
      ]
    }
  });
}

/**
 * Creates a journey with email activities
 */
function createJourney(params) {
  const { name, key, activities } = params;
  
  return {
    key: key || `journey-${Date.now()}`,
    name,
    status: "Draft",
    entryMode: "SingleEntryAcrossAllVersions",
    definitionType: "Multistep",
    workflowApiVersion: 1,
    triggers: [{
      key: "TRIGGER-1",
      name: "Entry Trigger",
      type: "AutomationAudience",
      arguments: { startActivityKey: "{{Context.StartActivityKey}}" },
      eventDefinitionKey: `${key}-trigger`,
      configurationArguments: {}
    }],
    activities: connectActivities(activities)
  };
}

/**
 * Connects activities by setting next property
 */
function connectActivities(activities) {
  return activities.map((activity, index) => {
    if (index < activities.length - 1 && activity.outcomes && activity.outcomes.length > 0) {
      activity.outcomes[0].next = activities[index + 1].key;
    }
    return activity;
  });
}

// Export for use in MCP server
module.exports = {
  createEditableEmail,
  createWelcomeEmail,
  createJourney,
  generateHTMLTemplate,
  generateSlotStructure,
  createBlock,
  connectActivities
};