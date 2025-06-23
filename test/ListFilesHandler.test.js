import { ListFilesHandler } from '../src/handlers/listFiles.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Test suite for ListFilesHandler.
 * Tests the file listing functionality.
 */
describe('ListFilesHandler', () => {

    const testDir = './test_files_list';
    const subDir1 = join(testDir, 'subdir1');
    const subDir2 = join(testDir, 'subdir2');
    const file1 = join(testDir, 'file1.txt');
    const file2 = join(testDir, 'file2.js');
    const subFile1 = join(subDir1, 'subfile1.txt');
    const subFile2 = join(subDir2, 'subfile2.md');

    beforeEach(async () => {
        // Set up the test workspace
        FileUtils.setWorkspaceRoot(process.cwd());

        // Create test directory structure
        await fs.mkdir(testDir, { recursive: true });
        await fs.mkdir(subDir1, { recursive: true });
        await fs.mkdir(subDir2, { recursive: true });

        // Create test files
        await fs.writeFile(file1, 'File 1 content', 'utf8');
        await fs.writeFile(file2, 'File 2 content', 'utf8');
        await fs.writeFile(subFile1, 'Sub file 1 content', 'utf8');
        await fs.writeFile(subFile2, 'Sub file 2 content', 'utf8');
    });

    afterEach(async () => {
        // Clean up test files and directories
        try {
            if (existsSync(subFile1)) await fs.unlink(subFile1);
            if (existsSync(subFile2)) await fs.unlink(subFile2);
            if (existsSync(file1)) await fs.unlink(file1);
            if (existsSync(file2)) await fs.unlink(file2);
            if (existsSync(subDir1)) await fs.rmdir(subDir1);
            if (existsSync(subDir2)) await fs.rmdir(subDir2);
            if (existsSync(testDir)) await fs.rmdir(testDir);
        } catch (error) {
            console.warn('Failed to clean up test files:', error.message);
        }
    });

    describe('Non-recursive listing', () => {

        it('should list files and subdirectories in a directory', async () => {
            const args = { path: testDir };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            // Check for files
            assert.ok(text.includes('file: file1.txt'));
            assert.ok(text.includes('file: file2.js'));

            // Check for directories
            assert.ok(text.includes('directory: subdir1'));
            assert.ok(text.includes('directory: subdir2'));

            // Should not include files from subdirectories
            assert.ok(!text.includes('subfile1.txt'));
            assert.ok(!text.includes('subfile2.md'));
        }); it('should handle empty directories', async () => {
            const emptyDir = join(testDir, 'empty');
            await fs.mkdir(emptyDir);

            const args = { path: emptyDir };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.strictEqual(text.trim(), 'No files found matching the specified criteria.');

            await fs.rmdir(emptyDir);
        });

        it('should throw an error when the directory does not exist', async () => {
            const args = { path: './nonexistent_directory' };

            await assert.rejects(
                () => ListFilesHandler.handle(args),
                (error) => error.message.includes('Failed to list files') &&
                    error.message.includes('Directory not found')
            );
        });

    });

    describe('Recursive listing', () => {

        it('should recursively list all files and directories', async () => {
            const args = {
                path: testDir,
                recursive: true
            };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            // Check for root directory files
            assert.ok(text.includes('file: file1.txt'));
            assert.ok(text.includes('file: file2.js'));

            // Check for root directory subdirectories
            assert.ok(text.includes('directory: subdir1'));
            assert.ok(text.includes('directory: subdir2'));

            // Check for files in subdirectories
            assert.ok(text.includes('file: subdir1/subfile1.txt'));
            assert.ok(text.includes('file: subdir2/subfile2.md'));
        });

        it('should handle deeply nested directories', async () => {
            // Create a deeper directory structure
            const deepDir = join(subDir1, 'deep');
            const deeperDir = join(deepDir, 'deeper');
            const deepFile = join(deeperDir, 'deep_file.txt');

            await fs.mkdir(deepDir);
            await fs.mkdir(deeperDir);
            await fs.writeFile(deepFile, 'Deep file content', 'utf8');

            const args = {
                path: testDir,
                recursive: true
            };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            assert.ok(text.includes('directory: subdir1/deep'));
            assert.ok(text.includes('directory: subdir1/deep/deeper'));
            assert.ok(text.includes('file: subdir1/deep/deeper/deep_file.txt'));

            // Clean up deep files
            await fs.unlink(deepFile);
            await fs.rmdir(deeperDir);
            await fs.rmdir(deepDir);
        });

        it('should handle cases with only subdirectories', async () => {
            const onlyDirsPath = join(testDir, 'only_dirs');
            const childDir1 = join(onlyDirsPath, 'child1');
            const childDir2 = join(onlyDirsPath, 'child2');

            await fs.mkdir(onlyDirsPath);
            await fs.mkdir(childDir1);
            await fs.mkdir(childDir2);

            const args = {
                path: onlyDirsPath,
                recursive: true
            };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            assert.ok(text.includes('directory: child1'));
            assert.ok(text.includes('directory: child2'));
            assert.ok(!text.includes('file:'));

            // Cleanup
            await fs.rmdir(childDir1);
            await fs.rmdir(childDir2);
            await fs.rmdir(onlyDirsPath);
        });

    });

    describe('Path handling', () => {

        it('should handle relative paths', async () => {
            const args = { path: './test_files_list' };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('file: file1.txt'));
        });

        it('should handle absolute paths', async () => {
            const absolutePath = join(process.cwd(), testDir);
            const args = { path: absolutePath };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('file: file1.txt'));
        });

        it('should handle special characters in paths', async () => {
            const specialDir = join(testDir, 'special dir with spaces');
            const specialFile = join(specialDir, 'special-file_123.txt');

            await fs.mkdir(specialDir);
            await fs.writeFile(specialFile, 'Special content', 'utf8');

            const args = { path: specialDir };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('file: special-file_123.txt'));

            // Cleanup
            await fs.unlink(specialFile);
            await fs.rmdir(specialDir);
        });

    });

    describe('Edge cases', () => {

        it('should handle directories with a large number of files', async () => {
            const manyFilesDir = join(testDir, 'many_files');
            await fs.mkdir(manyFilesDir);

            // Create 100 files
            const files = [];
            for (let i = 0; i < 100; i++) {
                const file = join(manyFilesDir, `file_${i.toString().padStart(3, '0')}.txt`);
                await fs.writeFile(file, `Content ${i}`, 'utf8');
                files.push(file);
            }

            const args = { path: manyFilesDir };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            // Check if some files exist
            assert.ok(text.includes('file: file_000.txt'));
            assert.ok(text.includes('file: file_050.txt'));
            assert.ok(text.includes('file: file_099.txt'));

            // Clean up files
            for (const file of files) {
                await fs.unlink(file);
            }
            await fs.rmdir(manyFilesDir);
        });

        it('should handle sorting of file and directory names', async () => {
            const sortDir = join(testDir, 'sort_test');
            await fs.mkdir(sortDir);

            // Create some files and directories to test sorting
            await fs.writeFile(join(sortDir, 'z_file.txt'), 'content', 'utf8');
            await fs.writeFile(join(sortDir, 'a_file.txt'), 'content', 'utf8');
            await fs.mkdir(join(sortDir, 'z_dir'));
            await fs.mkdir(join(sortDir, 'a_dir'));

            const args = { path: sortDir };

            const result = await ListFilesHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            // Verify all items are listed
            assert.ok(text.includes('file: a_file.txt'));
            assert.ok(text.includes('file: z_file.txt'));
            assert.ok(text.includes('directory: a_dir'));
            assert.ok(text.includes('directory: z_dir'));

            // Cleanup
            await fs.unlink(join(sortDir, 'z_file.txt'));
            await fs.unlink(join(sortDir, 'a_file.txt'));
            await fs.rmdir(join(sortDir, 'z_dir'));
            await fs.rmdir(join(sortDir, 'a_dir'));
            await fs.rmdir(sortDir);
        });

    });

});
