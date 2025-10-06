#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * For Claude Desktop integration
 * 
 * This runs the server in stdio mode for MCP protocol
 */

process.env.MODE = 'mcp';
await import('./complete-server-implementation.js');