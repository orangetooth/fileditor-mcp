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
            const lines = content.split('\n');

            // Validate line range
            FileUtils.validateLineRange({
                start_line,
                end_line,
                totalLines: lines.length
            });

            // Determine search range
            const startIdx = start_line !== null ? Math.max(0, start_line - 1) : 0;
            const endIdx = end_line !== null ? Math.min(lines.length, end_line) : lines.length;

            // Validate search string
            if (!search) {
                // Empty search string, do not perform any replacement
                const message = SearchAndReplaceHandler._buildResultMessage(path, 0, start_line, end_line, use_regex, ignore_case);
                return FileUtils.createResponse(message);
            }

            // Perform search and replace
            const { processedLines, replacementCount } = SearchAndReplaceHandler._performSearchAndReplace(
                lines.slice(startIdx, endIdx),
                search,
                replace,
                use_regex,
                ignore_case
            );

            // Rebuild file content
            const newContent = [
                ...lines.slice(0, startIdx),
                ...processedLines,
                ...lines.slice(endIdx)
            ].join('\n');

            // Write back to file
            await FileUtils.writeFile(path, newContent);

            // Build response message
            const message = SearchAndReplaceHandler._buildResultMessage(path, replacementCount, start_line, end_line, use_regex, ignore_case);
            return FileUtils.createResponse(message);

        } catch (error) {
            throw new Error(`Failed to search and replace: ${error.message}`);
        }
    }

    /**
     * Perform search and replace operation
     * @param {string[]} lines - Lines to process
     * @param {string} search - Search pattern
     * @param {string} replace - Replacement text
     * @param {boolean} use_regex - Whether to use regex
     * @param {boolean} ignore_case - Whether to ignore case
     * @returns {Object} Processing result
     */
    static _performSearchAndReplace(lines, search, replace, use_regex, ignore_case) {
        let replacementCount = 0;

        const processedLines = lines.map(line => {
            let newLine;

            if (use_regex) {
                const { processedLine, count } = SearchAndReplaceHandler._regexReplace(line, search, replace, ignore_case);
                newLine = processedLine;
                replacementCount += count;
            } else {
                const { processedLine, count } = SearchAndReplaceHandler._stringReplace(line, search, replace, ignore_case);
                newLine = processedLine;
                replacementCount += count;
            }

            return newLine;
        });

        return { processedLines, replacementCount };
    }

    /**
     * Perform regex-based replacement
     * @param {string} line - Line to process
     * @param {string} search - Regex pattern
     * @param {string} replace - Replacement text
     * @param {boolean} ignore_case - Whether to ignore case
     * @returns {Object} Result with processed line and count
     */
    static _regexReplace(line, search, replace, ignore_case) {
        try {
            // Build regex flags
            let flags = 'g';
            if (ignore_case) {
                flags += 'i';
            }

            const regex = new RegExp(search, flags);
            const matches = line.match(regex);
            const count = matches ? matches.length : 0;
            const processedLine = line.replace(regex, replace);

            return { processedLine, count };
        } catch (error) {
            throw new Error(`Invalid regular expression: ${search}. ${error.message}`);
        }
    }

    /**
     * Perform string-based replacement
     * @param {string} line - Line to process
     * @param {string} search - Search string
     * @param {string} replace - Replacement text
     * @param {boolean} ignore_case - Whether to ignore case
     * @returns {Object} Result with processed line and count
     */
    static _stringReplace(line, search, replace, ignore_case) {
        if (ignore_case) {
            // Use regex for case-insensitive string replacement
            const escapedSearch = SearchAndReplaceHandler._escapeRegex(search);
            const regex = new RegExp(escapedSearch, 'gi');
            const matches = line.match(regex);
            const count = matches ? matches.length : 0;
            const processedLine = line.replace(regex, replace);

            return { processedLine, count };
        } else {
            // Case-sensitive string replacement
            const count = SearchAndReplaceHandler._countOccurrences(line, search);
            const processedLine = line.split(search).join(replace);

            return { processedLine, count };
        }
    }

    /**
     * Escape special regex characters in a string
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    static _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Count occurrences of a substring in a string
     * @param {string} text - Main string
     * @param {string} searchText - Substring to search for
     * @returns {number} Number of occurrences
     */
    static _countOccurrences(text, searchText) {
        if (!searchText) return 0;
        return text.split(searchText).length - 1;
    }

    /**
     * Build result message
     * @param {string} path - File path
     * @param {number} replacementCount - Number of replacements
     * @param {number|null} start_line - Start line
     * @param {number|null} end_line - End line  
     * @param {boolean} use_regex - Whether regex was used
     * @param {boolean} ignore_case - Whether case was ignored
     * @returns {string} Result message
     */
    static _buildResultMessage(path, replacementCount, start_line, end_line, use_regex, ignore_case) {
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

        return message;
    }
}
