import fs from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * list_files tool handler
 */
export class ListFilesHandler {

    /**
     * Handle list_files request
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const { path, recursive = false } = args;

        try {
            const fullPath = FileUtils.getSecurePath(path);

            if (!existsSync(fullPath)) {
                throw new Error(`Directory not found: ${path}`);
            }

            const result = [];

            if (recursive) {
                await ListFilesHandler.listFilesRecursive(fullPath, result, '');
            } else {
                const items = await fs.readdir(fullPath, { withFileTypes: true });
                for (const item of items) {
                    const type = item.isDirectory() ? 'directory' : 'file';
                    result.push(`${type}: ${item.name}`);
                }
            }

            return FileUtils.createResponse(result.join('\n'));
        } catch (error) {
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    /**
     * Recursively list files
     * @param {string} dirPath - Directory path
     * @param {string[]} result - Result array
     * @param {string} prefix - Path prefix
     */
    static async listFilesRecursive(dirPath, result, prefix) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            const itemPath = join(dirPath, item.name);
            const displayPath = prefix ? `${prefix}/${item.name}` : item.name;

            if (item.isDirectory()) {
                result.push(`directory: ${displayPath}`);
                await ListFilesHandler.listFilesRecursive(itemPath, result, displayPath);
            } else {
                result.push(`file: ${displayPath}`);
            }
        }
    }
}
