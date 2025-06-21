# MCP File Operation Toolkit Documentation

## Tool Overview

This document describes a set of file operation tools compliant with the Model Context Protocol (MCP), including 7 core tools for workspace management and file reading, writing, modification, and search operations.

## 🔒 Security Features

- **Workspace Isolation**: You must call `set_workspace` to set the workspace root directory first
- **Path Security**: All file operations are strictly limited to the set workspace, preventing directory traversal attacks
- **Relative Path Support**: Relative paths are automatically resolved based on the workspace root directory

**⚠️ Important**: You must call the `set_workspace` tool to set the workspace root directory before performing any file operations, otherwise all operations will be rejected.

**Implementation Status**:
- ✅ `set_workspace` - Implemented (workspace setup)
- ✅ `read_files` - Implemented
- ✅ `write_files` - Implemented
- ✅ `list_files` - Implemented
- ✅ `insert_contents` - Implemented
- ✅ `apply_diffs` - Implemented
- ✅ `search_and_replace` - Implemented

---

## 0. `set_workspace` (Set Workspace)

**Description**: Set the workspace root directory. All subsequent file operations will be based on this directory. Relative paths will be automatically resolved within the workspace, and absolute paths must be within the workspace.

**MCP Call Format**:
```json
{
  "name": "set_workspace",
  "arguments": {
    "path": "/absolute/path/to/workspace"
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully set workspace root to: /Users/username/projects/my-project"
    }
  ]
}
```

---

## 1. `read_files` (Read Files)

**Description**: Read the entire or partial content of the specified file(s). Supports reading single or multiple files at once. The returned content includes line numbers (format: `line | content`) for easy line reference in other tools.

**MCP Call Format**:
```json
{
  "name": "read_files",
  "arguments": {
    "path": "file path or array of file paths",
    "line_range": "start-end" // Optional, only for single file, e.g. "1-50"
  }
}
```

**Parameter Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "oneOf": [
        { "type": "string", "description": "The path of the single file to read" },
        { "type": "array", "items": { "type": "string" }, "description": "An array of file paths to read" }
      ]
    },
    "line_range": {
      "type": "string",
      "description": "Optional line range, format 'start-end' (only for single file)",
      "pattern": "^\\d+-\\d+$"
    }
  },
  "required": ["path"]
}
```

**Usage Example**:

*Single file:*
```json
{
  "name": "read_files",
  "arguments": {
    "path": "src/main/java/com/example/lsmtree/MemTable.java"
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "1 | package com.example.lsmtree;\n2 | ..."
    }
  ]
}
```

*Multiple files:*
```json
{
  "name": "read_files",
  "arguments": {
    "path": ["package.json", "README.md"]
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully read 2 file(s):\n\n=== package.json (25 lines) ===\n{...}\n\n=== README.md (15 lines) ===\n# FileEditor MCP\n..."
    }
  ]
}
```

*Single file with line range:*
```json
{
  "name": "read_files",
  "arguments": {
    "path": "config.properties",
    "line_range": "1-10"
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "# Configuration file\nserver.port=8080\ndb.url=localhost:3306\n..."
    }
  ]
}
```

---

## 2. `write_files` (Write Files)

**Description**: Create new files or completely overwrite existing files. Supports single or multiple files at once.

**MCP Call Format**:
```json
{
  "name": "write_files",
  "arguments": {
    "path": "file path" | ["path1", "path2", ...],
    "content": "full file content" | ["content1", "content2", ...],
    "line_count": total lines | [lines1, lines2, ...]
  }
}
```

**Parameter Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "oneOf": [
        { "type": "string", "description": "The path of the single target file" },
        { "type": "array", "items": { "type": "string" }, "description": "An array of target file paths" }
      ]
    },
    "content": {
      "oneOf": [
        { "type": "string", "description": "The full content to write, for single file or same content for all files" },
        { "type": "array", "items": { "type": "string" }, "description": "An array of content for each file, for different content per file" }
      ]
    },
    "line_count": {
      "oneOf": [
        { "type": "integer", "description": "Total number of lines in the file, for single file or same for all files", "minimum": 0 },
        { "type": "array", "items": { "type": "integer", "minimum": 0 }, "description": "An array of line counts for each file, for different line counts per file" }
      ]
    }
  },
  "required": ["path", "content", "line_count"]
}
```

