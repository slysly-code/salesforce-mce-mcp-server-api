#!/usr/bin/env node

/**
 * HTTP Server Entry Point
 * For Fly.io deployment and API access
 * 
 * This runs the server in HTTP mode with Express
 */

process.env.MODE = 'http';
await import('./complete-server-implementation.js');