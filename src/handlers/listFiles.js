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
        const {
            path,
            recursive = false,
            show_hidden = false,
            git_filter = 'all'
        } = args;

        try {
            const result = await FileUtils.readDirectoryAdvanced(path, {
                recursive,
                show_hidden,
                git_filter
            });            // Build informative response message
            let message = result.join('\n');

            if (result.length === 0) {
                message = 'No files found matching the specified criteria.';
            } else {
                // Add summary information
                const summary = [];
                if (!show_hidden) {
                    summary.push('hidden files excluded');
                }
                if (git_filter !== 'all') {
                    summary.push(`showing only ${git_filter} files`);
                }
                if (recursive) {
                    summary.push('recursive listing');
                }

                if (summary.length > 0) {
                    message += `\n\n--- Listing options: ${summary.join(', ')} ---`;
                }
            }

            return FileUtils.createResponse(message);
        } catch (error) {
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }
}
