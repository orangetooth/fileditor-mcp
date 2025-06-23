import fs from 'fs/promises';
import { resolve, dirname, isAbsolute, join } from 'path';
import { existsSync, lstatSync } from 'fs';
import { cwd } from 'process';
import { createRequire } from 'module';
import { simpleGit } from 'simple-git';

const require = createRequire(import.meta.url);
const pathIsInside = require('path-is-inside');

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
    }    /**
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
    }    /**
     * Normalize multi-file operation parameters
     * @param {Object} params - Parameters object containing path, content, line, etc.
     * @returns {Object} Normalized parameters with all values as arrays
     */
    static normalizeMultiFileArgs(params) {
        const { path, content, line, line_count } = params;

        // Determine the primary parameter that defines the operation count
        const paths = Array.isArray(path) ? path : [path];
        const fileCount = paths.length;

        // Normalize all parameters to arrays
        const normalizeParam = (param, paramName, defaultValue = null) => {
            if (Array.isArray(param)) {
                if (param.length !== fileCount) {
                    // Generate specific error messages for backward compatibility
                    if (paramName === 'content') {
                        throw new Error(`Path count (${fileCount}) doesn't match content count (${param.length})`);
                    } else if (paramName === 'line_count') {
                        throw new Error(`Path count (${fileCount}) doesn't match line_count array length (${param.length})`);
                    } else {
                        throw new Error(`Parameter array length (${param.length}) must match file count (${fileCount})`);
                    }
                }
                return param;
            } else {
                // Single value: apply to all files
                return new Array(fileCount).fill(param !== undefined ? param : defaultValue);
            }
        };

        return {
            paths,
            contents: content !== undefined ? normalizeParam(content, 'content') : null,
            lines: line !== undefined ? normalizeParam(line, 'line') : null,
            lineCounts: line_count !== undefined ? normalizeParam(line_count, 'line_count') : null,
            fileCount
        };
    }

    /**
     * Read directory contents with detailed type information
     * @param {string} dirPath - Directory path
     * @param {boolean} recursive - Whether to read recursively
     * @returns {Promise<Array>} Array of directory items
     */
    static async readDirectory(dirPath, recursive = false) {
        const securePath = FileUtils.getSecurePath(dirPath);

        if (!existsSync(securePath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const stats = lstatSync(securePath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${dirPath}`);
        }

        const result = [];

        if (recursive) {
            await FileUtils._readDirectoryRecursive(securePath, result, '');
        } else {
            const items = await fs.readdir(securePath, { withFileTypes: true });
            for (const item of items) {
                const type = item.isDirectory() ? 'directory' : 'file';
                result.push(`${type}: ${item.name}`);
            }
        }

        return result;
    }

    /**
     * Internal recursive directory reading helper
     * @param {string} dirPath - Directory path
     * @param {Array} result - Result array to populate
     * @param {string} prefix - Path prefix for display
     */
    static async _readDirectoryRecursive(dirPath, result, prefix) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            const itemPath = join(dirPath, item.name);
            const displayPath = prefix ? `${prefix}/${item.name}` : item.name;

            if (item.isDirectory()) {
                result.push(`directory: ${displayPath}`);
                await FileUtils._readDirectoryRecursive(itemPath, result, displayPath);
            } else {
                result.push(`file: ${displayPath}`);
            }
        }
    }    /**
     * Check if a path is a directory
     * @param {string} dirPath - Directory path
     * @returns {boolean} Whether the path is a directory
     */
    static isDirectory(dirPath) {
        const securePath = FileUtils.getSecurePath(dirPath);
        try {
            return existsSync(securePath) && lstatSync(securePath).isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a file/directory is hidden (starts with '.')
     * @param {string} name - File or directory name
     * @returns {boolean} Whether the item is hidden
     */
    static isHidden(name) {
        return name.startsWith('.');
    }

    /**
     * Check if a directory is a git repository
     * @param {string} dirPath - Directory path
     * @returns {Promise<boolean>} Whether the directory is a git repository
     */
    static async isGitRepository(dirPath) {
        try {
            const git = simpleGit(dirPath);
            await git.checkIsRepo();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Find the git repository root for a given path
     * @param {string} startPath - Starting path to search from
     * @returns {Promise<string|null>} Git repository root path or null if not found
     */
    static async findGitRoot(startPath) {
        try {
            const git = simpleGit(startPath);
            const isRepo = await git.checkIsRepo();
            if (isRepo) {
                const rootPath = await git.revparse(['--show-toplevel']);
                return rootPath.trim();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get git tracked and untracked files in a directory
     * @param {string} gitRoot - Git repository root path
     * @param {string} targetPath - Target directory path
     * @returns {Promise<{tracked: Set<string>, untracked: Set<string>}>} Sets of tracked and untracked file paths
     */
    static async getGitFileStatus(gitRoot, targetPath) {
        try {
            const git = simpleGit(gitRoot);

            // Get all files in the git repository
            const allFiles = await git.raw(['ls-files']);
            const trackedFiles = new Set();

            if (allFiles.trim()) {
                const files = allFiles.trim().split('\n');
                for (const file of files) {
                    const fullPath = join(gitRoot, file.trim());
                    trackedFiles.add(fullPath);
                }
            }

            // Get untracked files
            const status = await git.status();
            const untrackedFiles = new Set();

            for (const file of status.not_added) {
                const fullPath = join(gitRoot, file);
                untrackedFiles.add(fullPath);
            }

            // Filter files within target path
            const filteredTracked = new Set();
            const filteredUntracked = new Set();

            // Filter tracked files
            for (const filePath of trackedFiles) {
                if (FileUtils.isPathInTarget(filePath, targetPath)) {
                    filteredTracked.add(filePath);
                }
            }

            // Filter untracked files
            for (const filePath of untrackedFiles) {
                if (FileUtils.isPathInTarget(filePath, targetPath)) {
                    filteredUntracked.add(filePath);
                }
            }

            return {
                tracked: filteredTracked,
                untracked: filteredUntracked
            };
        } catch (error) {
            // If git command fails, return empty sets
            return {
                tracked: new Set(),
                untracked: new Set()
            };
        }
    }

    /**
     * Check if a file path is within the target directory
     * @param {string} filePath - File path to check
     * @param {string} targetPath - Target directory path
     * @returns {boolean} Whether the file is within the target directory
     */
    static isPathInTarget(filePath, targetPath) {
        const normalizedFile = resolve(filePath);
        const normalizedTarget = resolve(targetPath);

        return normalizedFile === normalizedTarget ||
            pathIsInside(normalizedFile, normalizedTarget);
    }/**
     * Check if a file/directory is hidden (starts with '.')
     * @param {string} name - File or directory name
     * @returns {boolean} Whether the item is hidden
     */
    static isHidden(name) {
        return name.startsWith('.');
    }

    /**
     * Check if a directory is a git repository
     * @param {string} dirPath - Directory path
     * @returns {Promise<boolean>} Whether the directory is a git repository
     */
    static async isGitRepository(dirPath) {
        try {
            const gitPath = join(dirPath, '.git');
            return existsSync(gitPath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Find the git repository root for a given path
     * @param {string} startPath - Starting path to search from
     * @returns {Promise<string|null>} Git repository root path or null if not found
     */
    static async findGitRoot(startPath) {
        let currentPath = resolve(startPath);

        while (currentPath !== dirname(currentPath)) {
            if (await FileUtils.isGitRepository(currentPath)) {
                return currentPath;
            }
            currentPath = dirname(currentPath);
        }

        return null;
    }

    /**
     * Get relative path between two absolute paths
     * @param {string} from - Base path
     * @param {string} to - Target path
     * @returns {string} Relative path
     */
    static getRelativePath(from, to) {
        const fromParts = resolve(from).split(/[/\\]/);
        const toParts = resolve(to).split(/[/\\]/);

        // Find common base
        let commonLength = 0;
        const minLength = Math.min(fromParts.length, toParts.length);

        for (let i = 0; i < minLength; i++) {
            if (fromParts[i].toLowerCase() === toParts[i].toLowerCase()) {
                commonLength = i + 1;
            } else {
                break;
            }
        }

        // Build relative path
        const upLevels = fromParts.length - commonLength;
        const downParts = toParts.slice(commonLength);

        const relativeParts = [];
        for (let i = 0; i < upLevels; i++) {
            relativeParts.push('..');
        }
        relativeParts.push(...downParts);

        return relativeParts.join('/');
    }

    /**
     * Read directory contents with advanced filtering options
     * @param {string} dirPath - Directory path
     * @param {Object} options - Filtering options
     * @returns {Promise<Array>} Array of directory items
     */
    static async readDirectoryAdvanced(dirPath, options = {}) {
        const {
            recursive = false,
            show_hidden = false,
            git_filter = 'all'
        } = options;

        const securePath = FileUtils.getSecurePath(dirPath);

        if (!existsSync(securePath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const stats = lstatSync(securePath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${dirPath}`);
        }        // Check for git repository if git filtering is needed
        let gitRoot = null;
        let trackedFiles = new Set();
        let untrackedFiles = new Set(); if (git_filter !== 'all') {
            gitRoot = await FileUtils.findGitRoot(securePath);
            if (gitRoot) {
                const gitStatus = await FileUtils.getGitFileStatus(gitRoot, securePath);
                trackedFiles = gitStatus.tracked;
                untrackedFiles = gitStatus.untracked;
            }
        }

        const result = []; if (recursive) {
            await FileUtils._readDirectoryRecursiveAdvanced(
                securePath,
                result,
                '',
                { show_hidden, git_filter, gitRoot, trackedFiles, untrackedFiles }
            );
        } else {
            const items = await fs.readdir(securePath, { withFileTypes: true });
            for (const item of items) {
                // Apply hidden file filter
                if (!show_hidden && FileUtils.isHidden(item.name)) {
                    continue;
                }

                const fullItemPath = join(securePath, item.name);                // Apply git filter
                if (git_filter !== 'all' && gitRoot) {
                    const isTracked = trackedFiles.has(fullItemPath);
                    const isUntracked = untrackedFiles.has(fullItemPath);

                    if (git_filter === 'tracked' && !isTracked) {
                        continue;
                    }
                    if (git_filter === 'untracked' && !isUntracked) {
                        continue;
                    }
                }

                const type = item.isDirectory() ? 'directory' : 'file';
                let displayName = item.name;

                // Add git status indicator
                if (git_filter === 'all' && gitRoot) {
                    const isTracked = trackedFiles.has(fullItemPath);
                    const isUntracked = untrackedFiles.has(fullItemPath);

                    if (isTracked) {
                        displayName += ' [tracked]';
                    } else if (isUntracked) {
                        displayName += ' [untracked]';
                    } else {
                        displayName += ' [ignored]';
                    }
                }

                result.push(`${type}: ${displayName}`);
            }
        }

        return result;
    }

    /**
     * Internal recursive directory reading helper with advanced options
     * @param {string} dirPath - Directory path
     * @param {Array} result - Result array to populate
     * @param {string} prefix - Path prefix for display
     * @param {Object} options - Filtering options
     */    static async _readDirectoryRecursiveAdvanced(dirPath, result, prefix, options) {
        const { show_hidden, git_filter, gitRoot, trackedFiles, untrackedFiles } = options;

        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            // Apply hidden file filter
            if (!show_hidden && FileUtils.isHidden(item.name)) {
                continue;
            }

            const itemPath = join(dirPath, item.name);
            const displayPath = prefix ? `${prefix}/${item.name}` : item.name;

            // Apply git filter
            if (git_filter !== 'all' && gitRoot) {
                const isTracked = trackedFiles.has(itemPath);
                const isUntracked = untrackedFiles.has(itemPath);

                if (git_filter === 'tracked' && !isTracked) {
                    continue;
                }
                if (git_filter === 'untracked' && !isUntracked) {
                    continue;
                }
            }

            let displayName = displayPath;

            // Add git status indicator
            if (git_filter === 'all' && gitRoot) {
                const isTracked = trackedFiles.has(itemPath);
                const isUntracked = untrackedFiles.has(itemPath);

                if (isTracked) {
                    displayName += ' [tracked]';
                } else if (isUntracked) {
                    displayName += ' [untracked]';
                } else {
                    displayName += ' [ignored]';
                }
            }

            if (item.isDirectory()) {
                result.push(`directory: ${displayName}`);
                await FileUtils._readDirectoryRecursiveAdvanced(
                    itemPath,
                    result,
                    displayPath,
                    options
                );
            } else {
                result.push(`file: ${displayName}`);
            }
        }
    }

    /**
     * Validate line range parameters
     * @param {Object} params - Parameters containing start_line, end_line, totalLines
     * @throws {Error} If validation fails
     */
    static validateLineRange(params) {
        const { start_line, end_line, totalLines } = params;

        if (start_line !== null && start_line !== undefined) {
            if (start_line < 1) {
                throw new Error(`Invalid start_line: ${start_line}. Line numbers start from 1.`);
            }
            if (totalLines && start_line > totalLines) {
                throw new Error(`start_line (${start_line}) exceeds file length (${totalLines} lines)`);
            }
        }

        if (end_line !== null && end_line !== undefined) {
            if (end_line < 1) {
                throw new Error(`Invalid end_line: ${end_line}. Line numbers start from 1.`);
            }
        }

        if (start_line !== null && end_line !== null && start_line > end_line) {
            throw new Error(`start_line (${start_line}) cannot be greater than end_line (${end_line})`);
        }
    }
}
