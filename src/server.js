import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { toolDefinitions } from './tools/toolDefinitions.js';
import { SetWorkspaceHandler } from './handlers/setWorkspace.js';
import { ReadFileHandler } from './handlers/readFile.js';
import { WriteFileHandler } from './handlers/writeFile.js';
import { ListFilesHandler } from './handlers/listFiles.js';
import { InsertContentHandler } from './handlers/insertContent.js';
import { ApplyDiffHandler } from './handlers/applyDiff.js';
import { SearchAndReplaceHandler } from './handlers/searchAndReplace.js';
import { FileUtils } from './utils/fileUtils.js';

/**
 * Main class for FileEditor MCP server
 */
export class FileEditorMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: "fileditor-mcp",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    /**
     * Set up request handlers
     */
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: toolDefinitions
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;

                switch (name) {
                    case "set_workspace":
                        return await SetWorkspaceHandler.handle(args);
                    case "read_files":
                        return await ReadFileHandler.handle(args);
                    case "write_files":
                        return await WriteFileHandler.handle(args);
                    case "list_files":
                        return await ListFilesHandler.handle(args);
                    case "insert_contents":
                        return await InsertContentHandler.handle(args);
                    case "apply_diffs":
                        return await ApplyDiffHandler.handle(args);
                    case "search_and_replace":
                        return await SearchAndReplaceHandler.handle(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return FileUtils.createErrorResponse(error.message);
            }
        });
    }

    /**
     * Start the server
     * @param {Object} transport - Transport object
     */
    async start(transport) {
        await this.server.connect(transport);
        console.error("FileEditor MCP server running on stdio");
    }
}
