#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { assertPathAllowed, assertDiffFormat } = require("../utils/guardrails");

async function main() {
try {
const input = JSON.parse(fs.readFileSync(0, "utf-8"));

const { patch, target_paths } = input;

assertDiffFormat(patch);
target_paths.forEach(assertPathAllowed);

const patchFile = path.join(process.cwd(), ".tmp_patch.diff");
fs.writeFileSync(patchFile, patch);

console.log("Applying patch...");
execSync(`git apply ${patchFile}`, { stdio: "inherit" });

fs.unlinkSync(patchFile);

console.log("Patch applied successfully.");
process.exit(0);

} catch (err) {
console.error("Patch failed:", err.message);
process.exit(1);
}
}

main();
