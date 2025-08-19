import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import {
  queryRows,
  insertRow,
  updateRows,
  deleteRows,
  ensureWorkbook
} from "./excelService.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());
const PORT = process.env.PORT || 4000;

ensureWorkbook();

/** Simple chat endpoint for the React UI */
app.post("/chat", async (req, res) => {
  const { message } = req.body ?? {};
  const lower = (message || "").toLowerCase();

  try {
    if (lower.startsWith("find")) {
      // naive demo: "find name john"
      const [, col, ...rest] = lower.split(" ");
      const value = rest.join(" ");
      const rows = queryRows({ filters: [{ column: col || "Name", op: "contains", value }] });
      return res.json({ reply: JSON.stringify(rows, null, 2) });
    }

    if (lower.startsWith("add")) {
      // naive demo: "add Name=Alice Age=31 Status=Active"
      const parts = message.split(" ").slice(1);
      const row = Object.fromEntries(
        parts.map(p => {
          const i = p.indexOf("=");
          return [p.slice(0, i), p.slice(i + 1)];
        })
      );
      insertRow(row);
      return res.json({ reply: "✅ Row added." });
    }

    if (lower.startsWith("update")) {
      // demo: "update Name=Alice set Status=Inactive"
      const [_, ...rest] = message.split(" ");
      const join = rest.join(" ");
      const [wherePart, setPart] = join.split(" set ");
      const [wKey, wVal] = wherePart.split("=");

      const patch = Object.fromEntries(
        setPart.split(" ").map(p => {
          const i = p.indexOf("=");
          return [p.slice(0, i), p.slice(i + 1)];
        })
      );

      const result = updateRows({ filters: [{ column: wKey, op: "eq", value: wVal }], patch });
      return res.json({ reply: `✅ Updated ${result.updated} row(s).` });
    }

    if (lower.startsWith("delete")) {
      // demo: "delete Name=Bob"
      const [_, kv] = message.split(" ");
      const [k, v] = kv.split("=");
      const result = deleteRows({ filters: [{ column: k, op: "eq", value: v }] });
      return res.json({ reply: `🗑️ Deleted ${result.deleted} row(s).` });
    }

    return res.json({
      reply:
        "Try:\n" +
        "• find Name John\n" +
        "• add Name=Alice Age=30 Status=Active\n" +
        "• update Name=Alice set Status=Inactive\n" +
        "• delete Name=Bob"
    });
  } catch (e) {
    return res.status(400).json({ reply: `❌ ${e.message}` });
  }
});

app.post("/excel/query", (req, res) => {
  try {
    const rows = queryRows(req.body || {});
    res.json({ rows });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/excel/insert", (req, res) => {
  try {
    const row = insertRow(req.body?.row || {});
    res.json({ row });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/excel/update", (req, res) => {
  try {
    const out = updateRows(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/excel/delete", (req, res) => {
  try {
    const out = deleteRows(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Web server on http://localhost:${PORT}`));
