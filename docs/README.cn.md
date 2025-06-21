# FileEditor MCP Server

[📖 English Interface Doc](./MCP-INTERFACE.en.md) | [📖 中文接口文档](./MCP-INTERFACE.cn.md) | [📋 English README](../README.md)

**专为 AI 编程助手优化的文件操作服务器** - 基于 Model Context Protocol 构建，针对代码编辑、重构、批量修改等AI编程场景深度优化，提供高精度、高效率的文件系统操作能力。

## 🎯 设计理念

**为 AI 编程而生** - 本项目专门针对 AI 模型的代码编辑需求进行设计，提供精确的块级操作、智能匹配算法和批量处理能力，让 AI 能够安全、高效地执行复杂的代码修改任务。

## 🚀 核心特性

### 📁 专业文件操作工具 (7个)
- **`set_workspace`** - 安全工作区管理 (强制隔离，防止误操作)
- **`read_files`** - 智能批量读取 (支持多文件、行范围、带行号定位)
- **`write_files`** - 高效文件创建 (批量写入、原子性保证)
- **`list_files`** - 完整目录遍历 (递归扫描、结构化输出)
- **`insert_contents`** - 精确内容插入 (多点插入、负索引、末尾追加)
- **`apply_diffs`** - **AI友好的差异应用** (智能空格处理、批量原子操作、容错匹配)
- **`search_and_replace`** - 强大模式替换 (正则支持、范围限定、大小写控制)

### 🛡️ 企业级安全保障
- **工作区强隔离**: 严格边界控制，防止目录穿透和文件泄露
- **路径智能解析**: 自动验证和标准化文件路径
- **原子事务**: 批量操作要么全部成功，要么完全回滚

### ⚡ AI 优化功能
- **批量处理引擎**: 单次 API 调用处理大量文件操作
- **智能匹配算法**: `trim` 模式处理代码格式差异，容错性强
- **详细操作反馈**: 完整的成功/失败信息，便于 AI 调试和决策
- **非阻塞错误处理**: 部分失败不影响其他操作继续执行

## 🛠️ 快速开始

```bash
# 安装依赖 (推荐使用 pnpm)
pnpm install

# 启动生产服务器
pnpm start

# 开发模式 (文件变更自动重启)
pnpm dev

# 运行完整测试套件
pnpm test
```

**环境要求**: Node.js ≥18, pnpm 包管理器

## 💡 典型使用场景

```json
// 场景1: 工作区初始化 (必须首先执行)
{
  "name": "set_workspace",
  "arguments": { "path": "/path/to/your/project" }
}

// 场景2: 批量代码文件分析
{
  "name": "read_files",
  "arguments": { 
    "path": ["src/main.js", "src/utils.js", "package.json"],
    "line_range": "1-50"  // 可选：仅读取前50行
  }
}

// 场景3: 智能代码重构 (容错空格差异)
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
    "atomic": true,      // 原子模式：全部成功或全部回滚
    "trim": true         // 智能模式：忽略空格差异
  }
}
```

## 🏗️ 架构设计

```
src/
├── index.js              # 服务启动入口
├── server.js              # MCP 协议服务器
├── tools/
│   └── toolDefinitions.js # 工具定义和 JSON Schema
├── handlers/              # 核心处理器 (7个)
│   ├── applyDiff.js       # 差异应用 (支持批量+原子+智能匹配)
│   ├── readFile.js        # 文件读取器
│   ├── writeFile.js       # 文件写入器
│   ├── listFiles.js       # 目录扫描器
│   ├── insertContent.js   # 内容插入器
│   ├── searchAndReplace.js # 模式替换器
│   └── setWorkspace.js    # 工作区管理器
└── utils/
    └── fileUtils.js       # 通用文件操作库
```

**架构优势**: 高度模块化、职责明确、易于维护、便于 AI 理解和调用

## 📊 质量保证

- ✅ **100% 测试覆盖率** - 7个完整的处理器测试套件
- ✅ **边界条件验证** - 异常输入和错误状态处理
- ✅ **批量操作验证** - 原子性和一致性保证
- ✅ **安全性测试** - 路径注入和权限验证

## 🎉 为什么选择 FileEditor MCP

1. **AI 原生设计** - 专门为 AI 编程助手的工作模式优化
2. **高性能批处理** - 减少 API 调用次数，提升处理效率  
3. **智能容错** - 处理现实代码中的格式和空格差异
4. **企业级安全** - 严格的工作区隔离和权限控制
5. **完整测试覆盖** - 可靠性和稳定性保证

## 📄 开源协议

MIT License - 欢迎贡献和使用
