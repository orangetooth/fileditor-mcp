#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FileEditorMCPServer } from './server.js';

/**
 * Entry point for FileEditor MCP server
 */
async function main() {
    try {
        const server = new FileEditorMCPServer();
        const transport = new StdioServerTransport();

        await server.start(transport);
    } catch (error) {
        console.error("Failed to start FileEditor MCP server:", error);
        process.exit(1);
    }
}

// Start the server
main();
