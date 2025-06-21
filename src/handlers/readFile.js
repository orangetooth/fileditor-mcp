import { FileUtils } from '../utils/fileUtils.js';

/**
 * read_file tool handler
 */
export class ReadFileHandler {

    /**
     * Handle read_file request
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const { path, line_range } = args;

        try {
            // Check if single file or multiple files
            if (Array.isArray(path)) {
                // Read multiple files
                return await ReadFileHandler.readMultipleFiles(path);
            } else {
                // Read single file
                return await ReadFileHandler.readSingleFile(path, line_range);
            }
        } catch (error) {
            throw new Error(`Failed to read file(s): ${error.message}`);
        }
    }

    /**
     * Read a single file
     * @param {string} filePath - File path
     * @param {string} line_range - Line range
     * @returns {Promise<Object>} Response result
     */
    static async readSingleFile(filePath, line_range) {
        const content = await FileUtils.readFile(filePath);

        if (line_range) {
            const selectedContent = FileUtils.getLineRange(content, line_range);
            const [startLine] = line_range.split('-').map(Number);
            const formattedContent = FileUtils.formatWithLineNumbers(selectedContent, startLine);
            return FileUtils.createResponse(formattedContent);
        }

        const formattedContent = FileUtils.formatWithLineNumbers(content);
        return FileUtils.createResponse(formattedContent);
    }

    /**
     * Read multiple files
     * @param {string[]} filePaths - Array of file paths
     * @returns {Promise<Object>} Response result
     */
    static async readMultipleFiles(filePaths) {
        // Check for empty array
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            throw new Error('Failed to read any files: No files provided');
        }

        const results = [];
        const errors = [];

        for (const filePath of filePaths) {
            try {
                if (!FileUtils.fileExists(filePath)) {
                    errors.push(`File not found: ${filePath}`);
                    continue;
                }

                const content = await FileUtils.readFile(filePath);
                results.push({
                    file: filePath,
                    content: content,
                    lines: FileUtils.countLines(content)
                });
            } catch (error) {
                errors.push(`Error reading ${filePath}: ${error.message}`);
            }
        }

        // Build return content
        let responseText = '';

        if (results.length > 0) {
            responseText += `Successfully read ${results.length} file(s):\n\n`;

            for (const result of results) {
                responseText += `=== ${result.file} (${result.lines} lines) ===\n`;
                const formattedContent = FileUtils.formatWithLineNumbers(result.content);
                responseText += formattedContent;
                responseText += '\n\n';
            }
        }

        if (errors.length > 0) {
            responseText += `Errors encountered:\n`;
            for (const error of errors) {
                responseText += `- ${error}\n`;
            }
        }

        if (results.length === 0 && errors.length > 0) {
            throw new Error(`Failed to read any files: ${errors.join(', ')}`);
        }

        return FileUtils.createResponse(responseText.trim());
    }
}