**Usage Example**:

*Single file:*
```json
{
  "name": "write_files",
  "arguments": {
    "path": "config/database.js",
    "content": "export const config = {\n  host: 'localhost',\n  port: 3306\n};",
    "line_count": 4
  }
}
```

*Multiple files, same content:*
```json
{
  "name": "write_files",
  "arguments": {
    "path": ["config/dev.env", "config/test.env"],
    "content": "NODE_ENV=development\nDEBUG=true",
    "line_count": 2
  }
}
```

*Multiple files, different content:*
```json
{
  "name": "write_files",
  "arguments": {
    "path": ["package.json", "README.md", ".gitignore"],
    "content": [
      "{\n  \"name\": \"my-project\",\n  \"version\": \"1.0.0\"\n}",
      "# My Project\n\nA sample project",
      "node_modules/\n*.log\n.env"
    ],
    "line_count": [4, 3, 3]
  }
}
```

**Return Example**:

*Single file:*
```json
{
  "content": [
    {
      "type": "text",
      "text": "File written successfully: config/database.js (4 lines)"
    }
  ]
}
```

*Multiple files:*
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully wrote 3 files (10 total lines):\n  - package.json (4 lines)\n  - README.md (3 lines)\n  - .gitignore (3 lines)"
    }
  ]
}
```

---

## 3. `apply_diffs` (Apply Diffs)

**Description**: Perform precise block-based search and replace operations on existing files. Supports single or multiple diff operations on a single file. When processing multiple diffs, the tool automatically handles line number offsets - all start_line values should be based on the original file structure. By default, operates in atomic mode for safe batch operations.

**MCP Call Format**:
```json
{
  "name": "apply_diffs",
  "arguments": {
    "path": "file path",
    "search_content": "original content to match" | ["content1", "content2", ...],
    "replace_content": "new content to replace with" | ["content1", "content2", ...],
    "start_line": starting line number | [line1, line2, ...],
    "atomic": true/false,  // Optional, default is true
    "trim": true/false     // Optional, default is false
  }
}
```

**Parameter Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string", "description": "The path of the file to modify" },
    "search_content": {
      "oneOf": [
        {
          "type": "string",
          "description": "The original content to match precisely (for single diff)"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Array of original content to match precisely (for multiple diffs)"
        }
      ]
    },
    "replace_content": {
      "oneOf": [
        {
          "type": "string",
          "description": "The new content to replace with (for single diff)"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Array of new content to replace with (for multiple diffs)"
        }
      ]
    },
    "start_line": {
      "oneOf": [
        {
          "type": "integer",
          "description": "The starting line number for searching content (for single diff, 1-based line number from original file)",
          "minimum": 1
        },
        {
          "type": "array",
          "items": {
            "type": "integer",
            "minimum": 1
          },
          "description": "Array of starting line numbers for searching content (for multiple diffs, all 1-based line numbers from original file - tool automatically handles line offset adjustments during processing)"
        }
      ]
    },
    "atomic": {
      "type": "boolean",
      "description": "Whether to use atomic mode (all-or-nothing). When true (default), validates all diffs before applying any. When false, applies diffs one by one, continuing on failures.",
      "default": true
    },
    "trim": {
      "type": "boolean",
      "description": "Whether to trim whitespace from the beginning and end of each line when comparing search_content with file content. Only affects search and matching - replace_content is inserted exactly as provided. Default is false.",
      "default": false
    }
  },
  "required": ["path", "search_content", "replace_content", "start_line"]
}
```

**Usage Example**:
```json
{
  "name": "apply_diffs",
  "arguments": {
    "path": "pom.xml",
    "search_content": "        <version>1.2.0</version>",
    "replace_content": "        <version>1.3.1</version>",
    "start_line": 25
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully applied diff to pom.xml: replaced 1 line(s) at line 25. File now has 45 lines."
    }
  ]
}
```

