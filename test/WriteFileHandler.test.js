import { WriteFileHandler } from '../src/handlers/writeFile.js';
import { FileUtils } from '../src/utils/fileUtils.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * WriteFileHandler 测试类
 * 测试文件写入功能
 */
describe('WriteFileHandler', () => {

    const testDir = './test_files_write';
    const testFile1 = join(testDir, 'test1.txt');
    const testFile2 = join(testDir, 'test2.txt');

    beforeEach(async () => {
        // 设置测试工作区
        FileUtils.setWorkspaceRoot(process.cwd());

        // 创建测试目录
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
    });

    afterEach(async () => {
        // 清理测试文件
        try {
            if (existsSync(testFile1)) await fs.unlink(testFile1);
            if (existsSync(testFile2)) await fs.unlink(testFile2);
            if (existsSync(testDir)) await fs.rmdir(testDir);
        } catch (error) {
            console.warn('清理测试文件失败:', error.message);
        }
    });

    describe('单文件写入', () => {

        it('应该成功创建新文件', async () => {
            const content = 'Line 1\nLine 2\nLine 3';
            const args = {
                path: testFile1,
                content: content,
                line_count: 3
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));
            assert.ok(result.content[0].text.includes('3 lines'));

            // 验证文件内容
            const writtenContent = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(writtenContent, content);
        });

        it('应该覆盖现有文件', async () => {
            // 先创建一个文件
            await fs.writeFile(testFile1, 'Old content', 'utf8');

            const newContent = 'New content\nSecond line';
            const args = {
                path: testFile1,
                content: newContent,
                line_count: 2
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));

            // 验证文件内容被覆盖
            const writtenContent = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(writtenContent, newContent);
        });

        it('应该处理空文件写入', async () => {
            const args = {
                path: testFile1,
                content: '',
                line_count: 0
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));

            // 验证文件为空
            const writtenContent = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(writtenContent, '');
        });

        it('应该发出警告当行数不匹配时', async () => {
            const content = 'Line 1\nLine 2\nLine 3';
            const args = {
                path: testFile1,
                content: content,
                line_count: 5 // 错误的行数
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));
            // 注意：警告是通过console.warn输出的，这里检查结果仍然成功
        });

    });

    describe('多文件写入', () => {

        it('应该成功写入多个文件（相同内容）', async () => {
            const content = 'Shared content\nLine 2';
            const args = {
                path: [testFile1, testFile2],
                content: content,
                line_count: 2
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully wrote 2 files'));
            assert.ok(result.content[0].text.includes('4 total lines'));

            // 验证两个文件内容
            const content1 = await fs.readFile(testFile1, 'utf8');
            const content2 = await fs.readFile(testFile2, 'utf8');
            assert.strictEqual(content1, content);
            assert.strictEqual(content2, content);
        });

        it('应该成功写入多个文件（不同内容）', async () => {
            const content1 = 'File 1 content';
            const content2 = 'File 2 content\nSecond line';
            const args = {
                path: [testFile1, testFile2],
                content: [content1, content2],
                line_count: [1, 2]
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('Successfully wrote 2 files'));
            assert.ok(result.content[0].text.includes('3 total lines'));

            // 验证文件内容
            const writtenContent1 = await fs.readFile(testFile1, 'utf8');
            const writtenContent2 = await fs.readFile(testFile2, 'utf8');
            assert.strictEqual(writtenContent1, content1);
            assert.strictEqual(writtenContent2, content2);
        });

        it('应该抛出错误当路径和内容数组长度不匹配时', async () => {
            const args = {
                path: [testFile1, testFile2],
                content: ['Content 1'], // 只有一个内容，但有两个路径
                line_count: [1, 1]
            };

            await assert.rejects(
                () => WriteFileHandler.handle(args),
                (error) => error.message.includes("doesn't match content count")
            );
        });

        it('应该抛出错误当路径和行数数组长度不匹配时', async () => {
            const args = {
                path: [testFile1, testFile2],
                content: ['Content 1', 'Content 2'],
                line_count: [1] // 只有一个行数，但有两个路径
            };

            await assert.rejects(
                () => WriteFileHandler.handle(args),
                (error) => error.message.includes("doesn't match line_count array length")
            );
        });

    });

    describe('错误处理', () => {

        it('应该处理写入失败的情况', async () => {
            // 使用无效路径
            const invalidPath = '/invalid/path/that/does/not/exist/file.txt';
            const args = {
                path: invalidPath,
                content: 'Some content',
                line_count: 1
            };

            await assert.rejects(
                () => WriteFileHandler.handle(args),
                (error) => error.message.includes('Failed to write file(s)')
            );
        });

        it('应该处理部分文件写入失败的情况', async () => {
            const validPath = testFile1;
            const invalidPath = '/invalid/path/file.txt';
            const args = {
                path: [validPath, invalidPath],
                content: ['Valid content', 'Invalid content'],
                line_count: [1, 1]
            };

            await assert.rejects(
                () => WriteFileHandler.handle(args),
                (error) => error.message.includes('Failed to write') &&
                    error.message.includes('file(s)')
            );
        });

    });

    describe('边界情况', () => {

        it('应该处理包含特殊字符的内容', async () => {
            const content = 'Special chars: áéíóú 中文 @#$%^&*()';
            const args = {
                path: testFile1,
                content: content,
                line_count: 1
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));

            // 验证特殊字符被正确写入
            const writtenContent = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(writtenContent, content);
        });

        it('应该处理大文件写入', async () => {
            const bigContent = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`).join('\n');
            const args = {
                path: testFile1,
                content: bigContent,
                line_count: 1000
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));
            assert.ok(result.content[0].text.includes('1000 lines'));

            // 验证大文件内容
            const writtenContent = await fs.readFile(testFile1, 'utf8');
            assert.strictEqual(writtenContent, bigContent);
        });

        it('应该创建不存在的目录', async () => {
            const deepPath = join(testDir, 'deep', 'nested', 'file.txt');
            const args = {
                path: deepPath,
                content: 'Deep file content',
                line_count: 1
            };

            const result = await WriteFileHandler.handle(args);

            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('File written successfully'));

            // 验证文件和目录被创建
            assert.ok(existsSync(deepPath));
            const content = await fs.readFile(deepPath, 'utf8');
            assert.strictEqual(content, 'Deep file content');

            // 清理深层目录
            await fs.unlink(deepPath);
            await fs.rmdir(join(testDir, 'deep', 'nested'));
            await fs.rmdir(join(testDir, 'deep'));
        });

    });

});
