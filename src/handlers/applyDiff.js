import { FileUtils } from '../utils/fileUtils.js';

/**
 * apply_diffs tool handler
 */
export class ApplyDiffHandler {

    /**
     * Format content with line numbers for error display
     * @param {string} content - Content to format
     * @param {number} startLine - Starting line number
     * @returns {string} Formatted content with line numbers
     */
    static formatContentWithLineNumbers(content, startLine) {
        const lines = content.split('\n');
        return lines.map((line, index) => `${startLine + index} | ${line}`).join('\n');
    }

    /**
     * Validate a single diff operation
     * @param {Object} diff - Diff operation to validate
     * @param {Array} lines - File lines
     * @param {number} lineOffset - Current line offset
     * @param {boolean} trim - Whether to trim whitespace when comparing
     * @returns {Object} Validation result
     */
    static validateDiff(diff, lines, lineOffset, trim = false) {
        const { search_content: searchContent, start_line: originalStartLine, originalIndex } = diff;

        try {
            // Calculate actual start line with offset
            const actualStartLine = originalStartLine + lineOffset;

            // Check if start line number exceeds current file range
            if (actualStartLine > lines.length) {
                throw new Error(`start_line (${originalStartLine} -> ${actualStartLine}) exceeds file length (${lines.length} lines)`);
            }

            // Split search content into line arrays
            const searchLines = searchContent.split('\n');

            // Determine the end line number for search
            const endLine = actualStartLine + searchLines.length - 1;

            // Check if search range exceeds file range
            if (endLine > lines.length) {
                throw new Error(`Search content extends beyond file length. Start line: ${originalStartLine} (actual: ${actualStartLine}), search lines: ${searchLines.length}, file lines: ${lines.length}`);
            }

            // Extract content to match
            const targetLines = lines.slice(actualStartLine - 1, endLine);
            const targetContent = targetLines.join('\n');

            // Prepare content for comparison based on trim setting
            let searchForComparison = searchContent;
            let targetForComparison = targetContent;

            if (trim) {
                // Apply trim to each line and rejoin
                const searchLinesForComparison = searchContent.split('\n').map(line => line.trim());
                const targetLinesForComparison = targetLines.map(line => line.trim());

                searchForComparison = searchLinesForComparison.join('\n');
                targetForComparison = targetLinesForComparison.join('\n');
            }

            // Exact match check (using trimmed or original content based on trim setting)
            if (targetForComparison !== searchForComparison) {
                // Always show original content in error messages for debugging
                const expectedFormatted = this.formatContentWithLineNumbers(searchContent, actualStartLine);
                const actualFormatted = this.formatContentWithLineNumbers(targetContent, actualStartLine);
                const detailedError = `Content mismatch at line ${originalStartLine} (actual: ${actualStartLine}).\n\nExpected content:\n${expectedFormatted}\n\nActual content:\n${actualFormatted}\n\nThis is diff #${originalIndex + 1} in the batch.`;
                throw new Error(detailedError);
            }

            return {
                success: true,
                actualStartLine,
                endLine,
                searchLines
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                originalIndex,
                originalStartLine
            };
        }
    }