*Multi-line replace:*
```json
{
  "name": "apply_diffs",
  "arguments": {
    "path": "config.js",
    "search_content": "const config = {\n  port: 3000,\n  host: 'localhost'\n};",
    "replace_content": "const config = {\n  port: process.env.PORT || 8080,\n  host: process.env.HOST || '0.0.0.0',\n  ssl: process.env.SSL || false\n};",
    "start_line": 10
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully applied diff to config.js: replaced 4 line(s) at line 10 (added 1 line(s)). File now has 26 lines."
    }
  ]
}
```

*Using trim option for whitespace differences:*
```json
{
  "name": "apply_diffs",
  "arguments": {
    "path": "config.js",
    "search_content": "console.log('Hello World');",
    "replace_content": "    console.log('Hello Universe');",
    "start_line": 5,
    "trim": true
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully applied diff to config.js: replaced 1 line(s) at line 5. File now has 25 lines."
    }
  ]
}
```

*Batch operations (atomic mode):*
```json
{
  "name": "apply_diffs",
  "arguments": {
    "path": "main.js",
    "search_content": [
      "    console.log('start');",
      "    return false;", 
      "    console.log('end');"
    ],
    "replace_content": [
      "    console.log('application started');",
      "    return true;",
      "    console.log('application ended');"
    ],
    "start_line": [2, 15, 28],
    "atomic": true
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Batch diff operation (atomic) completed: 3/3 diffs applied successfully to main.js. File now has 30 lines.\n\nDetailed results:\n\nDiff 1:\n  Status: success\n  Start Line: 2\n  Message: Replaced 1 line(s) at line 2\n\nDiff 2:\n  Status: success\n  Start Line: 15\n  Message: Replaced 1 line(s) at line 15\n\nDiff 3:\n  Status: success\n  Start Line: 28\n  Message: Replaced 1 line(s) at line 28"
    }
  ]
}
```

---

## 4. `insert_contents` (Insert Contents)

**Description**: Insert new content at the specified position in the file. Supports editing single or multiple files at once. Negative line numbers are supported for insertion from the end (-1 means before the last line).

**MCP Call Format**:
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": "file path or array of file paths",
    "line": "line number or array of line numbers",
    "content": "content or array of content"
  }
}
```

**Parameter Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "oneOf": [
        { "type": "string", "description": "The path of the single target file" },
        { "type": "array", "items": { "type": "string" }, "description": "An array of target file paths" }
      ]
    },
    "line": {
      "oneOf": [
        { "type": "integer", "description": "The line number to insert (positive: 1-based, 0: end of file, negative: from end, -1 before last line), for single file" },
        { "type": "array", "items": { "type": "integer" }, "description": "An array of line numbers for each file (positive: insert, 0: end, negative: from end), for multiple files" }
      ]
    },
    "content": {
      "oneOf": [
        { "type": "string", "description": "The content to insert, for single file or same content for all files" },
        { "type": "array", "items": { "type": "string" }, "description": "An array of content for each file, for different content per file" }
      ]
    }
  },
  "required": ["path", "line", "content"]
}
```

**Usage Example**:

*Single file:*
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": "src/main/java/com/example/App.java",
    "line": 3,
    "content": "import java.util.ArrayList;"
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully inserted 1 line(s) at position 3 in src/main/java/com/example/App.java. File now has 25 lines."
    }
  ]
}
```

*Multiple files, same position and content:*
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": ["file1.js", "file2.js", "file3.js"],
    "line": 1,
    "content": "// Added comment"
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully processed 3 file(s):\n\n✅ file1.js: Successfully inserted 1 line(s) at position 1 in file1.js. File now has 15 lines.\n✅ file2.js: Successfully inserted 1 line(s) at position 1 in file2.js. File now has 22 lines.\n✅ file3.js: Successfully inserted 1 line(s) at position 1 in file3.js. File now has 8 lines."
    }
  ]
}
```

