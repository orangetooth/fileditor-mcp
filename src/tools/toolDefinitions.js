// Tool definitions and Schema configuration
export const toolDefinitions = [
    {
        name: "set_workspace",
        description: "Set the workspace root directory. All relative path operations will be based on this directory. You must call this tool to set the correct workspace before performing any file operations.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path to the workspace root directory (e.g., the directory opened by VSCode)"
                }
            },
            required: ["path"]
        }
    },
    {
        name: "read_files",
        description: "Read the entire or partial content of the specified file(s). Supports reading single or multiple files at once. The returned content includes line numbers in the format 'line | content'.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The path of the single file to read. The path can be an absolute path or a workspace-relative path."
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "An array of file paths to read. Each path can be an absolute path or a workspace-relative path."
                        }
                    ]
                },
                line_range: {
                    type: "string",
                    description: "Optional line range, format 'start-end' (only for single file)",
                    pattern: "^\\d+-\\d+$"
                }
            },
            required: ["path"]
        }
    },
    {
        name: "write_files",
        description: "Create new files or completely overwrite existing files. Supports single or multiple files at once.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The path of the single target file. The path can be an absolute path or a workspace-relative path."
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "An array of target file paths. Each path can be an absolute path or a workspace-relative path."
                        }
                    ]
                },
                content: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The full content to write, for single file or same content for all files"
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "An array of content for each file, for different content per file"
                        }
                    ]
                },
                line_count: {
                    oneOf: [
                        {
                            type: "integer",
                            description: "Total number of lines in the file, for single file or same for all files",
                            minimum: 0
                        },
                        {
                            type: "array",
                            items: {
                                type: "integer",
                                minimum: 0
                            },
                            description: "An array of line counts for each file, for different line counts per file"
                        }
                    ]
                }
            },
            required: ["path", "content", "line_count"]
        }
    },
    {
        name: "list_files",
        description: "List the files and subdirectories in the specified directory.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The directory path to list contents of. The path can be an absolute path or a workspace-relative path."
                },
                recursive: {
                    type: "boolean",
                    description: "Whether to recursively list subdirectory contents",
                    default: false
                }
            },
            required: ["path"]
        }
    },
    {
        name: "insert_contents",
        description: "Insert new content at the specified position in the file. Supports editing single or multiple files at once. Negative line numbers are supported for insertion from the end.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The path of the single target file. The path can be an absolute path or a workspace-relative path."
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "An array of target file paths. Each path can be an absolute path or a workspace-relative path."
                        }
                    ]
                },
                line: {
                    oneOf: [
                        {
                            type: "integer",
                            description: "The line number to insert (positive: 1-based, 0: end of file, negative: from end, -1 before last line), for single file"
                        },
                        {
                            type: "array",
                            items: {
                                type: "integer"
                            },
                            description: "An array of line numbers for each file (positive: insert, 0: end, negative: from end), for multiple files"
                        }
                    ]
                },
                content: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The content to insert, for single file or same content for all files"
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "An array of content for each file, for different content per file"
                        }
                    ]
                }
            },
            required: ["path", "line", "content"]
        }
    },
    {
        name: "apply_diffs",
        description: "Perform precise block-based search and replace operations on existing files. Supports single or multiple diff operations on a single file. When processing multiple diffs, the tool automatically handles line number offsets - all start_line values should be based on the original file structure. By default, operates in atomic mode for safe batch operations.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The path of the file to modify. The path can be an absolute path or a workspace-relative path."
                },
                search_content: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The original content to match precisely (for single diff)"
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "Array of original content to match precisely (for multiple diffs)"
                        }
                    ]
                },
                replace_content: {
                    oneOf: [
                        {
                            type: "string",
                            description: "The new content to replace with (for single diff)"
                        },
                        {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "Array of new content to replace with (for multiple diffs)"
                        }
                    ]
                },
                start_line: {
                    oneOf: [
                        {
                            type: "integer",
                            description: "The starting line number for searching content (for single diff, 1-based line number from original file)",
                            minimum: 1
                        },
                        {
                            type: "array",
                            items: {
                                type: "integer",
                                minimum: 1
                            },
                            description: "Array of starting line numbers for searching content (for multiple diffs, all 1-based line numbers from original file - tool automatically handles line offset adjustments during processing)"
                        }
                    ]
                },
                atomic: {
                    type: "boolean",
                    description: "Whether to use atomic mode (all-or-nothing). When true (default), validates all diffs before applying any. When false, applies diffs one by one, continuing on failures.",
                    default: true
                },
                trim: {
                    type: "boolean",
                    description: "Whether to trim whitespace from the beginning and end of each line when comparing search_content with file content. Only affects search and matching - replace_content is inserted exactly as provided. Default is false.",
                    default: false
                }
            },
            required: ["path", "search_content", "replace_content", "start_line"]
        }
    },
    {
        name: "search_and_replace",
        description: "Search and replace text or regular expressions in a single file.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The target file path. The path can be an absolute path or a workspace-relative path."
                },
                search: {
                    type: "string",
                    description: "The text or regular expression to search for"
                },
                replace: {
                    type: "string",
                    description: "The text to replace with"
                },
                use_regex: {
                    type: "boolean",
                    description: "Whether to use regular expressions for searching",
                    default: false
                },
                ignore_case: {
                    type: "boolean",
                    description: "Whether to ignore case when searching",
                    default: false
                },
                start_line: {
                    type: "integer",
                    description: "The starting line of the search range",
                    minimum: 1
                },
                end_line: {
                    type: "integer",
                    description: "The ending line of the search range",
                    minimum: 1
                }
            },
            required: ["path", "search", "replace"]
        }
    }
];
