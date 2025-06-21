import { ApplyDiffHandler } from '../src/handlers/applyDiff.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * ApplyDiffHandler test class
 * Test precise find and replace functionality
 */
describe('ApplyDiffHandler', () => {

    const testDir = './test_files_diff';
    const testFile1 = join(testDir, 'test1.txt');
    const baseContent = `function example() {
    console.log("Hello World");
    return true;
}

class TestClass {
    constructor() {
        this.value = 42;
    }
}`;

    beforeEach(async () => {
        // Set up test workspace
        FileUtils.setWorkspaceRoot(process.cwd());

        // Create test directory and files
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
        await fs.writeFile(testFile1, baseContent, 'utf8');
    });

    afterEach(async () => {
        // Clean up test files
        try {
            if (existsSync(testFile1)) await fs.unlink(testFile1);
            if (existsSync(testDir)) await fs.rmdir(testDir);
        } catch (error) {
            console.warn('Failed to clean up test files:', error.message);
        }
    });

    describe('Basic Functionality', () => {
        it('should successfully replace matching content', async () => {
            const args = {
                path: testFile1,
                search_content: '    console.log("Hello World");', // with correct indentation
                replace_content: '    console.log("Hello Universe");',
                start_line: 2
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));
            assert.ok(result.content[0].text.includes('Replaced 1 line(s)'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('console.log("Hello Universe");'));
            assert.ok(!content.includes('console.log("Hello World");'));
        });

        it('should successfully replace multi-line content', async () => {
            const searchContent = `class TestClass {
    constructor() {
        this.value = 42;
    }
}`;
            const replaceContent = `class TestClass {
    constructor(value = 0) {
        this.value = value;
        this.name = "test";
    }
    
    getValue() {
        return this.value;
    }
}`;

            const args = {
                path: testFile1,
                search_content: searchContent,
                replace_content: replaceContent,
                start_line: 6
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text'); assert.ok(result.content[0].text.includes('Successfully applied diff'));
            assert.ok(result.content[0].text.includes('added 5 line(s)')); // Corrected expectation

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('this.name = "test";'));
            assert.ok(content.includes('getValue()'));
        });

        it('should handle line deletions', async () => {
            const searchContent = `function example() {
    console.log("Hello World");
    return true;
}`;
            const replaceContent = `function example() {
    return true;
}`;

            const args = {
                path: testFile1,
                search_content: searchContent,
                replace_content: replaceContent,
                start_line: 1
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));
            assert.ok(result.content[0].text.includes('removed 1 line(s)'));

            // Verify file content
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(!content.includes('console.log("Hello World");'));
            assert.ok(content.includes('return true;'));
        });

    });

    describe('Error Handling', () => {

        it('should return an error when the file does not exist', async () => {
            const args = {
                path: './nonexistent.txt',
                search_content: 'some content',
                replace_content: 'new content',
                start_line: 1
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: File not found'));
                    return true;
                },
                'should throw an error when the file does not exist'
            );
        });

        it('should return an error for an invalid start line number', async () => {
            const args = {
                path: testFile1,
                search_content: 'some content',
                replace_content: 'new content',
                start_line: 0
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Invalid start_line'));
                    return true;
                },
                'should throw an error for an invalid start line number'
            );
        });

        it('should return an error when the start line is out of bounds', async () => {
            const args = {
                path: testFile1,
                search_content: 'some content',
                replace_content: 'new content',
                start_line: 100
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('exceeds file length'));
                    return true;
                },
                'should throw an error when the start line is out of bounds'
            );
        });

        it('should return an error when search content exceeds file bounds', async () => {
            const longSearchContent = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
            const args = {
                path: testFile1,
                search_content: longSearchContent,
                replace_content: 'replacement',
                start_line: 5
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('extends beyond file length'));
                    return true;
                },
                'should throw an error when search content exceeds file bounds'
            );
        });

        it('should return an error for content mismatch', async () => {
            const args = {
                path: testFile1,
                search_content: 'this content does not exist in file',
                replace_content: 'new content',
                start_line: 2
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    assert.ok(result.content[0].text.includes('Expected content:'));
                    assert.ok(result.content[0].text.includes('Actual content:'));
                    return true;
                },
                'should throw an error for content mismatch'
            );
        });

        it('should return an error for partial but not exact match', async () => {
            const args = {
                path: testFile1,
                search_content: 'console.log("Hello World!");}', // Extra exclamation mark and closing brace
                replace_content: 'new content',
                start_line: 2
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    return true;
                },
                'should throw an error for partial but not exact match'
            );
        });

    });

    describe('Exact Matching', () => {

        it('should require exact match including whitespace and indentation', async () => {
            const args = {
                path: testFile1,
                search_content: 'console.log("Hello World");', // Missing leading spaces
                replace_content: 'console.log("Hello Universe");',
                start_line: 2
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    return true;
                },
                'should throw an error for non-exact match'
            );
        });

        it('should successfully match content with correct indentation', async () => {
            const args = {
                path: testFile1,
                search_content: '    console.log("Hello World");', // with correct indentation
                replace_content: '    console.log("Hello Universe");',
                start_line: 2
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));
        });

        it('should be case-sensitive', async () => {
            const args = {
                path: testFile1,
                search_content: '    Console.log("Hello World");', // Capital 'C' in Console
                replace_content: 'new content',
                start_line: 2
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    return true;
                },
                'should throw an error for case mismatch'
            );
        });

    });

    describe('Batch Operations and New Error Formatting', () => {

        it('should return detailed error info in atomic mode', async () => {
            const args = {
                path: testFile1,
                search_content: [
                    '    console.log("Hello World");',
                    'this does not exist',
                    '    }'
                ],
                replace_content: [
                    '    console.log("Hello Universe");',
                    'replacement content',
                    '        this.updated = true;\n    }'
                ],
                start_line: [2, 3, 9],
                atomic: true
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Atomic operation failed'));
                    assert.ok(result.content[0].text.includes('Detailed results:'));
                    assert.ok(result.content[0].text.includes('Diff 1:'));
                    assert.ok(result.content[0].text.includes('Diff 2:'));
                    assert.ok(result.content[0].text.includes('Diff 3:'));
                    assert.ok(result.content[0].text.includes('Status: fail'));
                    assert.ok(result.content[0].text.includes('Status: aborted'));
                    return true;
                },
                'should throw detailed error on failure in atomic mode'
            );
        });

        it('should provide detailed partial success results in non-atomic mode', async () => {
            const args = {
                path: testFile1,
                search_content: [
                    '    console.log("Hello World");',
                    'this does not exist',
                    '    }'
                ],
                replace_content: [
                    '    console.log("Hello Universe");',
                    'replacement content',
                    '        this.updated = true;\n    }'
                ],
                start_line: [2, 3, 9],
                atomic: false
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Batch diff operation (non-atomic) completed'));
            assert.ok(result.content[0].text.includes('2/3 diffs applied successfully'));
            assert.ok(result.content[0].text.includes('(1 failed)'));
            assert.ok(result.content[0].text.includes('Detailed results:'));
            assert.ok(result.content[0].text.includes('Status: success'));
            assert.ok(result.content[0].text.includes('Status: fail'));
            // check for diff results
            assert.ok(result.content[0].text.includes('Diff 1:')); // Check for results info
            assert.ok(result.content[0].text.includes('Diff 2:'));
            assert.ok(result.content[0].text.includes('Diff 3:'));

            // Verify partial file content update
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('console.log("Hello Universe");'));
            assert.ok(content.includes('this.updated = true;'));
        });

        it('should provide concise error for single diff failure', async () => {
            const args = {
                path: testFile1,
                search_content: 'nonexistent content',
                replace_content: 'new content',
                start_line: 2
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed:'));
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    assert.ok(result.content[0].text.includes('Expected content:'));
                    assert.ok(result.content[0].text.includes('Actual content:'));
                    assert.ok(result.content[0].text.includes('2 |'));
                    return true;
                },
                'should throw concise error for single diff failure'
            );
        });

        it('should display formatted line numbers and content', async () => {
            const args = {
                path: testFile1,
                search_content: 'wrong content at line 2',
                replace_content: 'new content',
                start_line: 2
            };
            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    const errorText = result.content[0].text;
                    assert.ok(errorText.includes('2 |'));
                    assert.ok(errorText.includes('Expected content:'));
                    assert.ok(errorText.includes('Actual content:'));
                    assert.ok(errorText.includes('This is diff #1 in the batch'));
                    return true;
                },
                'should throw on formatted line number and content error'
            );
        });

    });

    describe('Edge Cases', () => {

        it('should handle single-line files', async () => {
            const singleLineFile = join(testDir, 'single.txt');
            await fs.writeFile(singleLineFile, 'single line content', 'utf8');

            const args = {
                path: singleLineFile,
                search_content: 'single line content',
                replace_content: 'replaced single line',
                start_line: 1
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify content
            const content = await fs.readFile(singleLineFile, 'utf8');
            assert.strictEqual(content, 'replaced single line');

            await fs.unlink(singleLineFile);
        });

        it('should handle empty line replacement', async () => {
            const fileWithEmptyLines = join(testDir, 'empty_lines.txt');
            const contentWithEmpty = 'Line 1\n\nLine 3\n';
            await fs.writeFile(fileWithEmptyLines, contentWithEmpty, 'utf8');

            const args = {
                path: fileWithEmptyLines,
                search_content: '', // empty line
                replace_content: 'Now not empty',
                start_line: 2
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify content
            const content = await fs.readFile(fileWithEmptyLines, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[1], 'Now not empty');

            await fs.unlink(fileWithEmptyLines);
        });

        it('should handle content with special characters', async () => {
            const specialContent = `function special() {
    const regex = /[áéíóú\\s@#$%^&*()]/g;
    console.log("Special: 中文测试");
    return regex.test("test");
}`;

            const specialFile = join(testDir, 'special.txt');
            await fs.writeFile(specialFile, specialContent, 'utf8');

            const args = {
                path: specialFile,
                search_content: '    const regex = /[áéíóú\\s@#$%^&*()]/g;',
                replace_content: '    const regex = /[a-zA-Z0-9]/g;',
                start_line: 2
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify special characters are handled correctly
            const content = await fs.readFile(specialFile, 'utf8');
            assert.ok(content.includes('/[a-zA-Z0-9]/g;'));
            assert.ok(!content.includes('/[áéíóú\\s@#$%^&*()]/g;'));

            await fs.unlink(specialFile);
        });

        it('should handle replacement at the end of the file', async () => {
            const args = {
                path: testFile1,
                search_content: '    }',
                replace_content: '        this.created = new Date();\n    }',
                start_line: 9 // last line
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));
            assert.ok(result.content[0].text.includes('added 1 line(s)'));

            // Verify content
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('this.created = new Date();'));
        });

    });

    describe('Trim Option Functionality', () => {

        it('should successfully match content with trim enabled when whitespace differs', async () => {
            const args = {
                path: testFile1,
                search_content: 'console.log("Hello World");', // Missing leading spaces
                replace_content: '    console.log("Hello Universe");', // With correct indentation in replacement
                start_line: 2,
                trim: true
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify replacement content is inserted exactly as provided
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('console.log("Hello Universe");'));
            assert.ok(!content.includes('console.log("Hello World");'));
        });

        it('should handle multi-line content with trim option', async () => {
            const searchContent = `class TestClass {
constructor() {
this.value = 42;
}
}`; // No proper indentation
            const replaceContent = `class TestClass {
    constructor(value = 0) {
        this.value = value;
        this.name = "test";
    }
}`; // Proper indentation in replacement

            const args = {
                path: testFile1,
                search_content: searchContent,
                replace_content: replaceContent,
                start_line: 6,
                trim: true
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify replacement content maintains its indentation
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('    constructor(value = 0) {'));
            assert.ok(content.includes('        this.name = "test";'));
        });

        it('should fail when content does not match even with trim enabled', async () => {
            const args = {
                path: testFile1,
                search_content: 'completely different content',
                replace_content: 'new content',
                start_line: 2,
                trim: true
            };

            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.strictEqual(result.content[0].type, 'text');
                    assert.ok(result.content[0].text.includes('Error: Single diff failed'));
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    return true;
                },
                'should throw an error when content does not match even with trim'
            );
        });

        it('should display original untrimmed content in error messages', async () => {
            const args = {
                path: testFile1,
                search_content: 'wrong content',
                replace_content: 'new content',
                start_line: 2,
                trim: true
            };

            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    const errorText = result.content[0].text;

                    // Error message should show original content with whitespace
                    assert.ok(errorText.includes('Expected content:'));
                    assert.ok(errorText.includes('Actual content:'));
                    assert.ok(errorText.includes('2 |     console.log("Hello World");')); // Original with spaces
                    return true;
                },
                'should show original untrimmed content in error messages'
            );
        });

        it('should work with trailing whitespace differences when trim is enabled', async () => {
            // Create a test file with trailing spaces
            const contentWithTrailing = `function example() {
    console.log("Hello World");   
    return true;
}

class TestClass {
    constructor() {
        this.value = 42;
    }
}`;
            const trailingSpaceFile = join(testDir, 'trailing.txt');
            await fs.writeFile(trailingSpaceFile, contentWithTrailing, 'utf8');

            const args = {
                path: trailingSpaceFile,
                search_content: '    console.log("Hello World");', // No trailing spaces
                replace_content: '    console.log("Hello Universe");',
                start_line: 2,
                trim: true
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            await fs.unlink(trailingSpaceFile);
        });

        it('should maintain exact replacement content formatting regardless of trim setting', async () => {
            const args = {
                path: testFile1,
                search_content: 'console.log("Hello World");', // No leading spaces
                replace_content: '        console.log("Hello Universe");    ', // Extra indentation and trailing spaces
                start_line: 2,
                trim: true
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify replacement content is inserted exactly as provided, including extra spaces
            const content = await fs.readFile(testFile1, 'utf8');
            const lines = content.split('\n');
            assert.ok(lines[1].includes('        console.log("Hello Universe");    '));
        });

        it('should default to trim: false when not specified', async () => {
            // This should fail because trim defaults to false and spaces don't match
            const args = {
                path: testFile1,
                search_content: 'console.log("Hello World");', // Missing leading spaces
                replace_content: 'console.log("Hello Universe");',
                start_line: 2
                // trim not specified, should default to false
            };

            await assert.rejects(
                async () => await ApplyDiffHandler.handle(args),
                (error) => {
                    const result = FileUtils.createErrorResponse(error.message);
                    assert.strictEqual(result.isError, true);
                    assert.ok(result.content[0].text.includes('Content mismatch'));
                    return true;
                },
                'should fail with default trim: false when whitespace does not match'
            );
        });

        it('should handle empty lines correctly with trim option', async () => {
            const fileWithEmptyLines = join(testDir, 'empty_trim.txt');
            const contentWithEmpty = 'Line 1\n   \nLine 3\n'; // Middle line has spaces
            await fs.writeFile(fileWithEmptyLines, contentWithEmpty, 'utf8');

            const args = {
                path: fileWithEmptyLines,
                search_content: '', // Empty string should match trimmed spaces
                replace_content: 'Not empty anymore',
                start_line: 2,
                trim: true
            };

            const result = await ApplyDiffHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully applied diff'));

            // Verify content
            const content = await fs.readFile(fileWithEmptyLines, 'utf8');
            const lines = content.split('\n');
            assert.strictEqual(lines[1], 'Not empty anymore');

            await fs.unlink(fileWithEmptyLines);
        });

    });

});
