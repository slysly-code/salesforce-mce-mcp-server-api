/**
 * Marketing Cloud Engagement Operations Helper
 * Consolidated helper for all MCE operations via MCP Server
 * 
 * @version 1.0.0
 * @updated 2024-09-19
 */

class MCEOperationsHelper {
  /**
   * Email Asset Operations
   */
  static EmailAssets = {
    /**
     * Create email asset using REST API (RECOMMENDED)
     * @param {Object} params - Email parameters
     * @returns {Object} Request for mce_v1_rest_request
     */
    create: (params) => {
      const { name, subject, preheader, htmlContent } = params;
      
      // CRITICAL: Always use REST API, never mce_v1_build_email
      return {
        tool: 'mce_v1_rest_request',
        method: 'POST',
        path: '/asset/v1/content/assets',
        body: {
          name: name,
          assetType: {
            id: 208,           // REQUIRED
            name: 'htmlemail'  // REQUIRED - both id and name needed!
          },
          views: {
            html: {
              content: htmlContent || MCEOperationsHelper.EmailAssets.generateTemplate()
            },
            subjectline: {
              content: subject || 'Email Subject'
            },
            preheader: {
              content: preheader || ''
            }
          }
        }
      };
    },

    /**
     * Generate HTML email template
     */
    generateTemplate: (options = {}) => {
      const {
        logoUrl = 'https://www.salesforce.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
        headline = 'Welcome',
        content = 'Your content here',
        ctaText = 'Get Started',
        ctaUrl = '#'
      } = options;

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #0176d3; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    h1 { color: #032e61; font-size: 28px; }
    p { color: #3e3e3c; font-size: 16px; line-height: 1.6; }
    .button { display: inline-block; padding: 15px 30px; background: #0176d3; 
              color: white !important; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Logo" width="150">
    </div>
    <div class="content">
      <h1>${headline}</h1>
      <p>${content}</p>
      <a href="${ctaUrl}" class="button">${ctaText}</a>
    </div>
  </div>
</body>
</html>`;
    },

    /**
     * List email assets
     */
    list: (pageSize = 50) => ({
      tool: 'mce_v1_rest_request',
      method: 'GET',
      path: '/asset/v1/content/assets',
      query: {
        '$filter': 'assetType.id eq 208',
        'pageSize': pageSize
      }
    }),

    /**
     * Update email asset
     */
    update: (id, updates) => ({
      tool: 'mce_v1_rest_request',
      method: 'PATCH',
      path: `/asset/v1/content/assets/${id}`,
      body: updates
    })
  };

  /**
   * Journey Builder Operations
   */
  static JourneyBuilder = {
    /**
     * Create a journey with email audience entry
     */
    createJourney: (params) => {
      const { name, dataExtensionKey, emailId, filter } = params;
      
      return {
        tool: 'mce_v1_rest_request',
        method: 'POST',
        path: '/interaction/v1/interactions',
        body: {
          name: name,
          workflowApiVersion: 1,
          entryMode: 'SingleEntryAcrossAllVersions',
          triggers: [{
            key: 'EVENT-1',
            type: 'EmailAudience',
            eventDefinitionKey: dataExtensionKey,
            arguments: {
              useHighWatermark: true,  // Only process new records
              resetHighWatermark: true
            },
            filterDefinitionTemplate: filter || ''
          }],
          activities: [{
            key: 'EMAIL-1',
            type: 'EMAILV2',
            name: 'Send Email',
            configurationArguments: {
              triggeredSend: {
                emailId: emailId,
                isTrackingClicks: true,
                isMultipart: true
              }
            }
          }]
        }
      };
    },

    /**
     * Generate filter XML for journey decisions
     * IMPORTANT: Data Extension must be linked to Contact Model
     */
    generateFilter: (field, operator, value) => {
      const operatorMap = {
        'equals': 'Equal',
        'notEquals': 'NotEqual',
        'greaterThan': 'GreaterThan',
        'lessThan': 'LessThan',
        'isNull': 'IsNull',
        'isNotNull': 'IsNotNull'
      };
      
      const xmlOperator = operatorMap[operator] || operator;
      const xmlValue = operator === 'isNull' || operator === 'isNotNull' ? '' : value;
      
      return `<FilterDefinition>
  <ConditionSet Operator="AND">
    <Condition Key="${field}" Operator="${xmlOperator}">
      <Value><![CDATA[${xmlValue}]]></Value>
    </Condition>
  </ConditionSet>
</FilterDefinition>`;
    },

    /**
     * Create A/B test activity
     */
    createABTest: (paths) => ({
      key: 'ABNTEST-1',
      type: 'ABNTEST',
      name: 'Path Optimizer',
      outcomes: paths.map((path, index) => ({
        key: `path${index + 1}`,
        next: path.nextActivity,
        arguments: {
          percentage: path.percentage
        },
        metaData: {
          label: path.label || `${path.percentage}%`
        }
      })),
      configurationArguments: {
        holdBackPercentage: 0,  // Must be 0 for recurring journeys
        winnerEvaluationType: 'Engagement',
        engagementPeriod: 3,
        engagementPeriodUnits: 'Days',
        engagementWinnerMetric: 'Clicks'
      }
    })
  };

  /**
   * Data Extension Operations
   */
  static DataExtensions = {
    /**
     * Create Data Extension via SOAP
     */
    create: (params) => {
      const { name, customerKey, fields } = params;
      
      return {
        tool: 'mce_v1_soap_request',
        action: 'Create',
        objectType: 'DataExtension',
        objects: [{
          name: name,
          customerKey: customerKey,
          fields: fields.map(field => ({
            name: field.name,
            fieldType: field.type || 'Text',
            maxLength: field.maxLength || 100,
            isPrimaryKey: field.isPrimaryKey || false,
            isRequired: field.isRequired || false
          })),
          isSendable: params.isSendable || false,
          sendableDataExtensionField: params.sendableField || 'EmailAddress',
          sendableSubscriberField: '_SubscriberKey'
        }]
      };
    },

    /**
     * Upsert rows to Data Extension
     */
    upsertRows: (deKey, rows) => ({
      tool: 'mce_v1_soap_request',
      action: 'Update',
      objectType: `DataExtensionObject[${deKey}]`,
      objects: rows
    }),

    /**
     * Retrieve rows from Data Extension
     */
    retrieveRows: (deKey, filter) => ({
      tool: 'mce_v1_soap_request',
      action: 'Retrieve',
      objectType: `DataExtensionObject[${deKey}]`,
      properties: filter.properties || ['*'],
      filter: filter.where ? {
        property: filter.where.field,
        operator: filter.where.operator || 'equals',
        value: filter.where.value
      } : null
    })
  };

  /**
   * Email Sending Operations
   */
  static EmailSending = {
    /**
     * Send triggered email
     */
    sendTriggered: (params) => {
      const { triggeredSendKey, emailId, subscriber } = params;
      
      return {
        tool: 'mce_v1_soap_request',
        action: 'Create',
        objectType: 'TriggeredSend',
        objects: [{
          TriggeredSendDefinition: {
            CustomerKey: triggeredSendKey,
            Email: { ID: emailId }
          },
          Subscribers: [{
            EmailAddress: subscriber.email,
            SubscriberKey: subscriber.key,
            Attributes: subscriber.attributes || []
          }]
        }]
      };
    },

    /**
     * Send batch email to list
     */
    sendBatch: (emailId, listId) => ({
      tool: 'mce_v1_soap_request',
      action: 'Create',
      objectType: 'Send',
      objects: [{
        Email: { ID: emailId },
        List: { ID: listId }
      }]
    })
  };

  /**
   * Automation Operations
   */
  static Automation = {
    /**
     * Create automation
     */
    create: (name, customerKey, schedule) => ({
      tool: 'mce_v1_soap_request',
      action: 'Create',
      objectType: 'Automation',
      objects: [{
        name: name,
        customerKey: customerKey,
        schedule: schedule
      }]
    }),

    /**
     * Start automation
     */
    start: (customerKey) => ({
      tool: 'mce_v1_soap_request',
      action: 'Perform',
      objectType: 'Automation',
      objects: [{
        CustomerKey: customerKey,
        Action: 'Start'
      }]
    })
  };

  /**
   * Validation Helper
   */
  static Validation = {
    /**
     * Validate email creation request
     */
    validateEmailRequest: (request) => {
      const errors = [];
      
      // Check for common issues
      if (request.tool === 'mce_v1_build_email') {
        errors.push('ERROR: mce_v1_build_email has rendering issues. Use mce_v1_rest_request instead.');
      }
      
      if (!request.body?.assetType?.name) {
        errors.push('ERROR: assetType.name is REQUIRED along with assetType.id');
      }
      
      const html = request.body?.views?.html?.content || '';
      if (!html.includes('<!DOCTYPE html>')) {
        errors.push('WARNING: HTML should start with <!DOCTYPE html>');
      }
      
      if (!html.includes('max-width') || !html.includes('600px')) {
        errors.push('WARNING: Container should have max-width: 600px');
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors,
        fix: errors.length > 0 ? MCEOperationsHelper.EmailAssets.create : null
      };
    },

    /**
     * Validate journey filter
     */
    validateJourneyFilter: (dataExtensionKey) => {
      return {
        warning: 'Data Extension must be linked to Contact Model for filters to work',
        checkIn: 'Contact Builder or Data Designer',
        requiredFor: 'Using DE fields in journey decisions'
      };
    }
  };

  /**
   * Error Solutions
   */
  static ErrorSolutions = {
    118077: 'Include both assetType.id (208) and assetType.name ("htmlemail")',
    118081: 'Remove category field or use valid category ID',
    118052: 'Use unique name for the email',
    10006: 'Check all required fields are present',
    310007: 'Use "_SubscriberKey" or "Email Address" for sendableSubscriberField'
  };

  /**
   * Quick Templates
   */
  static Templates = {
    welcome: (company) => MCEOperationsHelper.EmailAssets.create({
      name: `${company} Welcome Email`,
      subject: `Welcome to ${company}!`,
      preheader: 'Get started with your account',
      htmlContent: MCEOperationsHelper.EmailAssets.generateTemplate({
        headline: 'Welcome!',
        content: `Thanks for joining ${company}. Let's get started!`,
        ctaText: 'Get Started'
      })
    }),

    newsletter: (title, content) => MCEOperationsHelper.EmailAssets.create({
      name: title,
      subject: title,
      htmlContent: MCEOperationsHelper.EmailAssets.generateTemplate({
        headline: title,
        content: content
      })
    })
  };
}

/**
 * LLM Quick Reference
 * 
 * ALWAYS use for email creation:
 * MCEOperationsHelper.EmailAssets.create({ name, subject, preheader, htmlContent })
 * 
 * NEVER use:
 * mce_v1_build_email - it has rendering issues
 * 
 * REMEMBER:
 * - assetType needs both id AND name
 * - Data Extensions must be linked to Contact Model for journey filters
 * - holdBackPercentage must be 0 for recurring journeys
 */

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MCEOperationsHelper;
}

// Global for MCP Server
const MCE_HELPER = MCEOperationsHelper;