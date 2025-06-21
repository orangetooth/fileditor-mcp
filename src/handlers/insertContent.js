import fs from 'fs/promises';
import { resolve } from 'path';
import { FileUtils } from '../utils/fileUtils.js';

/**
 * insert_content tool handler
 */
export class InsertContentHandler {

    /**
     * Handle insert_content request
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const { path, line, content } = args;

        try {
            // Check if single file or multiple files
            if (Array.isArray(path)) {
                // Insert into multiple files
                return await InsertContentHandler.insertContentMultipleFiles(path, line, content);
            } else {
                // Insert into single file
                return await InsertContentHandler.insertContentSingleFile(path, line, content);
            }
        } catch (error) {
            throw new Error(`Failed to insert content: ${error.message}`);
        }
    }

    /**
     * Insert content into a single file
     * @param {string} filePath - File path
     * @param {number} line - Line number
     * @param {string} content - Content
     * @returns {Promise<Object>} Response result
     */
    static async insertContentSingleFile(filePath, line, content) {
        const fullPath = FileUtils.getSecurePath(filePath);

        // Check if file exists
        if (!FileUtils.fileExists(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Read existing content
        const existingContent = await FileUtils.readFile(filePath);
        const lines = existingContent.split('\n');

        // Handle insert position
        let insertPosition;
        if (line === 0) {
            // 0 means end of file
            insertPosition = lines.length;
        } else if (line > 0) {
            // Positive: 1-based index
            insertPosition = line - 1; // Convert to 0-based index

            // Check if insert position is valid
            if (insertPosition > lines.length) {
                throw new Error(`Line number ${line} exceeds file length (${lines.length} lines)`);
            }
        } else {
            // Negative: calculate insert position from end
            // -1 means before last line, -2 means before second last line, etc.
            insertPosition = lines.length + line;

            if (insertPosition < 0) {
                throw new Error(`Negative line number ${line} is out of range for file with ${lines.length} lines`);
            }
        }

        // Handle content to insert (may contain multiple lines)
        const newLines = content.split('\n');

        // Insert new content (both negative and positive are insert operations)
        lines.splice(insertPosition, 0, ...newLines);

        // Write back to file
        await fs.writeFile(fullPath, lines.join('\n'), 'utf8');

        // Build response message
        let positionDesc;
        if (line === 0) {
            positionDesc = 'end of file';
        } else if (line > 0) {
            positionDesc = `line ${line}`;
        } else {
            positionDesc = `line ${Math.abs(line)} from end (before current line ${insertPosition + 1})`;
        }

        const message = `Successfully inserted ${newLines.length} line(s) at ${positionDesc} in ${filePath}. File now has ${lines.length} lines.`;
        return FileUtils.createResponse(message);
    }

    /**
     * Insert content into multiple files
     * @param {string[]} filePaths - Array of file paths
     * @param {number|number[]} lines - Line number or array of line numbers
     * @param {string|string[]} contents - Content or array of contents
     * @returns {Promise<Object>} Response result
     */
    static async insertContentMultipleFiles(filePaths, lines, contents) {
        const results = [];
        const errors = [];

        // Parameter validation
        const fileCount = filePaths.length;

        // Handle line parameter (can be a single number or array)
        let lineArray;
        if (Array.isArray(lines)) {
            if (lines.length !== fileCount) {
                throw new Error(`Line array length (${lines.length}) must match file count (${fileCount})`);
            }
            lineArray = lines;
        } else {
            // If single number, apply to all files
            lineArray = new Array(fileCount).fill(lines);
        }

        // Handle content parameter (can be a single string or array)
        let contentArray;
        if (Array.isArray(contents)) {
            if (contents.length !== fileCount) {
                throw new Error(`Content array length (${contents.length}) must match file count (${fileCount})`);
            }
            contentArray = contents;
        } else {
            // If single string, apply to all files
            contentArray = new Array(fileCount).fill(contents);
        }

        // Perform insert operation for each file
        for (let i = 0; i < fileCount; i++) {
            const filePath = filePaths[i];
            const line = lineArray[i];
            const content = contentArray[i];

            try {
                const result = await InsertContentHandler.insertContentSingleFile(filePath, line, content);
                results.push({
                    file: filePath,
                    success: true,
                    message: result.content[0].text
                });
            } catch (error) {
                errors.push({
                    file: filePath,
                    error: error.message
                });
            }
        }

        // Build return message
        let responseText = '';

        if (results.length > 0) {
            responseText += `Successfully processed ${results.length} file(s):\n\n`;
            for (const result of results) {
                responseText += `✅ ${result.file}: ${result.message}\n`;
            }
        }

        if (errors.length > 0) {
            responseText += `\nErrors encountered:\n`;
            for (const error of errors) {
                responseText += `❌ ${error.file}: ${error.error}\n`;
            }
        }

        if (results.length === 0 && errors.length > 0) {
            throw new Error(`Failed to insert content in any files: ${errors.map(e => e.error).join(', ')}`);
        }

        return FileUtils.createResponse(responseText.trim());
    }
}