    /**
     * Handle apply_diffs request (supports both single diff and batch diffs)
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const { path, search_content, replace_content, start_line, atomic = true, trim = false } = args;

        // Check if file exists
        if (!FileUtils.fileExists(path)) {
            throw new Error(`File not found: ${path}`);
        }

        // Normalize all parameters to arrays
        let searchArray, replaceArray, startLineArray;

        if (Array.isArray(search_content)) {
            searchArray = search_content;
            replaceArray = Array.isArray(replace_content) ? replace_content : [replace_content];
            startLineArray = Array.isArray(start_line) ? start_line : [start_line];
        } else {
            searchArray = [search_content];
            replaceArray = Array.isArray(replace_content) ? replace_content : [replace_content];
            startLineArray = Array.isArray(start_line) ? start_line : [start_line];
        }

        // Validate array lengths match
        if (searchArray.length !== replaceArray.length || searchArray.length !== startLineArray.length) {
            throw new Error("Array lengths for search_content, replace_content, and start_line must match");
        }

        const diffCount = searchArray.length;

        // Validate all start_line values
        for (let i = 0; i < diffCount; i++) {
            if (startLineArray[i] < 1) {
                throw new Error(`Invalid start_line: ${startLineArray[i]} at index ${i}. Line numbers start from 1.`);
            }
        }

        // Create diff objects and sort by start_line
        const diffs = searchArray.map((searchContent, index) => ({
            search_content: searchContent,
            replace_content: replaceArray[index],
            start_line: startLineArray[index],
            originalIndex: index
        })).sort((a, b) => a.start_line - b.start_line);

        // Read file content
        const content = await FileUtils.readFile(path);
        let lines = content.split('\n');
        if (atomic && diffCount > 1) {
            // Atomic mode: validate all diffs first
            let lineOffset = 0;
            const validationErrors = [];
            let tempLines = [...lines]; // Work with a copy for validation

            for (const diff of diffs) {
                const validation = this.validateDiff(diff, tempLines, lineOffset, trim);

                if (!validation.success) {
                    validationErrors.push({
                        index: validation.originalIndex,
                        start_line: validation.originalStartLine,
                        status: "fail",
                        message: validation.error
                    });
                    break; // Stop validation on first error
                } else {
                    // Simulate the replacement to update tempLines and lineOffset
                    const replaceLines = diff.replace_content.split('\n');
                    const actualStartLine = diff.start_line + lineOffset;
                    const endLine = actualStartLine + validation.searchLines.length - 1;

                    const beforeLines = tempLines.slice(0, actualStartLine - 1);
                    const afterLines = tempLines.slice(endLine);
                    tempLines = [...beforeLines, ...replaceLines, ...afterLines];

                    // Update line offset for next validation
                    const lineDiff = replaceLines.length - validation.searchLines.length;
                    lineOffset += lineDiff;
                }
            }

            if (validationErrors.length > 0) {
                // In atomic mode, if any diff fails, abort the entire operation
                const results = new Array(diffCount);
                validationErrors.forEach(error => {
                    results[error.index] = error;
                });

                // Fill in success placeholders for non-failed diffs
                for (let i = 0; i < diffCount; i++) {
                    if (!results[i]) {
                        results[i] = {
                            index: i,
                            start_line: startLineArray[i],
                            status: "aborted",
                            message: "Operation aborted due to validation failures in atomic mode"
                        };
                    }
                }

                // Create detailed error message with formatted content
                let detailedMessage = `Atomic operation failed: ${validationErrors.length}/${diffCount} diffs would fail. No changes applied.\n\n`;
                detailedMessage += "Detailed results:\n";
                results.forEach((result, index) => {
                    detailedMessage += `\nDiff ${index + 1}:\n`;
                    detailedMessage += `  Status: ${result.status}\n`;
                    detailedMessage += `  Start Line: ${result.start_line}\n`;
                    detailedMessage += `  Message: ${result.message}\n`;
                });

                throw new Error(detailedMessage);
            }
        }

        // Track results for each diff
        const results = new Array(diffCount);
        let lineOffset = 0; // Track cumulative line offset
        let appliedCount = 0;

        // Process each diff in order
        for (const diff of diffs) {
            const { search_content: searchContent, replace_content: replaceContent, start_line: originalStartLine, originalIndex } = diff;

            if (!atomic || diffCount === 1) {
                // Non-atomic mode or single diff: validate and apply one by one
                const validation = this.validateDiff(diff, lines, lineOffset, trim);

                if (!validation.success) {
                    results[originalIndex] = {
                        index: originalIndex,
                        start_line: originalStartLine,
                        status: "fail",
                        message: validation.error
                    };
                    continue;
                }
            }

            // Apply the diff
            const actualStartLine = originalStartLine + lineOffset;
            const searchLines = searchContent.split('\n');
            const replaceLines = replaceContent.split('\n');
            const endLine = actualStartLine + searchLines.length - 1;

            // Perform replacement
            const beforeLines = lines.slice(0, actualStartLine - 1);
            const afterLines = lines.slice(endLine);
            lines = [...beforeLines, ...replaceLines, ...afterLines];

            // Update line offset for subsequent diffs
            const lineDiff = replaceLines.length - searchLines.length;
            lineOffset += lineDiff;
            appliedCount++;

            // Record success
            results[originalIndex] = {
                index: originalIndex,
                start_line: originalStartLine,
                status: "success",
                message: `Replaced ${searchLines.length} line(s) at line ${originalStartLine}${lineDiff !== 0 ? ` (${lineDiff > 0 ? 'added' : 'removed'} ${Math.abs(lineDiff)} line(s))` : ''}`
            };
        }

        // Write back to file
        const newContent = lines.join('\n');
        await FileUtils.writeFile(path, newContent);

        // Build response
        const failedCount = diffCount - appliedCount;
        const isBatchMode = diffCount > 1;

        let message;
        if (isBatchMode) {
            const mode = atomic ? "atomic" : "non-atomic";
            message = `Batch diff operation (${mode}) completed: ${appliedCount}/${diffCount} diffs applied successfully to ${path}`;
            if (failedCount > 0) {
                message += ` (${failedCount} failed)`;
            }
            message += `. File now has ${lines.length} lines.\n\n`;

            // Add detailed results for batch mode
            message += "Detailed results:\n";
            results.forEach((result, index) => {
                message += `\nDiff ${index + 1}:\n`;
                message += `  Status: ${result.status}\n`;
                message += `  Start Line: ${result.start_line}\n`;
                message += `  Message: ${result.message}\n`;
            });
        } else {
            // Single mode - maintain original message format
            const result = results[0];
            if (result.status === "success") {
                message = `Successfully applied diff to ${path}: ${result.message}. File now has ${lines.length} lines.`;
            } else {
                throw new Error(`Single diff failed:\n\n${result.message}`);
            }
        }

        // Create success response using FileUtils
        return FileUtils.createResponse(message);
    }
}
