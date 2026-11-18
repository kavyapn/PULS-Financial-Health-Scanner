export const ASSET_TYPES = {cash:"Accessible cash",investment:"Investments",other:"Property or other asset"};
const MAX_ASSETS = 100;
const MAX_ASSET_VALUE = 1e9;
export const MAX_ASSET_TOTAL = MAX_ASSETS * MAX_ASSET_VALUE;

export function normalizeAssets(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.slice(0,MAX_ASSETS).filter(row => row && typeof row.id === "string" && row.id.length <= 96 &&
    typeof row.name === "string" && row.name.trim().length > 0 && row.name.length <= 80 &&
    Object.hasOwn(ASSET_TYPES,row.type) && Number.isFinite(row.value) && row.value >= 0 && row.value <= MAX_ASSET_VALUE &&
    ["Manual","CSV report","Demo bank"].includes(row.source) && !seen.has(row.id) && seen.add(row.id))
    .map(({id,name,type,value,source}) => ({id,name,type,value,source}));
}

export function assetTotals(input) {
  const totals = {cash:0,investment:0,other:0};
  for (const item of normalizeAssets(input)) totals[item.type] += item.value;
  return totals;
}

function splitCSV(text, delimiter) {
  const lines = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i <= text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i+1] === '"') {cell += '"'; i += 1;}
      else if (quoted || cell === "") quoted = !quoted;
      else cell += ch;
    } else if (!quoted && (ch === delimiter || ch === "\n" || ch === undefined)) {
      row.push(cell.trim());
      cell = "";
      if (ch !== delimiter) {
        if (row.some(Boolean)) lines.push(row);
        row = [];
      }
    } else if (ch !== undefined) cell += ch;
  }
  if (quoted) throw new Error("A quoted field in the CSV is unfinished.");
  return lines;
}

export function parseAssetReport(raw) {
  if (typeof raw !== "string" || raw.length > 100000) throw new Error("Use a CSV report under 100 KB.");
  const text = raw.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
  const header = text.split("\n").find(line => line.trim()) ?? "";
  const delimiter = header.includes(";") ? ";" : ",";
  const [columns,...rows] = splitCSV(text,delimiter);
  if (!columns || rows.length === 0 || rows.length > MAX_ASSETS) throw new Error("Include between 1 and 100 rows.");
  const labels = columns.map(item => item.toLowerCase().trim());
  const positions = [
    labels.findIndex(item => ["name","asset","bezeichnung"].includes(item)),
    labels.findIndex(item => ["type","category","typ"].includes(item)),
    labels.findIndex(item => ["value","amount","wert","amount_eur"].includes(item))
  ];
  if (positions.includes(-1)) throw new Error("Use columns Name, Type and Value. Types are cash, investment and other.");
  return rows.map((row,index) => {
    const [name,type,rawValue] = positions.map(i=>row[i]);
    const value = /^\d+(?:[.,]\d{1,2})?$/.test(rawValue ?? "") ? Number(rawValue.replace(",",".")) : NaN;
    const kind = type?.toLowerCase();
    if (!name || name.length > 80 || !Object.hasOwn(ASSET_TYPES,kind) || !Number.isFinite(value) || value > MAX_ASSET_VALUE) {
      throw new Error(`Check row ${index+2}. Use an asset name, supported type and an amount in euros.`);
    }
    return {name,type:kind,value,source:"CSV report"};
  });
}
