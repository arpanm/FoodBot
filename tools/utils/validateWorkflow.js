#!/usr/bin/env node

/**

* Workflow Validator
* Ensures all LLM-generated workflows conform to the contract
  */

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const SCHEMA_PATH = path.resolve(".ai/schema/workflow.schema.json");

function loadSchema() {
if (!fs.existsSync(SCHEMA_PATH)) {
throw new Error(`Workflow schema not found at ${SCHEMA_PATH}`);
}
return JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"));
}

function createValidator(schema) {
const ajv = new Ajv({
allErrors: true,
strict: false,
});

addFormats(ajv);

return ajv.compile(schema);
}

function validateWorkflow(workflow, validateFn) {
const valid = validateFn(workflow);

if (!valid) {
const errors = validateFn.errors.map(err => ({
field: err.instancePath || err.schemaPath,
message: err.message,
}));

```
return { valid: false, errors };
```

}

return { valid: true };
}

function readInput() {
const input = fs.readFileSync(0, "utf-8"); // stdin
return JSON.parse(input);
}

function main() {
try {
const schema = loadSchema();
const validator = createValidator(schema);
const workflow = readInput();

```
const result = validateWorkflow(workflow, validator);

if (!result.valid) {
  console.error("❌ Workflow validation failed:");
  console.error(JSON.stringify(result.errors, null, 2));
  process.exit(1);
}

console.log("✅ Workflow is valid.");
process.exit(0);
```

} catch (err) {
console.error("Validator error:", err.message);
process.exit(1);
}
}

if (require.main === module) {
main();
}

module.exports = {
validateWorkflow
};

