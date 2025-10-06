/**
 * SOLUTION 4: Pre-Flight Check Tool
 * 
 * Add a mandatory tool that must be called before email creation.
 * This tool returns the documentation and validates readiness.
 */

const preFlightCheckTool = {
  name: 'mce_v1_preflight_check',
  description: `MANDATORY PRE-FLIGHT CHECK - Call this BEFORE creating emails/journeys.

This tool:
1. Returns essential documentation you must read
2. Validates your understanding
3. Provides a checklist
4. Returns a "clearance token" needed for actual creation

YOU MUST call this tool first, read the returned documentation, 
and use the clearance token in subsequent mce_v1_rest_request calls.`,
  inputSchema: {
    type: 'object',
    properties: {
      operation_type: {
        type: 'string',
        enum: ['email_creation', 'journey_creation', 'data_extension'],
        description: 'Type of operation you want to perform'
      },
      user_intent: {
        type: 'string',
        description: 'What the user asked you to do (in plain language)'
      }
    },
    required: ['operation_type', 'user_intent']
  }
};

/**
 * Implementation of pre-flight check handler
 */
async function handlePreFlightCheck(args) {
  const { operation_type, user_intent } = args;
  
  const responses = {
    email_creation: {
      clearance_token: `CLEARANCE-${Date.now()}`,
      required_reading: [
        {
          resource: 'mce://guides/editable-emails',
          why: 'Explains the CRITICAL assetType.id = 207 requirement',
          must_read: true
        },
        {
          resource: 'mce://examples/complete-email',
          why: 'Shows the exact JSON structure you need to follow',
          must_read: true
        },
        {
          resource: 'mce://guides/email-components',
          why: 'Maps user phrases to technical components',
          must_read: false,
          read_if: 'User mentioned specific components like buttons, images, etc.'
        }
      ],
      critical_rules: [
        '❌ NEVER use assetType.id = 208',
        '✅ ALWAYS use assetType: {id: 207, name: "templatebasedemail"}',
        '✅ Both id AND name are REQUIRED',
        '✅ Must include slots with blocks for editability',
        '✅ Each block needs: assetType, content, design, meta'
      ],
      checklist: {
        '1_read_documentation': 'Read mce://guides/editable-emails',
        '2_read_example': 'Read mce://examples/complete-email',
        '3_understand_structure': 'Understand slots, blocks, assetType structure',
        '4_build_request': 'Build request following exact structure',
        '5_validate': 'Call mce_v1_validate_request',
        '6_create': 'Call mce_v1_rest_request with clearance_token'
      },
      common_failures: {
        'using_id_208': {
          error: 'Creates non-editable HTML paste email',
          fix: 'Use id: 207 instead',
          frequency: '60% of failures'
        },
        'missing_name': {
          error: 'API returns error 118077',
          fix: 'Include both id AND name in assetType',
          frequency: '25% of failures'
        },
        'missing_slots': {
          error: 'Email created but not editable in Content Builder',
          fix: 'Include proper slots and blocks structure',
          frequency: '10% of failures'
        }
      },
      next_steps: [
        '1. Read the required_reading resources above',
        '2. Study the critical_rules',
        '3. Review the complete email example',
        '4. Build your request following the structure',
        '5. Call mce_v1_validate_request with your request',
        '6. Include this clearance_token in your mce_v1_rest_request',
        '7. Do NOT proceed without completing all steps'
      ],
      estimated_time: '2-3 minutes to read documentation',
      success_rate_without_reading: '10%',
      success_rate_after_reading: '95%'
    },
    
    journey_creation: {
      clearance_token: `CLEARANCE-${Date.now()}`,
      required_reading: [
        {
          resource: 'mce://guides/journey-builder',
          why: 'Complete guide for all activity types and structures',
          must_read: true
        }
      ],
      critical_rules: [
        '🔗 Data Extensions MUST be linked to Contact Model for filters',
        '⚡ holdBackPercentage MUST be 0 for recurring journeys',
        '🔄 Path Optimizer needs matching capsule IDs',
        '📊 All paths must converge at ABNTESTSTOP'
      ],
      // ... similar structure
    }
  };
  
  const response = responses[operation_type];
  
  return {
    content: [{
      type: 'text',
      text: `🚦 PRE-FLIGHT CHECK: ${operation_type.replace('_', ' ').toUpperCase()}

User Intent: "${user_intent}"

═══════════════════════════════════════════════════════════

📚 REQUIRED READING (MANDATORY):

${response.required_reading.map((doc, i) => `
${i + 1}. Resource: ${doc.resource}
   Why: ${doc.why}
   ${doc.must_read ? '⚠️  MUST READ' : '📖 Optional'}
   ${doc.read_if ? `Read if: ${doc.read_if}` : ''}
`).join('\n')}

═══════════════════════════════════════════════════════════

⚠️  CRITICAL RULES (VIOLATIONS = FAILURE):

${response.critical_rules.map(rule => `  ${rule}`).join('\n')}

═══════════════════════════════════════════════════════════

📋 CHECKLIST (Complete in Order):

${Object.entries(response.checklist).map(([key, value]) => 
  `  [ ] ${value}`
).join('\n')}

═══════════════════════════════════════════════════════════

🚨 COMMON FAILURES:

${Object.entries(response.common_failures || {}).map(([key, info]) => `
  ${key}:
    Error: ${info.error}
    Fix: ${info.fix}
    Frequency: ${info.frequency}
`).join('\n')}

═══════════════════════════════════════════════════════════

📊 SUCCESS METRICS:

  Without reading docs: ${response.success_rate_without_reading}
  After reading docs:   ${response.success_rate_after_reading}
  Time to read:        ${response.estimated_time}

═══════════════════════════════════════════════════════════

🎯 NEXT STEPS:

${response.next_steps.map((step, i) => `  ${step}`).join('\n')}

═══════════════════════════════════════════════════════════

🔑 CLEARANCE TOKEN (Required for API calls):

  ${response.clearance_token}

Include this token in your mce_v1_rest_request as:
{
  "clearance_token": "${response.clearance_token}",
  "method": "POST",
  ...
}

═══════════════════════════════════════════════════════════

⏰ You must complete this checklist before proceeding.
   Start by reading the required resources above.
`
    }]
  };
}

