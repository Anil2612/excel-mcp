import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/transport/stdio";

import {
  queryRows,
  insertRow,
  updateRows,
  deleteRows,
  ensureWorkbook
} from "./excelService.js";

// Start an MCP server over stdio (works with MCP-compatible LLM clients)
const server = new Server(
  {
    name: "excel-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

ensureWorkbook();

// Register Excel tools
server.tool(
  "excel.query",
  "Query rows from the Excel sheet. Input: {filters?, select?, limit?, offset?, orderBy?}",
  async (args) => {
    const result = queryRows(args || {});
    return { ok: true, result };
  }
);

server.tool(
  "excel.insert",
  "Insert a single row. Input: {row}",
  async (args) => {
    if (!args?.row || typeof args.row !== "object") {
      throw new Error("row is required");
    }
    const result = insertRow(args.row);
    return { ok: true, result };
  }
);

server.tool(
  "excel.update",
  "Update rows matching filters. Input: {filters, patch}",
  async (args) => {
    if (!args?.filters || !args?.patch) {
      throw new Error("filters and patch are required");
    }
    const result = updateRows({ filters: args.filters, patch: args.patch });
    return { ok: true, ...result };
  }
);

server.tool(
  "excel.delete",
  "Delete rows matching filters. Input: {filters}",
  async (args) => {
    if (!args?.filters) {
      throw new Error("filters are required");
    }
    const result = deleteRows({ filters: args.filters });
    return { ok: true, ...result };
  }
);

// Launch (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
