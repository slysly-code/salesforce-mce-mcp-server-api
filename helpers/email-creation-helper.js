/**
 * Email Creation Helper for Marketing Cloud Engagement
 * 
 * This helper provides methods and templates for creating emails via the MCE MCP Server
 * Based on learnings from production usage - September 2024
 */

class EmailCreationHelper {
  /**
   * Creates an email using the REST API (RECOMMENDED METHOD)
   * 
   * @param {Object} params - Email parameters
   * @param {string} params.name - Email name
   * @param {string} params.subject - Email subject line
   * @param {string} params.preheader - Preview text
   * @param {string} params.htmlContent - Complete HTML content
   * @returns {Object} Request object for mce_v1_rest_request
   */
  static createEmail(params) {
    const { name, subject, preheader, htmlContent } = params;
    
    // CRITICAL: Always use REST API directly, not mce_v1_build_email
    return {
      tool: 'mce_v1_rest_request',
      method: 'POST',
      path: '/asset/v1/content/assets',
      body: {
        name: name,
        assetType: {
          id: 208,  // MUST include id
          name: 'htmlemail'  // MUST include name - both are required!
        },
        views: {
          html: {
            content: htmlContent
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
  }

  /**
   * Generates a complete HTML email template
   * 
   * @param {Object} options - Template options
   * @returns {string} Complete HTML document
   */
  static generateHTMLTemplate(options = {}) {
    const {
      title = 'Email',
      logoUrl = 'https://www.salesforce.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
      heroImageUrl = '',
      headline = 'Welcome',
      content = 'Your content here',
      ctaText = 'Get Started',
      ctaUrl = '#',
      footerText = '© 2024 Your Company. All rights reserved.'
    } = options;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    /* Email styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .header {
      background: linear-gradient(135deg, #0176d3 0%, #014486 100%);
      padding: 30px;
      text-align: center;
    }
    
    .hero {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    h1 {
      color: #032e61;
      font-size: 28px;
      margin: 0 0 20px;
    }
    
    p {
      color: #3e3e3c;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    
    .button {
      display: inline-block;
      padding: 15px 30px;
      background: #0176d3;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    
    /* Mobile styles */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .content {
        padding: 20px 15px !important;
      }
      h1 {
        font-size: 24px !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${logoUrl}" alt="Logo" width="150" style="filter: brightness(0) invert(1);">
    </div>
    
    ${heroImageUrl ? `<!-- Hero Image -->
    <img src="${heroImageUrl}" alt="Hero" class="hero">` : ''}
    
    <!-- Content -->
    <div class="content">
      <h1>${headline}</h1>
      <p>${content}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${ctaUrl}" class="button">${ctaText}</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Creates a two-column responsive layout
   * 
   * @param {Array} columns - Array of column objects with title and content
   * @returns {string} HTML for two-column layout
   */
  static createTwoColumnSection(columns) {
    if (!columns || columns.length !== 2) {
      throw new Error('Two columns required');
    }

    return `
    <div style="display: table; width: 100%; margin: 30px 0;">
      ${columns.map(col => `
      <div style="display: table-cell; width: 50%; padding: 20px; vertical-align: top;">
        <h3 style="color: #0176d3; margin: 0 0 15px;">${col.title}</h3>
        <p style="color: #3e3e3c; line-height: 1.6;">${col.content}</p>
      </div>
      `).join('')}
    </div>
    
    <!-- Mobile-friendly version -->
    <style>
      @media only screen and (max-width: 600px) {
        div[style*="display: table"] { display: block !important; }
        div[style*="display: table-cell"] { 
          display: block !important; 
          width: 100% !important; 
          margin-bottom: 20px;
        }
      }
    </style>`;
  }

  /**
   * Validates email creation request
   * 
   * @param {Object} request - Request object to validate
   * @returns {Object} Validation result with isValid and errors
   */
  static validateEmailRequest(request) {
    const errors = [];
    
    // Check tool selection
    if (request.tool === 'mce_v1_build_email') {
      errors.push('WARNING: mce_v1_build_email has known rendering issues. Use mce_v1_rest_request instead.');
    }
    
    // Check required fields
    if (!request.body?.name) {
      errors.push('Missing required field: name');
    }
    
    if (!request.body?.assetType?.id) {
      errors.push('Missing required field: assetType.id');
    }
    
    if (!request.body?.assetType?.name) {
      errors.push('Missing required field: assetType.name (THIS IS REQUIRED!)');
    }
    
    if (!request.body?.views?.html?.content) {
      errors.push('Missing required field: views.html.content');
    }
    
    // Check HTML structure
    const html = request.body?.views?.html?.content || '';
    if (!html.includes('<!DOCTYPE html>')) {
      errors.push('HTML must start with <!DOCTYPE html>');
    }
    
    if (!html.includes('<meta charset="UTF-8">')) {
      errors.push('HTML should include charset meta tag');
    }
    
    if (!html.includes('viewport')) {
      errors.push('HTML should include viewport meta tag for mobile responsiveness');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Common email templates
   */
  static templates = {
    welcome: (companyName) => ({
      name: `${companyName} Welcome Email`,
      subject: `Welcome to ${companyName}!`,
      preheader: 'Get started with your new account',
      htmlContent: EmailCreationHelper.generateHTMLTemplate({
        title: `Welcome to ${companyName}`,
        headline: 'Welcome aboard!',
        content: `We're thrilled to have you join ${companyName}. Your journey to amazing experiences starts here.`,
        ctaText: 'Get Started',
        ctaUrl: 'https://example.com/get-started'
      })
    }),

    newsletter: (options) => ({
      name: options.name || 'Monthly Newsletter',
      subject: options.subject || 'Your Monthly Update',
      preheader: options.preheader || 'Latest news and updates',
      htmlContent: EmailCreationHelper.generateHTMLTemplate(options)
    }),

    promotional: (product, discount) => ({
      name: `${product} Promotion`,
      subject: `Save ${discount}% on ${product} - Limited Time!`,
      preheader: `Exclusive ${discount}% discount inside`,
      htmlContent: EmailCreationHelper.generateHTMLTemplate({
        headline: `${discount}% Off ${product}`,
        content: `Don't miss this exclusive offer! Get ${discount}% off ${product} for a limited time only.`,
        ctaText: 'Shop Now',
        ctaUrl: 'https://example.com/shop'
      })
    })
  };

  /**
   * Error code mappings for debugging
   */
  static errorCodes = {
    10006: 'Validation error - check required fields',
    118077: 'Invalid AssetType - ensure both id and name are provided',
    118081: 'Invalid Category ID',
    118045: 'Invalid HTML content',
    118052: 'Name already exists'
  };

  /**
   * Get error solution
   * 
   * @param {number} errorCode - MCE error code
   * @returns {string} Solution text
   */
  static getErrorSolution(errorCode) {
    const solutions = {
      118077: 'Include both assetType.id (208) and assetType.name ("htmlemail")',
      118081: 'Remove category field or use a valid category ID from your account',
      118045: 'Ensure HTML is properly formatted with DOCTYPE and valid structure',
      118052: 'Use a unique name for the email'
    };
    
    return solutions[errorCode] || 'Check the request structure and required fields';
  }
}

/**
 * Example usage for LLMs
 */
const exampleUsage = {
  // CORRECT WAY - Using REST API
  correct: {
    tool: 'mce_v1_rest_request',
    method: 'POST',
    path: '/asset/v1/content/assets',
    body: {
      name: 'Campaign Email',
      assetType: {
        id: 208,
        name: 'htmlemail'  // CRITICAL: Must include name!
      },
      views: {
        html: {
          content: '<!DOCTYPE html>...'
        },
        subjectline: {
          content: 'Subject'
        }
      }
    }
  },
  
  // INCORRECT WAY - Don't use this
  incorrect: {
    tool: 'mce_v1_build_email',  // Has rendering issues!
    name: 'Email',
    sections: []  // Content may not appear
  }
};

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailCreationHelper;
}

// For MCP Server usage
const EMAIL_CREATION_HELPER = EmailCreationHelper;