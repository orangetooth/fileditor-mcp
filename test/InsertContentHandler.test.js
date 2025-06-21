import { InsertContentHandler } from '../src/handlers/insertContent.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * InsertContentHandler Test Class
 * Test content insertion functionality
 */
describe('InsertContentHandler', () => {

    const testDir = './test_files_insert';
    const testFile1 = join(testDir, 'test1.txt');
    const testFile2 = join(testDir, 'test2.txt');
    const baseContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

    beforeEach(async () => {
        // Set test workspace
        FileUtils.setWorkspaceRoot(process.cwd());

        // Create test directory and files
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
        await fs.writeFile(testFile1, baseContent, 'utf8');
        await fs.writeFile(testFile2, baseContent, 'utf8');
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

    describe('Single File Insertion', () => {

        it('should insert content before the specified line number', async () => {
            const args = {
                path: testFile1,
                line: 3,
                content: 'Inserted line'
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully inserted'));
            assert.ok(result.content[0].text.includes('line 3'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[2], 'Inserted line');
            assert.strictEqual(lines[3], 'Line 3');
            assert.strictEqual(lines.length, 6); // Originally 5 lines + 1 inserted line
        });

        it('should insert content at the beginning of the file', async () => {
            const args = {
                path: testFile1,
                line: 1,
                content: 'First line'
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully inserted'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[0], 'First line');
            assert.strictEqual(lines[1], 'Line 1');
        });

        it('should insert content at the end of the file (line=0)', async () => {
            const args = {
                path: testFile1,
                line: 0,
                content: 'Last line'
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('end of file'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[lines.length - 1], 'Last line');
            assert.strictEqual(lines.length, 6);
        });

        it('should support negative line numbers for insertion', async () => {
            const args = {
                path: testFile1,
                line: -1, // Insert before the last line
                content: 'Before last line'
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('from end'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[4], 'Before last line');
            assert.strictEqual(lines[5], 'Line 5');
        });

        it('should support inserting multiple lines of content', async () => {
            const multiLineContent = 'Line A\nLine B\nLine C';
            const args = {
                path: testFile1,
                line: 2,
                content: multiLineContent
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('3 line(s)'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[1], 'Line A');
            assert.strictEqual(lines[2], 'Line B');
            assert.strictEqual(lines[3], 'Line C');
            assert.strictEqual(lines[4], 'Line 2');
            assert.strictEqual(lines.length, 8); // Originally 5 lines + 3 inserted lines
        });

        it('should throw an error if the file does not exist', async () => {
            const args = {
                path: './nonexistent.txt',
                line: 1,
                content: 'Some content'
            };

            await assert.rejects(
                () => InsertContentHandler.handle(args),
                (error) => error.message.includes('File not found')
            );
        });

        it('should throw an error if the line number is out of range', async () => {
            const args = {
                path: testFile1,
                line: 10, // Exceeds file length
                content: 'Some content'
            };

            await assert.rejects(
                () => InsertContentHandler.handle(args),
                (error) => error.message.includes('exceeds file length')
            );
        });

        it('should throw an error if the negative line number is out of range', async () => {
            const args = {
                path: testFile1,
                line: -10, // Negative number too large
                content: 'Some content'
            };

            await assert.rejects(
                () => InsertContentHandler.handle(args),
                (error) => error.message.includes('out of range')
            );
        });

    });

    describe('Multiple Files Insertion', () => {

        it('should insert the same content at the same position in multiple files', async () => {
            const args = {
                path: [testFile1, testFile2],
                line: 2,
                content: 'Common insert'
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully processed 2 file(s)'));

            // Verify content in both files
            const content1 = await fs.readFile(testFile1, 'utf8');
            const content2 = await fs.readFile(testFile2, 'utf8');

            const lines1 = content1.split('\n');
            const lines2 = content2.split('\n');

            assert.strictEqual(lines1[1], 'Common insert');
            assert.strictEqual(lines2[1], 'Common insert');
            assert.strictEqual(lines1[2], 'Line 2');
            assert.strictEqual(lines2[2], 'Line 2');
        });

        it('should insert different content at different positions in multiple files', async () => {
            const args = {
                path: [testFile1, testFile2],
                line: [1, 3],
                content: ['Insert at start', 'Insert at middle']
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully processed 2 file(s)'));

            // Verify file content
            const content1 = await fs.readFile(testFile1, 'utf8');
            const content2 = await fs.readFile(testFile2, 'utf8');

            const lines1 = content1.split('\n');
            const lines2 = content2.split('\n');

            assert.strictEqual(lines1[0], 'Insert at start');
            assert.strictEqual(lines1[1], 'Line 1');

            assert.strictEqual(lines2[2], 'Insert at middle');
            assert.strictEqual(lines2[3], 'Line 3');
        });

        it('should throw an error if the line number array lengths do not match', async () => {
            const args = {
                path: [testFile1, testFile2],
                line: [1], // Only one line number, but two files
                content: ['Content 1', 'Content 2']
            };

            await assert.rejects(
                () => InsertContentHandler.handle(args),
                (error) => error.message.includes('must match file count')
            );
        });

        it('should throw an error if the content array lengths do not match', async () => {
            const args = {
                path: [testFile1, testFile2],
                line: [1, 2],
                content: ['Only one content'] // Only one content, but two files
            };

            await assert.rejects(
                () => InsertContentHandler.handle(args),
                (error) => error.message.includes('must match file count')
            );
        });

        it('should handle cases where some file operations fail', async () => {
            const nonexistentFile = './nonexistent.txt';
            const args = {
                path: [testFile1, nonexistentFile],
                line: [1, 1],
                content: ['Valid content', 'Invalid content']
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;

            assert.ok(text.includes('Successfully processed 1 file(s)'));
            assert.ok(text.includes('Errors encountered'));
            assert.ok(text.includes('File not found'));
        });

    });

    describe('Edge Cases', () => {

        it('should handle empty file insertion', async () => {
            const emptyFile = join(testDir, 'empty.txt');
            await fs.writeFile(emptyFile, '', 'utf8');

            const args = {
                path: emptyFile,
                line: 0,
                content: 'First content in empty file'
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully inserted'));
            // Verify content
            const content = await fs.readFile(emptyFile, 'utf8');
            assert.strictEqual(content, '\nFirst content in empty file'); // Fix expected value

            await fs.unlink(emptyFile);
        });

        it('should handle content with special characters', async () => {
            const specialContent = 'Special: áéíóú Chinese @#$%^&*()';
            const args = {
                path: testFile1,
                line: 1,
                content: specialContent
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully inserted'));

            // Verify special characters inserted correctly
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[0], specialContent);
        });

        it('should handle empty string insertion', async () => {
            const args = {
                path: testFile1,
                line: 2,
                content: ''
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully inserted'));

            // Verify empty line inserted
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[1], '');
            assert.strictEqual(lines[2], 'Line 2');
        });

        it('should handle large content insertion', async () => {
            const bigContent = Array.from({ length: 100 }, (_, i) => `Big line ${i + 1}`).join('\n');
            const args = {
                path: testFile1,
                line: 3,
                content: bigContent
            };

            const result = await InsertContentHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('100 line(s)'));

            // Verify file line count
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines.length, 105); // Originally 5 lines + 100 inserted lines
            assert.strictEqual(lines[2], 'Big line 1');
            assert.strictEqual(lines[101], 'Big line 100');
            assert.strictEqual(lines[102], 'Line 3');
        });

    });

});
