# MCP 文件操作工具集文档

## 工具概述

本文档描述了符合 MCP (Model Context Protocol) 规范的文件操作工具集，包含 7 个核心工具用于工作区管理和文件的读取、写入、修改、搜索操作。

## 🔒 安全特性

- **工作区隔离**: 必须先调用 `set_workspace` 设置工作区根目录
- **路径安全**: 所有文件操作严格限制在设置的工作区内，防止目录遍历攻击
- **相对路径支持**: 相对路径自动基于工作区根目录解析

**⚠️ 重要**: 在进行任何文件操作前，必须先调用 `set_workspace` 工具设置工作区根目录，否则所有操作将被拒绝。

**实现状态**:
- ✅ `set_workspace` - 已实现（工作区设置）
- ✅ `read_files` - 已实现
- ✅ `write_files` - 已实现
- ✅ `list_files` - 已实现  
- ✅ `insert_contents` - 已实现
- ✅ `apply_diffs` - 已实现
- ✅ `search_and_replace` - 已实现

---

## 0. `set_workspace` (设置工作区)

**描述**: 设置工作区根目录，所有后续的文件操作都将基于此目录。相对路径将自动解析为工作区内的路径，绝对路径必须在工作区范围内。

**MCP 调用格式**:
```json
{
  "name": "set_workspace",
  "arguments": {
    "path": "/absolute/path/to/workspace"
  }
}
```

**返回值示例**:
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

## 1. `read_files` (读取文件)

**描述**: 读取指定文件的全部或部分内容，支持单文件或多文件同时读取。返回内容带有行号显示（格式：`行号 | 内容`），便于其他工具操作时定位行号。

**MCP 调用格式**:
```json
{
  "name": "read_files",
  "arguments": {
    "path": "文件路径 或 文件路径数组",
    "line_range": "起始行-结束行" // 可选，仅适用于单文件，格式如 "1-50"
  }
}
```

**参数 Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "oneOf": [
        {
          "type": "string",
          "description": "要读取的单个文件路径"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "要读取的多个文件路径数组"
        }
      ]
    },
    "line_range": {
      "type": "string",
      "description": "可选的行范围，格式为 '起始行-结束行'（仅适用于单文件）",
      "pattern": "^\\d+-\\d+$"
    }
  },
  "required": ["path"]
}
```

**使用示例**:

*单文件读取:*
```json
{
  "name": "read_files",
  "arguments": {
    "path": "src/main/java/com/example/lsmtree/MemTable.java"
  }
}
```

**返回值示例**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "1 | package com.example.lsmtree;\n2 | \n3 | import java.util.*;\n4 | \n5 | public class MemTable {\n6 |     // 类内容...\n7 | }"
    }
  ]
}
```

*多文件读取:*
```json
{
  "name": "read_files",
  "arguments": {
    "path": ["package.json", "README.md"]
  }
}
```

**返回值示例**:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "Successfully read 2 file(s):\n\n=== package.json (25 lines) ===\n{\n  \"name\": \"fileditor-mcp\",\n  \"version\": \"1.0.0\",\n  ...\n}\n\n=== README.md (15 lines) ===\n# FileEditor MCP\n\nThis is a file editor...\n"
    }
  ]
}
```

*单文件指定行范围:*
```json
{
  "name": "read_files",
  "arguments": {
    "path": "config.properties",
    "line_range": "1-10"
  }
}
```

**返回值示例**:
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

## 2. `write_files` (写入文件)

**描述**: 创建新文件或完全覆盖现有文件内容，支持单文件或多文件同时创建

**MCP 调用格式**:
```json
{
  "name": "write_files",
  "arguments": {
    "path": "文件路径" | ["路径1", "路径2", ...],
    "content": "要写入的完整文件内容" | ["内容1", "内容2", ...],
    "line_count": 文件总行数 | [行数1, 行数2, ...]
  }
}
```

**参数 Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "oneOf": [
        {
          "type": "string",
          "description": "单个目标文件路径"
        },
        {
          "type": "array",
          "items": {"type": "string"},
          "description": "多个目标文件路径数组"
        }
      ]
    },
    "content": {
      "oneOf": [
        {
          "type": "string",
          "description": "要写入的完整文件内容，适用于单文件或所有文件写入相同内容"
        },
        {
          "type": "array",
          "items": {"type": "string"},
          "description": "每个文件对应的内容数组，适用于多文件不同内容"
        }
      ]
    },
    "line_count": {
      "oneOf": [
        {
          "type": "integer",
          "description": "文件内容的总行数，适用于单文件或所有文件相同行数",
          "minimum": 0
        },
        {
          "type": "array",
          "items": {"type": "integer", "minimum": 0},
          "description": "每个文件对应的行数数组，适用于多文件不同行数"
        }
      ]
    }
  },
  "required": ["path", "content", "line_count"]
}
```

