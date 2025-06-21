#!/usr/bin/env node

/**
 * Main test runner
 * Run all tool handler tests
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { readdir } from 'fs/promises';

class TestRunner {
    constructor() {
        this.testDir = './test';
        this.passedTests = 0;
        this.failedTests = 0;
        this.totalTests = 0;
        this.results = [];
    }    /**
     * Run all test files
     */
    async runAllTests() {
        console.log('🚀 Starting to run all tests...\n'); try {
            // Get all test files
            const testFiles = await this.getTestFiles();

            if (testFiles.length === 0) {
                console.log('❌ No test files found');
                return;
            }

            console.log(`📋 Found ${testFiles.length} test files:\n`); testFiles.forEach(file => console.log(`  - ${file}`));
            console.log('');

            // Run each test file
            for (const testFile of testFiles) {
                await this.runSingleTest(testFile);
            }

            // Print summary
            this.printSummary();

        } catch (error) {
            console.error('❌ Error occurred while running tests:', error.message);
            process.exit(1);
        }
    }    /**
     * Get all test files
     */
    async getTestFiles() {
        try {
            const files = await readdir(this.testDir);
            return files
                .filter(file => file.endsWith('.test.js'))
                .sort();
        } catch (error) {
            console.error('❌ Unable to read test directory:', error.message);
            return [];
        }
    }    /**
     * Run single test file
     */
    async runSingleTest(testFile) {
        const testPath = join(this.testDir, testFile);
        const testName = testFile.replace('.test.js', '');

        console.log(`🧪 Running test: ${testName}`);

        return new Promise((resolve) => {
            const startTime = Date.now();

            const child = spawn('node', ['--test', testPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: process.platform === 'win32'
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                const result = {
                    name: testName,
                    file: testFile,
                    success: code === 0,
                    duration,
                    stdout,
                    stderr
                };

                this.processTestResult(result);
                resolve();
            });

            child.on('error', (error) => {
                const duration = Date.now() - startTime;
                const result = {
                    name: testName,
                    file: testFile,
                    success: false,
                    duration,
                    stdout: '',
                    stderr: error.message
                };

                this.processTestResult(result);
                resolve();
            });
        });
    }    /**
     * Process test result
     */
    processTestResult(result) {
        this.results.push(result); if (result.success) {
            console.log(`  ✅ ${result.name} - Passed (${result.duration}ms)`);
            this.passedTests++;
        } else {
            console.log(`  ❌ ${result.name} - Failed (${result.duration}ms)`);
            this.failedTests++;

            // Show error information
            if (result.stderr) {
                console.log(`     Error: ${result.stderr.split('\n')[0]}`);
            }
        }

        this.totalTests++;
        console.log('');
    }    /**
     * Print test summary
     */
    printSummary() {
        console.log('📊 Test Summary');
        console.log('='.repeat(50));
        console.log(`Total tests: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests}`);
        console.log(`Success rate: ${this.totalTests > 0 ? (this.passedTests / this.totalTests * 100).toFixed(2) : 0}%`);

        if (this.failedTests > 0) {
            console.log('\n❌ Failed tests:');
            this.results
                .filter(r => !r.success)
                .forEach(result => {
                    console.log(`  - ${result.name}`);
                    if (result.stderr) {
                        console.log(`    ${result.stderr.split('\n')[0]}`);
                    }
                });
        }

        console.log('\n⏱️  Performance statistics:');
        const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
        console.log(`Total time: ${totalDuration}ms`);
        console.log(`Average time: ${this.totalTests > 0 ? (totalDuration / this.totalTests).toFixed(2) : 0}ms`);        // Sort by duration to show slowest tests
        const slowestTests = [...this.results]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 3);

        if (slowestTests.length > 0) {
            console.log('\n🐌 Slowest tests:');
            slowestTests.forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.name} - ${result.duration}ms`);
            });
        }

        console.log('='.repeat(50));

        if (this.failedTests === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log(`⚠️  ${this.failedTests} test(s) failed`);
            process.exit(1);
        }
    }    /**
     * Run specific test file
     */
    async runSpecificTest(testName) {
        const testFile = testName.endsWith('.test.js') ? testName : `${testName}.test.js`;
        const testFiles = await this.getTestFiles(); if (!testFiles.includes(testFile)) {
            console.log(`❌ Test file not found: ${testFile}`);
            console.log('Available test files:');
            testFiles.forEach(file => console.log(`  - ${file}`));
            return;
        }

        console.log(`🧪 Running specific test: ${testFile}\n`);
        await this.runSingleTest(testFile);
        this.printSummary();
    }
}

// Main function
async function main() {
    const runner = new TestRunner();

    // Check command line arguments
    const args = process.argv.slice(2);

    if (args.length > 0) {
        // Run specific test
        const testName = args[0];
        await runner.runSpecificTest(testName);
    } else {
        // Run all tests
        await runner.runAllTests();
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled promise rejection:', reason);
    process.exit(1);
});

// Run main function
main().catch(error => {
    console.error('❌ Failed to run tests:', error.message);
    process.exit(1);
});
