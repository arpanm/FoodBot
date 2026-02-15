#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");

async function main() {
try {
const event = JSON.parse(fs.readFileSync(0, "utf-8"));

await axios.post(
  process.env.OBSERVABILITY_URL || "http://localhost:8090/events",
  event
);

console.log("Telemetry event sent");
process.exit(0);

} catch (err) {
console.error("Telemetry failed:", err.message);
process.exit(1);
}
}

main();
