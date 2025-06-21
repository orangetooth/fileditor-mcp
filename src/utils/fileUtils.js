import fs from 'fs/promises';
import { resolve, dirname, isAbsolute, join } from 'path';
import { existsSync, lstatSync } from 'fs';
import { cwd } from 'process';
import pathIsInside from 'path-is-inside';

/**
 * General file operation utility class
 */
export class FileUtils {

    // Current workspace root directory, initially null, must be set via set_workspace
    static WORKSPACE_ROOT = null;    /**
     * Set workspace root directory
     * @param {string} workspaceRoot - New workspace root directory path
     * @throws {Error} If directory does not exist or is not accessible
     */
    static setWorkspaceRoot(workspaceRoot) {
        // Input validation
        if (!workspaceRoot || typeof workspaceRoot !== 'string') {
            throw new Error('Invalid workspace root: must be a non-empty string');
        }

        // Prevent null bytes and other dangerous characters
        if (workspaceRoot.includes('\0') || workspaceRoot.includes('\x00')) {
            throw new Error('Invalid workspace root: contains null bytes');
        }

        const resolvedPath = resolve(workspaceRoot);

        if (!existsSync(resolvedPath)) {
            throw new Error(`Workspace directory does not exist: ${workspaceRoot}`);
        }        // Verify it is a directory, not a file
        try {
            const stats = lstatSync(resolvedPath);
            if (!stats.isDirectory()) {
                throw new Error(`Workspace path is not a directory: ${workspaceRoot}`);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw new Error(`Cannot access workspace directory: ${error.message}`);
            }
        }

        FileUtils.WORKSPACE_ROOT = resolvedPath;
        console.error(`Workspace root set to: ${FileUtils.WORKSPACE_ROOT}`);
    }

    /**
     * Get current workspace root directory
     * @returns {string} Current workspace root directory
     */
    static getWorkspaceRoot() {
        return FileUtils.WORKSPACE_ROOT;
    }

    /**
     * Securely resolve file path, ensuring it does not go outside the workspace
     * Uses a mature third-party library to prevent path traversal attacks
     * @param {string} filePath - Input file path
     * @returns {string} Secure absolute path
     * @throws {Error} If path tries to access files outside the workspace or workspace is not set
     */
    static getSecurePath(filePath) {
        // First check if workspace is set
        if (!FileUtils.WORKSPACE_ROOT) {
            throw new Error('Workspace not set. Please call set_workspace first to establish a secure workspace root directory.');
        }

        // Input validation
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path: must be a non-empty string');
        }

        // Prevent null bytes and other dangerous characters
        if (filePath.includes('\0') || filePath.includes('\x00')) {
            throw new Error('Invalid file path: contains null bytes');
        }

        let targetPath;

        if (isAbsolute(filePath)) {
            // Absolute path: use directly
            targetPath = filePath;
        } else {
            // Relative path: join to workspace root
            targetPath = join(FileUtils.WORKSPACE_ROOT, filePath);
        }

        // Resolve to canonical absolute path, handle symlinks
        let resolvedPath;
        try {
            resolvedPath = resolve(targetPath);
        } catch (error) {
            throw new Error(`Failed to resolve path '${filePath}': ${error.message}`);
        }

        // Use mature third-party library to check if path is inside workspace
        if (!pathIsInside(resolvedPath, FileUtils.WORKSPACE_ROOT) && resolvedPath !== FileUtils.WORKSPACE_ROOT) {
            throw new Error(`Access denied: Path is outside the workspace boundary`);
        }

        return resolvedPath;
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {boolean} Whether file exists
     */
    static fileExists(filePath) {
        const securePath = FileUtils.getSecurePath(filePath);
        return existsSync(securePath);
    }

    /**
     * Read file content
     * @param {string} filePath - File path
     * @returns {Promise<string>} File content
     */
    static async readFile(filePath) {
        const securePath = FileUtils.getSecurePath(filePath);
        if (!existsSync(securePath)) {
            throw new Error(`File not found: ${securePath}`);
        }
        return await fs.readFile(securePath, 'utf8');
    }

    /**
     * Write file content
     * @param {string} filePath - File path
     * @param {string} content - File content
     */
    static async writeFile(filePath, content) {
        const securePath = FileUtils.getSecurePath(filePath);
        const dir = dirname(securePath);

        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(securePath, content, 'utf8');
    }

    /**
     * Create MCP standard response format
     * @param {string} text - Response text
     * @returns {Object} MCP response format
     */
    static createResponse(text) {
        return {
            content: [
                {
                    type: "text",
                    text: text
                }
            ]
        };
    }

    /**
     * Create MCP error response format
     * @param {string} errorMessage - Error message
     * @returns {Object} MCP error response format
     */
    static createErrorResponse(errorMessage) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`
                }
            ]
        };
    }

    /**
     * Count number of lines in a string
     * @param {string} content - String content
     * @returns {number} Number of lines
     */
    static countLines(content) {
        return content.split('\n').length;
    }

    /**
     * Get specified line range from file
     * @param {string} content - File content
     * @param {string} lineRange - Line range, e.g. "1-10"
     * @returns {string} Content of specified range
     */    static getLineRange(content, lineRange) {
        // Validate line range format
        if (!lineRange || !lineRange.includes('-')) {
            throw new Error(`Invalid line range format: ${lineRange}. Expected format: 'start-end'`);
        }

        const [start, end] = lineRange.split('-').map(Number);

        // Validate line numbers are valid numbers
        if (isNaN(start) || isNaN(end)) {
            throw new Error(`Invalid line range: ${lineRange}. Start and end must be valid numbers`);
        }

        // Validate line numbers are positive
        if (start < 1 || end < 1) {
            throw new Error(`Invalid line range: ${lineRange}. Line numbers must be positive`);
        }

        // Validate start line cannot be greater than end line
        if (start > end) {
            throw new Error(`Invalid line range: ${lineRange}. Start line cannot be greater than end line`);
        }

        const lines = content.split('\n');

        // Validate line numbers do not exceed file range
        if (start > lines.length) {
            throw new Error(`Line range ${lineRange} exceeds file length (${lines.length} lines)`);
        }

        const selectedLines = lines.slice(start - 1, end);
        return selectedLines.join('\n');
    }

    /**
     * Format content with line numbers
     * @param {string} content - Original content
     * @param {number} startLine - Starting line number, default is 1
     * @returns {string} Formatted content with line numbers
     */
    static formatWithLineNumbers(content, startLine = 1) {
        const lines = content.split('\n');
        const formattedLines = lines.map((line, index) => {
            const lineNumber = startLine + index;
            return `${lineNumber} | ${line}`;
        });
        return formattedLines.join('\n');
    }
}
