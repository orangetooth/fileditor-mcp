import { SearchAndReplaceHandler } from '../src/handlers/searchAndReplace.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * SearchAndReplaceHandler 测试类
 * 测试搜索替换功能
 */
describe('SearchAndReplaceHandler', () => {

    const testDir = './test_files_search';
    const testFile1 = join(testDir, 'test1.txt');
    const baseContent = `Hello World
This is a test file
Hello again
HELLO in uppercase
hello in lowercase
Test pattern: abc123
Another test: ABC456
End of file`;

    beforeEach(async () => {
        // 设置测试工作区
        FileUtils.setWorkspaceRoot(process.cwd());

        // 创建测试目录和文件
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
        await fs.writeFile(testFile1, baseContent, 'utf8');
    });

    afterEach(async () => {
        // 清理测试文件
        try {
            if (existsSync(testFile1)) await fs.unlink(testFile1);
            if (existsSync(testDir)) await fs.rmdir(testDir);
        } catch (error) {
            console.warn('清理测试文件失败:', error.message);
        }
    });

    describe('基本字符串替换', () => {

        it('应该成功替换简单字符串', async () => {
            const args = {
                path: testFile1,
                search: 'Hello',
                replace: 'Hi'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 2 occurrence(s)'));

            // 验证文件内容
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('Hi World'));
            assert.ok(content.includes('Hi again'));
            assert.ok(!content.includes('Hello World'));
            assert.ok(!content.includes('Hello again'));
            // HELLO 和 hello 应该保持不变（大小写敏感）
            assert.ok(content.includes('HELLO in uppercase'));
            assert.ok(content.includes('hello in lowercase'));
        });

        it('应该处理没有匹配的情况', async () => {
            const args = {
                path: testFile1,
                search: 'nonexistent',
                replace: 'replacement'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 0 occurrence(s)'));

            // 文件内容应该保持不变
            const content = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(content, baseContent);
        }); it('应该替换所有匹配的实例', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 2 occurrence(s)'));

            // 验证所有 "test" 都被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('This is a exam file'));
            assert.ok(content.includes('Test pattern')); // "Test" 不应该被替换（大写T）
            assert.ok(content.includes('Another exam'));
            assert.ok(!content.includes('test')); // 小写的test应该都被替换
        });

    });

    describe('大小写不敏感替换', () => {

        it('应该进行大小写不敏感的替换', async () => {
            const args = {
                path: testFile1,
                search: 'hello',
                replace: 'greetings',
                ignore_case: true
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 4 occurrence(s)'));
            assert.ok(result.content[0].text.includes('(case-insensitive)'));

            // 验证所有变体的 hello 都被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('greetings World'));
            assert.ok(content.includes('greetings again'));
            assert.ok(content.includes('greetings in uppercase'));
            assert.ok(content.includes('greetings in lowercase'));
        });

        it('应该保持原始文本的大小写结构', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'EXAM',
                ignore_case: true
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 3 occurrence(s)'));

            // 验证替换但保持原来的位置
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('This is a EXAM file'));
            assert.ok(content.includes('EXAM pattern'));
            assert.ok(content.includes('Another EXAM'));
        });

    });

    describe('正则表达式替换', () => {

        it('应该支持简单正则表达式', async () => {
            const args = {
                path: testFile1,
                search: '\\d+',
                replace: 'NUMBER',
                use_regex: true
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 2 occurrence(s)'));
            assert.ok(result.content[0].text.includes('using regex pattern'));

            // 验证数字被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('abcNUMBER'));
            assert.ok(content.includes('ABCNUMBER'));
            assert.ok(!content.includes('123'));
            assert.ok(!content.includes('456'));
        });

        it('应该支持复杂正则表达式', async () => {
            const args = {
                path: testFile1,
                search: '[A-Z]{3}\\d{3}',
                replace: 'CODE',
                use_regex: true
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));

            // 验证只有 ABC456 被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('Another test: CODE'));
            assert.ok(content.includes('abc123')); // 这个不应该被替换
        });

        it('应该支持正则表达式捕获组', async () => {
            const args = {
                path: testFile1,
                search: '([a-z]+)(\\d+)',
                replace: '$2-$1',
                use_regex: true
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));

            // 验证捕获组替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('Test pattern: 123-abc'));
            assert.ok(!content.includes('abc123'));
        });

        it('应该结合正则表达式和大小写不敏感', async () => {
            const args = {
                path: testFile1,
                search: 'hello',
                replace: 'GREETINGS',
                use_regex: true,
                ignore_case: true
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 4 occurrence(s)'));
            assert.ok(result.content[0].text.includes('using regex pattern'));
            assert.ok(result.content[0].text.includes('(case-insensitive)'));

            // 验证所有 hello 变体被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('GREETINGS World'));
            assert.ok(content.includes('GREETINGS again'));
            assert.ok(content.includes('GREETINGS in uppercase'));
            assert.ok(content.includes('GREETINGS in lowercase'));
        });

        it('应该抛出错误当正则表达式无效时', async () => {
            const args = {
                path: testFile1,
                search: '[invalid regex',
                replace: 'replacement',
                use_regex: true
            };

            await assert.rejects(
                () => SearchAndReplaceHandler.handle(args),
                (error) => error.message.includes('Invalid regular expression')
            );
        });

    });

    describe('行范围限制', () => {
        it('应该只在指定起始行之后替换', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam',
                start_line: 5
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));
            assert.ok(result.content[0].text.includes('(from line 5)'));

            // 验证只有第5行之后的test被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('This is a test file')); // 第2行，不应该被替换
            assert.ok(content.includes('Test pattern')); // 第6行，"Test"不会被替换（大写T）
            assert.ok(content.includes('Another exam')); // 第7行，应该被替换
            assert.ok(content.includes('Another exam')); // 第7行，应该被替换
        });

        it('应该只在指定结束行之前替换', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam',
                end_line: 3
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));
            assert.ok(result.content[0].text.includes('(up to line 3)'));

            // 验证只有前3行的test被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('This is a exam file')); // 第2行，应该被替换
            assert.ok(content.includes('Test pattern')); // 第6行，不应该被替换
            assert.ok(content.includes('Another test')); // 第7行，不应该被替换
        });

        it('应该在指定行范围内替换', async () => {
            const args = {
                path: testFile1,
                search: 'Hello',
                replace: 'Hi',
                start_line: 2,
                end_line: 4
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));
            assert.ok(result.content[0].text.includes('(lines 2-4)'));

            // 验证只有指定范围内的Hello被替换
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('Hello World')); // 第1行，不应该被替换
            assert.ok(content.includes('Hi again')); // 第3行，应该被替换
        });

        it('应该抛出错误当起始行号无效时', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam',
                start_line: 0
            };

            await assert.rejects(
                () => SearchAndReplaceHandler.handle(args),
                (error) => error.message.includes('Invalid start_line')
            );
        });

        it('应该抛出错误当结束行号无效时', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam',
                end_line: 0
            };

            await assert.rejects(
                () => SearchAndReplaceHandler.handle(args),
                (error) => error.message.includes('Invalid end_line')
            );
        });

        it('应该抛出错误当起始行大于结束行时', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam',
                start_line: 5,
                end_line: 3
            };

            await assert.rejects(
                () => SearchAndReplaceHandler.handle(args),
                (error) => error.message.includes('cannot be greater than end_line')
            );
        });

        it('应该抛出错误当起始行超出文件范围时', async () => {
            const args = {
                path: testFile1,
                search: 'test',
                replace: 'exam',
                start_line: 100
            };

            await assert.rejects(
                () => SearchAndReplaceHandler.handle(args),
                (error) => error.message.includes('exceeds file length')
            );
        });

    });

    describe('错误处理', () => {

        it('应该抛出错误当文件不存在时', async () => {
            const args = {
                path: './nonexistent.txt',
                search: 'test',
                replace: 'exam'
            };

            await assert.rejects(
                () => SearchAndReplaceHandler.handle(args),
                (error) => error.message.includes('File not found')
            );
        });

    });

    describe('边界情况', () => {

        it('应该处理空搜索字符串', async () => {
            const args = {
                path: testFile1,
                search: '',
                replace: 'X'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 0 occurrence(s)'));

            // 文件应该保持不变
            const content = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(content, baseContent);
        });

        it('应该处理空替换字符串（删除）', async () => {
            const args = {
                path: testFile1,
                search: 'Hello ',
                replace: ''
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 2 occurrence(s)'));

            // 验证 "Hello " 被删除
            const content = await fs.readFile(testFile1, 'utf8');
            assert.ok(content.includes('World\n')); // "Hello " 被删除，只剩 "World"
            assert.ok(content.includes('again\n')); // "Hello " 被删除，只剩 "again"
        });

        it('应该处理包含特殊字符的搜索和替换', async () => {
            const specialFile = join(testDir, 'special.txt');
            const specialContent = 'Price: $100\nRegex: /test/g\nEmail: test@example.com';
            await fs.writeFile(specialFile, specialContent, 'utf8');

            const args = {
                path: specialFile,
                search: '$100',
                replace: '€85'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));

            // 验证特殊字符被正确处理
            const content = await fs.readFile(specialFile, 'utf8');
            assert.ok(content.includes('Price: €85'));
            assert.ok(!content.includes('$100'));

            await fs.unlink(specialFile);
        });

        it('应该处理单行文件', async () => {
            const singleLineFile = join(testDir, 'single.txt');
            await fs.writeFile(singleLineFile, 'single line with test content', 'utf8');

            const args = {
                path: singleLineFile,
                search: 'test',
                replace: 'exam'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 1 occurrence(s)'));

            // 验证替换
            const content = await fs.readFile(singleLineFile, 'utf8');
            assert.strictEqual(content, 'single line with exam content');

            await fs.unlink(singleLineFile);
        });

        it('应该处理空文件', async () => {
            const emptyFile = join(testDir, 'empty.txt');
            await fs.writeFile(emptyFile, '', 'utf8');

            const args = {
                path: emptyFile,
                search: 'anything',
                replace: 'something'
            };

            const result = await SearchAndReplaceHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully replaced 0 occurrence(s)'));

            // 文件应该保持为空
            const content = await fs.readFile(emptyFile, 'utf8');
            assert.strictEqual(content, '');

            await fs.unlink(emptyFile);
        });

    });

});