*Multiple files, different positions and content:*
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": ["config.js", "utils.js", "main.js"],
    "line": [1, 5, 0],
    "content": [
      "// Config file",
      "// Utility functions",
      "// Main entry point"
    ]
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully processed 3 file(s):\n\n✅ config.js: Successfully inserted 1 line(s) at position 1 in config.js. File now has 20 lines.\n✅ utils.js: Successfully inserted 1 line(s) at position 5 in utils.js. File now has 35 lines.\n✅ main.js: Successfully inserted 1 line(s) at position end of file in main.js. File now has 45 lines."
    }
  ]
}
```

---

## 5. `search_and_replace` (Search and Replace)

**Description**: Search and replace text or regular expressions in a single file.

**MCP Call Format**:
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "file path",
    "search": "text or regex to search for",
    "replace": "text to replace with",
    "use_regex": true/false,
    "ignore_case": true/false,
    "start_line": start line,
    "end_line": end line
  }
}
```

**Parameter Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string", "description": "The target file path" },
    "search": { "type": "string", "description": "The text or regular expression to search for" },
    "replace": { "type": "string", "description": "The text to replace with" },
    "use_regex": { "type": "boolean", "description": "Whether to use regular expressions for searching", "default": false },
    "ignore_case": { "type": "boolean", "description": "Whether to ignore case when searching", "default": false },
    "start_line": { "type": "integer", "description": "The starting line of the search range", "minimum": 1 },
    "end_line": { "type": "integer", "description": "The ending line of the search range", "minimum": 1 }
  },
  "required": ["path", "search", "replace"]
}
```

**Usage Example**:
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "src/main/resources/application.properties",
    "search": "app.name",
    "replace": "spring.application.name",
    "use_regex": false
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully replaced 3 occurrence(s) in src/main/resources/application.properties"
    }
  ]
}
```

*Using regex:*
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "config.js",
    "search": "const\\s+(\\w+)\\s*=\\s*require\\(['\"]([^'\"]+)['\"]\)",
    "replace": "import $1 from '$2'",
    "use_regex": true
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully replaced 5 occurrence(s) in config.js using regex pattern"
    }
  ]
}
```

*Specify line range:*
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "package.json",
    "search": "1.0.0",
    "replace": "1.1.0",
    "start_line": 1,
    "end_line": 10
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully replaced 1 occurrence(s) in package.json (lines 1-10)"
    }
  ]
}
```

*Ignore case:*
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "README.md",
    "search": "hello",
    "replace": "Hi",
    "ignore_case": true
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully replaced 3 occurrence(s) in README.md (case-insensitive)"
    }
  ]
}
```

---

## 6. `list_files` (List Files)

**Description**: List the files and subdirectories in the specified directory.

**MCP Call Format**:
```json
{
  "name": "list_files",
  "arguments": {
    "path": "directory path",
    "recursive": true/false
  }
}
```

**Parameter Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string", "description": "The directory path to list contents of" },
    "recursive": { "type": "boolean", "description": "Whether to recursively list subdirectory contents", "default": false }
  },
  "required": ["path"]
}
```

**Usage Example**:
```json
{
  "name": "list_files",
  "arguments": {
    "path": "src/main",
    "recursive": false
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "directory: java\nfile: resources\nfile: webapp"
    }
  ]
}
```

*Recursive list:*
```json
{
  "name": "list_files",
  "arguments": {
    "path": "src",
    "recursive": true
  }
}
```

**Return Example**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "directory: main\ndirectory: main/java\nfile: main/java/App.java\nfile: main/java/Utils.java\ndirectory: main/resources\nfile: main/resources/config.properties\ndirectory: test\nfile: test/AppTest.java"
    }
  ]
}
```

---

## Return Value Format

All tool return values follow the MCP standard format:

**Success Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Result or file content"
    }
  ]
}
```

**Error Response Format**:
```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: error message description"
    }
  ]
}
```

**Common Error Examples**:

*File not found:*
```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: File not found: nonexistent_file.txt"
    }
  ]
}
```

*Line number out of range:*
```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: Line number 50 exceeds file length (20 lines)"
    }
  ]
}
```

*Directory not found:*
```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: Directory not found: /nonexistent/path"
    }
  ]
}
```
