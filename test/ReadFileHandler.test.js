import { ReadFileHandler } from '../src/handlers/readFile.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Test suite for ReadFileHandler.
 * Tests the file reading functionality.
 */
describe('ReadFileHandler', () => {

    const testDir = './test_files_read';
    const testFile1 = join(testDir, 'test1.txt');
    const testFile2 = join(testDir, 'test2.txt');
    const testContent1 = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    const testContent2 = 'File 2 Line 1\nFile 2 Line 2\nFile 2 Line 3';

    beforeEach(async () => {
        // Set up test workspace
        FileUtils.setWorkspaceRoot(process.cwd());

        // Create test directory and files
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
        await fs.writeFile(testFile1, testContent1, 'utf8');
        await fs.writeFile(testFile2, testContent2, 'utf8');
    });

    afterEach(async () => {
        // Clean up test files
        try {
            if (existsSync(testFile1)) await fs.unlink(testFile1);
            if (existsSync(testFile2)) await fs.unlink(testFile2);
            if (existsSync(testDir)) await fs.rmdir(testDir);
        } catch (error) {
            console.warn('Failed to clean up test files:', error.message);
        }
    });

    describe('Single file reading', () => {

        it('should successfully read a complete file', async () => {
            const args = { path: testFile1 };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('1 | Line 1'));
            assert.ok(text.includes('2 | Line 2'));
            assert.ok(text.includes('5 | Line 5'));
        });

        it('should support line range reading', async () => {
            const args = {
                path: testFile1,
                line_range: '2-4'
            };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('2 | Line 2'));
            assert.ok(text.includes('3 | Line 3'));
            assert.ok(text.includes('4 | Line 4'));
            assert.ok(!text.includes('1 | Line 1'));
            assert.ok(!text.includes('5 | Line 5'));
        });

        it('should handle single line range', async () => {
            const args = {
                path: testFile1,
                line_range: '3-3'
            };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('3 | Line 3'));
            assert.ok(!text.includes('2 | Line 2'));
            assert.ok(!text.includes('4 | Line 4'));
        });

        it('should throw an error when the file does not exist', async () => {
            const args = { path: './nonexistent.txt' };

            await assert.rejects(
                () => ReadFileHandler.handle(args),
                (error) => error.message.includes('Failed to read file(s)')
            );
        });

        it('should handle invalid line range format', async () => {
            const args = {
                path: testFile1,
                line_range: 'invalid-range'
            };

            await assert.rejects(
                () => ReadFileHandler.handle(args),
                (error) => error.message.includes('Failed to read file(s)')
            );
        });

    });

    describe('Multiple file reading', () => {

        it('should successfully read multiple files', async () => {
            const args = { path: [testFile1, testFile2] };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('Successfully read 2 file(s)'));
            assert.ok(text.includes(testFile1));
            assert.ok(text.includes(testFile2));
            assert.ok(text.includes('Line 1'));
            assert.ok(text.includes('File 2 Line 1'));
        });

        it('should handle cases where some files do not exist', async () => {
            const args = { path: [testFile1, './nonexistent.txt', testFile2] };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('Successfully read 2 file(s)'));
            assert.ok(text.includes('Errors encountered'));
            assert.ok(text.includes('nonexistent.txt'));
        });

        it('should throw an error when all files do not exist', async () => {
            const args = { path: ['./nonexistent1.txt', './nonexistent2.txt'] };

            await assert.rejects(
                () => ReadFileHandler.handle(args),
                (error) => error.message.includes('Failed to read any files')
            );
        });

        it('should handle an empty file array', async () => {
            const args = { path: [] };

            await assert.rejects(
                () => ReadFileHandler.handle(args),
                (error) => error.message.includes('Failed to read any files')
            );
        });

    });

    describe('Edge cases', () => {

        it('should handle empty files', async () => {
            const emptyFile = join(testDir, 'empty.txt');
            await fs.writeFile(emptyFile, '', 'utf8');

            const args = { path: emptyFile };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            // Empty files should return empty content or just the line number format

            await fs.unlink(emptyFile);
        });

        it('should handle line range reading for large files', async () => {
            const bigContent = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`).join('\n');
            const bigFile = join(testDir, 'big.txt');
            await fs.writeFile(bigFile, bigContent, 'utf8');

            const args = {
                path: bigFile,
                line_range: '500-505'
            };

            const result = await ReadFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('500 | Line 500'));
            assert.ok(text.includes('505 | Line 505'));
            assert.ok(!text.includes('499 | Line 499'));
            assert.ok(!text.includes('506 | Line 506'));

            await fs.unlink(bigFile);
        });

        it('should handle line numbers outside the file range', async () => {
            const args = {
                path: testFile1,
                line_range: '10-20'
            };

            await assert.rejects(
                () => ReadFileHandler.handle(args),
                (error) => error.message.includes('Failed to read file(s)')
            );
        });

    });

});
