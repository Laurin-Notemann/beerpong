// node inline.mjs <page.html> <style.css> <wasm_exec.js> <data.json> <sim.wasm> <out.html>
// Inlines everything into one self-contained page.
import fs from "node:fs";

const [page, style, wasmExec, data, wasm, out] = process.argv.slice(2);
let html = fs.readFileSync(page, "utf8");
const parts = {
  "/*__STYLE__*/": fs.readFileSync(style, "utf8"),
  "/*__WASM_EXEC__*/": fs.readFileSync(wasmExec, "utf8"),
  "/*__DATA__*/null": fs.readFileSync(data, "utf8"),
  "__WASM_B64__": fs.readFileSync(wasm).toString("base64"),
};
for (const [marker, value] of Object.entries(parts)) {
  if (!html.includes(marker)) throw new Error("page.html has no " + marker);
  html = html.replace(marker, () => value);
}
fs.writeFileSync(out, html);
