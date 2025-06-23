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
                return await InsertContentHandler.insertContentMultipleFiles(args);
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
        await FileUtils.writeFile(filePath, lines.join('\n'));

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
     * @param {Object} args - Original arguments object
     * @returns {Promise<Object>} Response result
     */
    static async insertContentMultipleFiles(args) {
        const results = [];
        const errors = [];

        try {
            // Use FileUtils to normalize parameters
            const { paths, contents, lines: lineArray, fileCount } = FileUtils.normalizeMultiFileArgs(args);

            // Perform insert operation for each file
            for (let i = 0; i < fileCount; i++) {
                const filePath = paths[i];
                const line = lineArray[i];
                const content = contents[i];

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
        } catch (paramError) {
            throw new Error(`Parameter validation failed: ${paramError.message}`);
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
