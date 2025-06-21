import { SetWorkspaceHandler } from '../src/handlers/setWorkspace.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * Test suite for SetWorkspaceHandler.
 * Tests the workspace setting functionality.
 */
describe('SetWorkspaceHandler', () => {

    beforeEach(() => {
        // Reset workspace state
        FileUtils.setWorkspaceRoot(process.cwd());
    });

    describe('handle method', () => {
        it('should successfully set the workspace root directory', async () => {
            const testPath = process.cwd(); // Use the current directory, ensure it exists
            const args = { path: testPath };

            const result = await SetWorkspaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully set workspace root to:'));
            assert.ok(result.content[0].text.includes(testPath));
            assert.strictEqual(FileUtils.getWorkspaceRoot(), testPath);
        }); it('should handle Windows path format', async () => {
            if (process.platform !== 'win32') {
                // Skip this test on non-Windows platforms
                console.log('Skipping Windows path format test: not on a Windows platform');
                return;
            }
            const testPath = 'C:\\'; // Use the root directory, usually exists on Windows
            const args = { path: testPath };

            try {
                const result = await SetWorkspaceHandler.handle(args);

                assert.strictEqual(result.content[0].type, 'text');
                assert.ok(result.content[0].text.includes('Successfully set workspace root to:'));
            } catch (error) {
                // If C:\ does not exist (very rare), it should throw a directory not found error
                assert.ok(error.message.includes('Workspace directory does not exist'));
            }
        }); it('should handle relative paths', async () => {
            const testPath = '.'; // Use the current directory
            const args = { path: testPath };

            const result = await SetWorkspaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully set workspace root to:'));
            // Relative paths are resolved to absolute paths
            assert.ok(FileUtils.getWorkspaceRoot().includes(process.cwd()));
        }); it('should throw an error when the directory does not exist', async () => {
            const testPath = './nonexistent/directory';
            const args = { path: testPath };

            try {
                await SetWorkspaceHandler.handle(args);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Workspace directory does not exist'));
            }
        }); it('should throw an error when the path contains a non-existent directory with special characters', async () => {
            const testPath = '/path/with spaces/and-symbols_123';
            const args = { path: testPath };

            try {
                await SetWorkspaceHandler.handle(args);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Workspace directory does not exist'));
            }
        });

        it('should throw an error when the path parameter is missing', async () => {
            const args = {};

            try {
                await SetWorkspaceHandler.handle(args);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Failed to set workspace'));
            }
        });

    });

    describe('Edge cases', () => {

        it('should handle null path', async () => {
            const args = { path: null };

            try {
                await SetWorkspaceHandler.handle(args);
                // If no error is thrown, check the result
                assert.strictEqual(FileUtils.getWorkspaceRoot(), null);
            } catch (error) {
                // If an error is thrown, ensure it is a reasonable error message
                assert.ok(error.message.includes('Failed to set workspace'));
            }
        });

        it('should handle undefined path', async () => {
            const args = { path: undefined };

            try {
                await SetWorkspaceHandler.handle(args);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error.message.includes('Failed to set workspace'));
            }
        });

    });

    describe('Path security tests', () => {
        let testWorkspace;

        beforeEach(async () => {
            testWorkspace = join(tmpdir(), `mcp-security-test-${Date.now()}`);
            await fs.mkdir(testWorkspace, { recursive: true });

            // Create test directory structure
            await fs.mkdir(join(testWorkspace, 'safe'), { recursive: true });
            await fs.mkdir(join(testWorkspace, 'safe', 'nested'), { recursive: true });
            await fs.writeFile(join(testWorkspace, 'safe', 'test.txt'), 'safe content');
            await fs.writeFile(join(testWorkspace, 'safe', 'nested', 'deep.txt'), 'deep content');

            // Create a file outside the workspace
            await fs.writeFile(join(tmpdir(), 'outside.txt'), 'outside content');

            FileUtils.setWorkspaceRoot(testWorkspace);
        });

        after(async () => {
            try {
                await fs.rm(testWorkspace, { recursive: true, force: true });
                await fs.rm(join(tmpdir(), 'outside.txt'), { force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should succeed for normal path access', async () => {
            // Test relative path
            const safePath1 = FileUtils.getSecurePath('safe/test.txt');
            assert.ok(safePath1.includes('test.txt'));

            // Test nested path
            const safePath2 = FileUtils.getSecurePath('safe/nested/deep.txt');
            assert.ok(safePath2.includes('deep.txt'));

            // Test current directory
            const safePath3 = FileUtils.getSecurePath('.');
            assert.strictEqual(safePath3, testWorkspace);
        });

        it('should prevent path traversal attacks', async () => {
            const traversalAttempts = [
                '../outside.txt',                    // Basic traversal
                '../../outside.txt',                 // Deep traversal
                'safe/../../../outside.txt',         // Mixed traversal
                'safe/../../outside.txt',            // Nested traversal
                '/etc/passwd',                       // Absolute path attack (Unix)
            ];
            if (process.platform === 'win32') {
                traversalAttempts.push(
                    'C:\\Windows\\System32\\config\\SAM', // Absolute path attack (Windows)
                    '..\\..\\outside.txt',               // Windows-style traversal
                    'safe\\..\\..\\outside.txt',         // Windows mixed traversal
                );
            }
            for (const maliciousPath of traversalAttempts) {
                await assert.rejects(
                    async () => FileUtils.getSecurePath(maliciousPath),
                    (error) => {
                        return error.message.includes('Access denied') ||
                            error.message.includes('outside the workspace');
                    },
                    `Path traversal attack should be blocked: ${maliciousPath}`
                );
            }
        });

        it('should reject dangerous characters', async () => {
            const dangerousInputs = [
                'test\0file.txt',           // Null byte
                'test\x00file.txt',         // Hex null byte
                '',                         // Empty string
                null,                       // Null value
                undefined,                  // Undefined value
                123,                        // Number type
            ];

            for (const dangerousInput of dangerousInputs) {
                await assert.rejects(
                    async () => FileUtils.getSecurePath(dangerousInput),
                    (error) => {
                        return error.message.includes('Invalid file path') ||
                            error.message.includes('null bytes');
                    },
                    `Dangerous input should be rejected: ${dangerousInput}`
                );
            }
        });

        // it('should prevent symlink traversal', async () => {
        //     // Create a symlink pointing outside the workspace
        //     const symlinkPath = join(testWorkspace, 'malicious_link');
        //     const outsidePath = join(tmpdir(), 'outside.txt');
        //
        //     try {
        //         await fs.symlink(outsidePath, symlinkPath);
        //
        //         // Attempt to access the file outside the workspace via the symlink
        //         await assert.rejects(
        //             async () => FileUtils.getSecurePath('malicious_link'),
        //             (error) => error.message.includes('Access denied') ||
        //                 error.message.includes('outside the workspace'),
        //             'Symlink traversal attack should be blocked'
        //         );
        //     } catch (error) {
        //         // Some systems may not support creating symlinks, skip this test
        //         if (error.code === 'EPERM' || error.code === 'ENOENT') {
        //             console.log('Skipping symlink test: system does not support or permission denied');
        //             return;
        //         }
        //         throw error;
        //     }
        // });

        it('should work correctly for workspace validation', async () => {
            // Test invalid workspace settings
            await assert.rejects(
                async () => FileUtils.setWorkspaceRoot(''),
                (error) => error.message.includes('Invalid workspace root'),
                'Empty workspace path should be rejected'
            );

            await assert.rejects(
                async () => FileUtils.setWorkspaceRoot(null),
                (error) => error.message.includes('Invalid workspace root'),
                'Null workspace path should be rejected'
            );

            await assert.rejects(
                async () => FileUtils.setWorkspaceRoot('/nonexistent/directory'),
                (error) => error.message.includes('does not exist'),
                'Non-existent directory should be rejected'
            );

            // Test file as workspace
            const tempFile = join(tmpdir(), `test-file-${Date.now()}.txt`);
            await fs.writeFile(tempFile, 'test');

            try {
                await assert.rejects(
                    async () => FileUtils.setWorkspaceRoot(tempFile),
                    (error) => error.message.includes('not a directory'),
                    'File path as workspace should be rejected'
                );
            } finally {
                await fs.rm(tempFile, { force: true });
            }
        });

        it('should deny access when workspace is not set', async () => {
            // Temporarily clear workspace setting
            const originalWorkspace = FileUtils.WORKSPACE_ROOT;
            FileUtils.WORKSPACE_ROOT = null;

            try {
                await assert.rejects(
                    async () => FileUtils.getSecurePath('test.txt'),
                    (error) => error.message.includes('Workspace not set'),
                    'Access should be denied when workspace is not set'
                );
            } finally {
                // Restore workspace setting
                FileUtils.WORKSPACE_ROOT = originalWorkspace;
            }
        });
    });
});
