#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");

async function main() {
try {
const input = JSON.parse(fs.readFileSync(0, "utf-8"));

const response = await axios.post(
  process.env.TEMPORAL_GATEWAY || "http://localhost:8088/workflow/start",
  input
);

console.log("Workflow started:", response.data);
process.exit(0);

} catch (err) {
console.error("Temporal dispatch failed:", err.message);
process.exit(1);
}
}

main();
