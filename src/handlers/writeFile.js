import { FileUtils } from '../utils/fileUtils.js';

/**
 * write_files tool handler
 */
export class WriteFileHandler {

    /**
     * Handle write_files request
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const { path, content, line_count } = args;

        try {
            // Use FileUtils to normalize parameters
            const { paths, contents, lineCounts, fileCount } = FileUtils.normalizeMultiFileArgs(args);

            const results = [];
            const writeOperations = [];
            const warnings = [];

            // Perform all write operations
            for (let i = 0; i < fileCount; i++) {
                const filePath = paths[i];
                const fileContent = contents[i];
                const expectedLines = lineCounts[i];

                // Execute write operations in parallel
                writeOperations.push(
                    FileUtils.writeFile(filePath, fileContent).then(() => {
                        // Validate line count
                        const actualLines = FileUtils.countLines(fileContent);
                        if (expectedLines !== null && actualLines !== expectedLines) {
                            warnings.push(`${filePath} - Expected ${expectedLines} lines, but got ${actualLines} lines`);
                        }

                        return {
                            path: filePath,
                            actualLines,
                            expectedLines,
                            success: true
                        };
                    }).catch(error => {
                        return {
                            path: filePath,
                            success: false,
                            error: error.message
                        };
                    })
                );
            }

            // Wait for all write operations to complete
            const writeResults = await Promise.all(writeOperations);

            // Check for failed operations
            const failures = writeResults.filter(result => !result.success);
            if (failures.length > 0) {
                const errorMessages = failures.map(f => `${f.path}: ${f.error}`);
                throw new Error(`Failed to write ${failures.length} file(s): ${errorMessages.join(', ')}`);
            }

            // Build success message
            const successResults = writeResults.filter(result => result.success);
            const totalFiles = successResults.length;
            const totalLines = successResults.reduce((sum, result) => sum + result.actualLines, 0);

            let message;
            if (totalFiles === 1) {
                const result = successResults[0];
                message = `File written successfully: ${result.path} (${result.actualLines} lines)`;
            } else {
                message = `Successfully wrote ${totalFiles} files (${totalLines} total lines):\n` +
                    successResults.map(result =>
                        `  - ${result.path} (${result.actualLines} lines)`
                    ).join('\n');
            }

            // Add warnings to the message if any
            if (warnings.length > 0) {
                message += '\n\nWarnings:\n' + warnings.map(w => `  ⚠️  ${w}`).join('\n');
            }

            return FileUtils.createResponse(message);

        } catch (error) {
            throw new Error(`Failed to write file(s): ${error.message}`);
        }
    }
}