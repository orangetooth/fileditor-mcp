import { FileUtils } from '../utils/fileUtils.js';

/**
 * set_workspace tool handler
 */
export class SetWorkspaceHandler {

    /**
     * Handle set_workspace request
     * @param {Object} args - Request parameters
     * @returns {Promise<Object>} Response result
     */
    static async handle(args) {
        const { path } = args;

        try {
            // Set new workspace root directory
            FileUtils.setWorkspaceRoot(path);

            const message = `Successfully set workspace root to: ${FileUtils.getWorkspaceRoot()}`;
            return FileUtils.createResponse(message);
        } catch (error) {
            throw new Error(`Failed to set workspace: ${error.message}`);
        }
    }
}
