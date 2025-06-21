import { FileUtils } from '../utils/fileUtils.js';

/**
 * search_and_replace tool handler
 */
export class SearchAndReplaceHandler {

    /**
     * Handle search_and_replace request
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const {
            path,
            search,
            replace,
            use_regex = false,
            ignore_case = false,
            start_line = null,
            end_line = null
        } = args;

        try {
            // Check if file exists
            if (!FileUtils.fileExists(path)) {
                throw new Error(`File not found: ${path}`);
            }

            // Read file content
            const content = await FileUtils.readFile(path);
            const lines = content.split('\n');            // Determine search range
            const startIdx = start_line !== null ? Math.max(0, start_line - 1) : 0;
            const endIdx = end_line !== null ? Math.min(lines.length, end_line) : lines.length;            // Validate search string
            if (!search) {
                // Empty search string, do not perform any replacement
                let message = `Successfully replaced 0 occurrence(s) in ${path}`;
                if (start_line || end_line) {
                    const rangeDesc = start_line && end_line
                        ? `lines ${start_line}-${end_line}`
                        : start_line
                            ? `from line ${start_line}`
                            : `up to line ${end_line}`;
                    message += ` (${rangeDesc})`;
                }
                return FileUtils.createResponse(message);
            }
            if (start_line !== null && start_line < 1) {
                throw new Error(`Invalid start_line: ${start_line}. Line numbers start from 1.`);
            }
            if (end_line !== null && end_line < 1) {
                throw new Error(`Invalid end_line: ${end_line}. Line numbers start from 1.`);
            } if (start_line !== null && end_line !== null && start_line > end_line) {
                throw new Error(`start_line (${start_line}) cannot be greater than end_line (${end_line})`);
            }
            if (start_line !== null && start_line > lines.length) {
                throw new Error(`start_line (${start_line}) exceeds file length (${lines.length} lines)`);
            }

            // Perform search and replace
            let replacementCount = 0;
            const searchLines = lines.slice(startIdx, endIdx);
            const beforeLines = lines.slice(0, startIdx);
            const afterLines = lines.slice(endIdx);

            const processedLines = searchLines.map(line => {
                let newLine;

                if (use_regex) {
                    try {
                        // Build regex flags
                        let flags = 'g';
                        if (ignore_case) {
                            flags += 'i';
                        }

                        const regex = new RegExp(search, flags);
                        const matches = line.match(regex);
                        if (matches) {
                            replacementCount += matches.length;
                        }
                        newLine = line.replace(regex, replace);
                    } catch (error) {
                        throw new Error(`Invalid regular expression: ${search}. ${error.message}`);
                    }
                } else {
                    // Simple string replacement
                    if (ignore_case) {
                        // Case-insensitive string replacement
                        const searchLower = search.toLowerCase();
                        const lineLower = line.toLowerCase();

                        // Count occurrences
                        const occurrences = SearchAndReplaceHandler.countOccurrencesCaseInsensitive(line, search);
                        replacementCount += occurrences;

                        // Perform replacement
                        newLine = SearchAndReplaceHandler.replaceAllCaseInsensitive(line, search, replace);
                    } else {
                        // Case-sensitive string replacement
                        const occurrences = SearchAndReplaceHandler.countOccurrences(line, search);
                        replacementCount += occurrences;
                        newLine = line.split(search).join(replace);
                    }
                }

                return newLine;
            });

            // Rebuild file content
            const newContent = [...beforeLines, ...processedLines, ...afterLines].join('\n');

            // Write back to file
            await FileUtils.writeFile(path, newContent);

            // Build response message
            let message = `Successfully replaced ${replacementCount} occurrence(s) in ${path}`;

            if (start_line || end_line) {
                const rangeDesc = start_line && end_line
                    ? `lines ${start_line}-${end_line}`
                    : start_line
                        ? `from line ${start_line}`
                        : `up to line ${end_line}`;
                message += ` (${rangeDesc})`;
            }

            if (use_regex) {
                message += ` using regex pattern`;
            }

            if (ignore_case) {
                message += ` (case-insensitive)`;
            }

            return FileUtils.createResponse(message);

        } catch (error) {
            throw new Error(`Failed to search and replace: ${error.message}`);
        }
    }

    /**
     * Count occurrences of a substring in a string
     * @param {string} text - Main string
     * @param {string} searchText - Substring to search for
     * @returns {number} Number of occurrences
     */
    static countOccurrences(text, searchText) {
        if (!searchText) return 0;
        return text.split(searchText).length - 1;
    }

    /**
     * Count occurrences of a substring in a string (case-insensitive)
     * @param {string} text - Main string
     * @param {string} searchText - Substring to search for
     * @returns {number} Number of occurrences
     */
    static countOccurrencesCaseInsensitive(text, searchText) {
        if (!searchText) return 0;
        const textLower = text.toLowerCase();
        const searchLower = searchText.toLowerCase();
        return textLower.split(searchLower).length - 1;
    }    /**
     * Case-insensitive string replacement
     * @param {string} text - Main string
     * @param {string} searchText - Substring to search for
     * @param {string} replaceText - Replacement text
     * @returns {string} Replaced string
     */
    static replaceAllCaseInsensitive(text, searchText, replaceText) {
        if (!searchText) return text;

        const searchLower = searchText.toLowerCase();
        const textLower = text.toLowerCase();

        let result = '';
        let lastIndex = 0;

        let index = textLower.indexOf(searchLower);
        while (index !== -1) {
            // Add part before match
            result += text.slice(lastIndex, index);
            // Add replacement text
            result += replaceText;
            // Update position
            lastIndex = index + searchText.length;
            // Find next match
            index = textLower.indexOf(searchLower, lastIndex);
        }

        // Add remaining part
        result += text.slice(lastIndex);

        return result;
    }
}
