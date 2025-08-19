import * as XLSX from "xlsx/xlsx.mjs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";
import * as fs from "fs";
XLSX.set_fs(fs);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHEET_NAME = process.env.EXCEL_SHEET || "Sheet1";
const FILE_PATH = path.join(__dirname, "data", "db.xlsx");

export function ensureWorkbook() {
  if (!fs.existsSync(FILE_PATH)) {
    console.log("⚠️ db.xlsx not found. Creating a new one...");

    // Create an empty sheet
    const ws = XLSX.utils.json_to_sheet([]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Save to disk
    XLSX.writeFile(wb, FILE_PATH);
    console.log("✅ Created new db.xlsx at", FILE_PATH);
  }
}

export function loadWorkbook() {
  console.log('loadWorkbook', FILE_PATH)
  ensureWorkbook();
  return XLSX.readFile(FILE_PATH);
}

export function saveWorkbook(wb) {
  XLSX.writeFile(wb, FILE_PATH);
}

function getData(wb) {
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found`);
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

function putData(wb, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  wb.Sheets[SHEET_NAME] = ws;
  if (!wb.SheetNames.includes(SHEET_NAME)) wb.SheetNames.push(SHEET_NAME);
}

export function queryRows({ filters = [], select = [], limit = 100, offset = 0, orderBy } = {}) {
  const wb = loadWorkbook();
  let rows = getData(wb);

  // apply filters: [{column, op, value}]
  rows = rows.filter(r => {
    return filters.every(f => {
      const v = r[f.column];
      switch ((f.op || "eq").toLowerCase()) {
        case "eq":  return v == f.value;
        case "neq": return v != f.value;
        case "gt":  return Number(v) > Number(f.value);
        case "gte": return Number(v) >= Number(f.value);
        case "lt":  return Number(v) < Number(f.value);
        case "lte": return Number(v) <= Number(f.value);
        case "contains": return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase());
        case "in":  return Array.isArray(f.value) && f.value.includes(v);
        default: return false;
      }
    });
  });

  if (orderBy?.column) {
    const dir = (orderBy.direction || "asc").toLowerCase();
    rows.sort((a, b) => {
      const av = a[orderBy.column], bv = b[orderBy.column];
      if (av == bv) return 0;
      return (av > bv ? 1 : -1) * (dir === "asc" ? 1 : -1);
    });
  }

  // projection
  if (select?.length) {
    rows = rows.map(r => Object.fromEntries(select.map(c => [c, r[c]])));
  }

  // pagination
  return rows.slice(offset, offset + limit);
}

export function insertRow(row) {
  const wb = loadWorkbook();
  const rows = getData(wb);
  rows.push(row);
  putData(wb, rows);
  saveWorkbook(wb);
  return row;
}

export function updateRows({ filters = [], patch = {} }) {
  const wb = loadWorkbook();
  const rows = getData(wb);
  let updated = 0;

  const match = (r) => filters.every(f => {
    const v = r[f.column];
    switch ((f.op || "eq").toLowerCase()) {
      case "eq":  return v == f.value;
      case "neq": return v != f.value;
      case "gt":  return Number(v) > Number(f.value);
      case "gte": return Number(v) >= Number(f.value);
      case "lt":  return Number(v) < Number(f.value);
      case "lte": return Number(v) <= Number(f.value);
      case "contains": return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase());
      case "in":  return Array.isArray(f.value) && f.value.includes(v);
      default: return false;
    }
  });

  const newRows = rows.map(r => {
    if (match(r)) {
      updated++;
      return { ...r, ...patch };
    }
    return r;
  });

  putData(wb, newRows);
  saveWorkbook(wb);
  return { updated };
}

export function deleteRows({ filters = [] }) {
  const wb = loadWorkbook();
  const rows = getData(wb);

  const match = (r) => filters.every(f => {
    const v = r[f.column];
    switch ((f.op || "eq").toLowerCase()) {
      case "eq":  return v == f.value;
      case "neq": return v != f.value;
      case "gt":  return Number(v) > Number(f.value);
      case "gte": return Number(v) >= Number(f.value);
      case "lt":  return Number(v) < Number(f.value);
      case "lte": return Number(v) <= Number(f.value);
      case "contains": return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase());
      case "in":  return Array.isArray(f.value) && f.value.includes(v);
      default: return false;
    }
  });

  const kept = rows.filter(r => !match(r));
  const deleted = rows.length - kept.length;

  const wb2 = loadWorkbook();
  putData(wb2, kept);
  saveWorkbook(wb2);

  return { deleted };
}