**使用示例**:

*单文件写入*:
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

*多文件相同内容写入*:
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

*多文件不同内容写入*:
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

**返回值示例**:

*单文件*:
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

*多文件*:
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

## 3. `apply_diffs` (应用差异修改)

**描述**: 对现有文件进行精确的基于块的查找和替换操作。支持对单个文件进行单个或多个差异操作。处理多个差异时，工具自动处理行号偏移 - 所有 start_line 值应基于原始文件结构。默认以原子模式操作以确保批量操作安全。

**MCP 调用格式**:
```json
{
  "name": "apply_diffs",
  "arguments": {
    "path": "文件路径",
    "search_content": "需要精确匹配的原始内容" | ["内容1", "内容2", ...],
    "replace_content": "用于替换的新内容" | ["内容1", "内容2", ...],
    "start_line": 起始行号 | [行号1, 行号2, ...],
    "atomic": true/false,  // 可选，默认为 true
    "trim": true/false     // 可选，默认为 false
  }
}
```

**参数 Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "要修改的文件路径"
    },
    "search_content": {
      "oneOf": [
        {
          "type": "string",
          "description": "需要精确匹配的原始内容（单个差异）"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "需要精确匹配的原始内容数组（多个差异）"
        }
      ]
    },
    "replace_content": {
      "oneOf": [
        {
          "type": "string",
          "description": "用于替换的新内容（单个差异）"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "用于替换的新内容数组（多个差异）"
        }
      ]
    },
    "start_line": {
      "oneOf": [
        {
          "type": "integer",
          "description": "搜索内容的起始行号（单个差异，从原始文件的1开始计数）",
          "minimum": 1
        },
        {
          "type": "array",
          "items": {
            "type": "integer",
            "minimum": 1
          },
          "description": "搜索内容的起始行号数组（多个差异，所有行号都基于原始文件的1开始计数 - 工具在处理过程中自动处理行偏移调整）"
        }
      ]
    },
    "atomic": {
      "type": "boolean",
      "description": "是否使用原子模式（全部成功或全部失败）。为true时（默认），在应用任何差异之前验证所有差异。为false时，逐个应用差异，遇到失败时继续处理",
      "default": true
    },
    "trim": {
      "type": "boolean",
      "description": "是否在比较 search_content 与文件内容时修剪每行的首尾空格。仅影响搜索和匹配过程 - replace_content 完全按提供的方式插入。默认为 false",
      "default": false
    }
  },
  "required": ["path", "search_content", "replace_content", "start_line"]
}
```

**使用示例**:
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

**返回值示例**:
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

*多行替换示例:*
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

**返回值示例**:
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

*使用 trim 选项处理空格差异:*
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

**返回值示例**:
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

*批量操作（原子模式）:*
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

**返回值示例**:
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

## 4. `insert_contents` (插入内容)

**描述**: 在文件的指定位置插入新内容，支持单文件或多文件同时编辑。支持负数行号从文件末尾倒数计算插入位置（-1表示在最后一行前插入）

**MCP 调用格式**:
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": "文件路径 或 文件路径数组",
    "line": "行号 或 行号数组",
    "content": "内容 或 内容数组"
  }
}
```

