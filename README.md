# FileEditor MCP Server

[📖 English Interface Doc](docs/MCP-INTERFACE.en.md) | [📖 中文接口文档](docs/MCP-INTERFACE.cn.md) | [📋 中文README](docs/README.cn.md)

**AI-Optimized File Operations Server** - Built on Model Context Protocol, specifically engineered for AI coding assistants to perform sophisticated code editing, refactoring, and batch modification tasks with precision and efficiency.

## 🎯 Design Philosophy 

**Built for AI Programming** - This project is specifically designed for AI models' code editing requirements, providing precise block-level operations, intelligent matching algorithms, and batch processing capabilities that enable AI to safely and efficiently execute complex code modification tasks.

## 🚀 Core Features

### 📁 File Operation Tools (7 Tools)
- **`set_workspace`** - Workspace isolation (must be called first)
- **`read_files`** - Smart file reading (batch, line ranges, with line numbers)
- **`write_files`** - Batch file writing (single/multiple files, create/overwrite)
- **`list_files`** - Directory traversal (recursive support)
- **`insert_contents`** - Precise content insertion (multiple files, negative line numbers, end insertion)
- **`apply_diffs`** - **Advanced diff application** (batch operations, atomic mode, intelligent whitespace handling)
- **`search_and_replace`** - Pattern replacement (regex, line ranges, case-insensitive)

### 🔒 Security Features
- **Workspace Isolation**: Strictly limit operation scope, prevent directory traversal attacks
- **Path Security**: Automatic validation and resolution of relative paths
- **Atomic Operations**: Batch modifications succeed completely or rollback entirely

### ⚡ AI-Optimized Features
- **Batch Processing Engine**: Handle multiple file operations in a single API call
- **Intelligent Matching Algorithm**: `trim` mode handles code formatting differences with high tolerance
- **Detailed Operation Feedback**: Complete success/failure information for AI debugging and decision-making  
- **Non-blocking Error Handling**: Partial failures don't prevent other operations from continuing

## 🛠️ Quick Start

```bash
# Install dependencies
pnpm install

# Start server
pnpm start

# Development mode (auto-restart)
pnpm dev

# Run tests
pnpm test
```

**Requirements**: Node.js ≥18, pnpm

## 💡 Usage Examples

```json
// Scenario 1: Workspace initialization (must be called first)
{
  "name": "set_workspace",
  "arguments": { "path": "/path/to/your/project" }
}

// Scenario 2: Batch code file analysis
{
  "name": "read_files",
  "arguments": { 
    "path": ["src/main.js", "src/utils.js", "package.json"],
    "line_range": "1-50"  // Optional: read only first 50 lines
  }
}

// Scenario 3: Intelligent code refactoring (tolerates whitespace differences)
{
  "name": "apply_diffs",
  "arguments": {
    "path": "src/config.js",
    "search_content": [
      "const API_URL = 'localhost';",
      "const PORT = 3000;"
    ],
    "replace_content": [
      "const API_URL = process.env.API_URL || 'localhost';",
      "const PORT = process.env.PORT || 3000;"
    ],
    "start_line": [5, 7],
    "atomic": true,      // Atomic mode: all succeed or all rollback
    "trim": true         // Smart mode: ignore whitespace differences
  }
}
```

## 🏗️ Architecture Design

```
src/
├── index.js              # Application entry
├── server.js              # MCP server main class
├── tools/
│   └── toolDefinitions.js # Tool definitions and schema
├── handlers/              # Tool handlers
│   ├── applyDiff.js       # apply_diffs (batch + atomic support)
│   ├── readFile.js        # read_files
│   ├── writeFile.js       # write_files 
│   ├── listFiles.js       # list_files
│   ├── insertContent.js   # insert_contents
│   ├── searchAndReplace.js # search_and_replace
│   └── setWorkspace.js    # set_workspace
└── utils/
    └── fileUtils.js       # Common file operation utilities
```

**Design Principles**: Modular architecture, single responsibility, easy to maintain and extend

## 📊 Test Coverage

- ✅ **7 Complete Handler Test Suites**
- ✅ **Edge Cases and Error Handling Tests**
- ✅ **Batch Operations and Atomic Mode Validation**  
- ✅ **Security and Path Validation Tests**

## 🎉 Why Choose FileEditor MCP

1. **AI-Native Design** - Specifically optimized for AI programming assistants' workflow
2. **High-Performance Batch Processing** - Reduce API calls, improve processing efficiency
3. **Intelligent Error Tolerance** - Handle real-world code formatting and whitespace differences  
4. **Enterprise-Grade Security** - Strict workspace isolation and permission control
5. **Complete Test Coverage** - Reliability and stability guarantee

## 📄 License

MIT License - See `package.json` for details