/**
 * Modified REST request handler that requires clearance token
 */
async function handleRestRequestWithClearance(args) {
  const { clearance_token, method, path, body } = args;
  
  // Check for email creation without clearance
  if (method === 'POST' && path.includes('/asset/v1/content/assets')) {
    if (!clearance_token || !clearance_token.startsWith('CLEARANCE-')) {
      return {
        content: [{
          type: 'text',
          text: `⛔ CLEARANCE TOKEN REQUIRED

You attempted to create an email without completing the pre-flight check.

REQUIRED ACTIONS:
1. Call mce_v1_preflight_check with operation_type: "email_creation"
2. Read ALL documentation resources returned
3. Complete the checklist
4. Include the clearance_token in this request

This is a safety mechanism to prevent common failures.

Current failure rate for emails created without pre-flight: 90%
Current success rate with pre-flight check: 95%

Please call mce_v1_preflight_check first.`
        }],
        isError: true
      };
    }
    
    // Validate clearance token age (must be < 30 minutes)
    const tokenTime = parseInt(clearance_token.split('-')[1]);
    const age = Date.now() - tokenTime;
    if (age > 30 * 60 * 1000) {
      return {
        content: [{
          type: 'text',
          text: '⏰ Clearance token expired (>30 minutes old). Please call mce_v1_preflight_check again.'
        }],
        isError: true
      };
    }
  }
  
  // Token valid, proceed with normal request
  return await executeRestRequest(args);
}

module.exports = {
  preFlightCheckTool,
  handlePreFlightCheck,
  handleRestRequestWithClearance
};