**参数 Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "oneOf": [
        {
          "type": "string",
          "description": "单个目标文件路径"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "多个目标文件路径数组"
        }
      ]
    },
    "line": {
      "oneOf": [
        {
          "type": "integer",
          "description": "要插入的行号 (1-based, 0表示文件末尾)，适用于单文件",
          "minimum": 0
        },
        {
          "type": "array",
          "items": {
            "type": "integer",
            "minimum": 0
          },
          "description": "每个文件对应的行号数组，适用于多文件"
        }
      ]
    },
    "content": {
      "oneOf": [
        {
          "type": "string",
          "description": "要插入的内容，适用于单文件或所有文件插入相同内容"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "每个文件对应的内容数组，适用于多文件不同内容"
        }
      ]
    }
  },
  "required": ["path", "line", "content"]
}
```

**使用示例**:

*单文件插入:*
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

**返回值示例**:
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

*多文件相同位置插入相同内容:*
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": ["file1.js", "file2.js", "file3.js"],
    "line": 1,
    "content": "// 添加的注释"
  }
}
```

**返回值示例**:
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

*多文件不同位置插入不同内容:*
```json
{
  "name": "insert_contents",
  "arguments": {
    "path": ["config.js", "utils.js", "main.js"],
    "line": [1, 5, 0],
    "content": [
      "// 配置文件",
      "// 工具函数",
      "// 主程序入口"
    ]
  }
}
```

**返回值示例**:
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

## 5. `search_and_replace` (查找并替换)

**描述**: 在单个文件中查找并替换文本或正则表达式

**MCP 调用格式**:
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "文件路径",
    "search": "要查找的文本或正则表达式",
    "replace": "用于替换的文本",
    "use_regex": true/false,
    "ignore_case": true/false,
    "start_line": 起始行,
    "end_line": 结束行
  }
}
```

**参数 Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "目标文件路径"
    },
    "search": {
      "type": "string",
      "description": "要查找的文本或正则表达式"
    },
    "replace": {
      "type": "string",
      "description": "用于替换的文本"
    },
    "use_regex": {
      "type": "boolean",
      "description": "是否使用正则表达式进行搜索",
      "default": false
    },
    "ignore_case": {
      "type": "boolean",
      "description": "是否忽略大小写进行搜索",
      "default": false
    },
    "start_line": {
      "type": "integer",
      "description": "搜索范围的起始行",
      "minimum": 1
    },
    "end_line": {
      "type": "integer",
      "description": "搜索范围的结束行",
      "minimum": 1
    }
  },
  "required": ["path", "search", "replace"]
}
```

**使用示例**:
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

**返回值示例**:
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

*使用正则表达式:*
```json
{
  "name": "search_and_replace",
  "arguments": {
    "path": "config.js",
    "search": "const\\s+(\\w+)\\s*=\\s*require\\(['\"]([^'\"]+)['\"]\\)",
    "replace": "import $1 from '$2'",
    "use_regex": true
  }
}
```

**返回值示例**:
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

*指定行范围:*
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

**返回值示例**:
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

*忽略大小写搜索:*
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

**返回值示例**:
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

## 6. `list_files` (列出文件)

**描述**: 列出指定目录中的文件和子目录

**MCP 调用格式**:
```json
{
  "name": "list_files",
  "arguments": {
    "path": "目录路径",
    "recursive": true/false
  }
}
```

**参数 Schema**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "要列出内容的目录路径"
    },
    "recursive": {
      "type": "boolean",
      "description": "是否递归列出子目录内容",
      "default": false
    }
  },
  "required": ["path"]
}
```

**使用示例**:
```json
{
  "name": "list_files",
  "arguments": {
    "path": "src/main",
    "recursive": false
  }
}
```

**返回值示例**:
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

*递归列出文件:*
```json
{
  "name": "list_files",
  "arguments": {
    "path": "src",
    "recursive": true
  }
}
```

**返回值示例**:
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

## 返回值格式

所有工具的返回值都遵循 MCP 标准格式：

**成功响应格式**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "操作结果或文件内容"
    }
  ]
}
```

**错误响应格式**:
```json
{
  "isError": true,
  "content": [
    {
      "type": "text", 
      "text": "Error: 错误信息描述"
    }
  ]
}
```

**常见错误示例**:

*文件不存在错误:*
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

*行号超出范围错误:*
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

*目录不存在错误:*
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