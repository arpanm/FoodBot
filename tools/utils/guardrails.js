const fs = require("fs");
const path = require("path");

const PROTECTED_PATHS = ["/.ai", "/packages/contracts"];

function assertPathAllowed(targetPath) {
const normalized = path.resolve(targetPath);

for (const blocked of PROTECTED_PATHS) {
if (normalized.includes(blocked)) {
throw new Error("Write denied to protected path: ${blocked}");
}
}
}

function assertDiffFormat(patch) {
if (!patch.includes("---") || !patch.includes("+++")) {
throw new Error("Patch must be unified diff format");
}
}

module.exports = {
assertPathAllowed,
assertDiffFormat,
};
