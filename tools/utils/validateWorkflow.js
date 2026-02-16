#!/usr/bin/env node

/**
 * Workflow Validator
 * Ensures all LLM-generated workflows conform to the contract
 */

import fs from 'fs';
import path from 'path';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = path.resolve('.ai/schema/workflow.schema.json');

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function loadSchema() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Workflow schema not found at ${SCHEMA_PATH}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createValidator(schema) {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  return ajv.compile(schema);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function validateWorkflow(workflow, validateFn) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const valid = validateFn(workflow);

  if (!valid) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const errors = validateFn.errors.map(err => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      field: err.instancePath || err.schemaPath,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      message: err.message,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { valid: false, errors };
  }

  return { valid: true };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function readInput() {
  const input = fs.readFileSync(0, 'utf-8'); // stdin
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(input);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function main() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const schema = loadSchema();
    const validator = createValidator(schema);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const workflow = readInput();

    const result = validateWorkflow(workflow, validator);

    if (!result.valid) {
      console.error('❌ Workflow validation failed:');
      console.error(JSON.stringify(result.errors, null, 2));
      process.exit(1);
    }

    console.warn('✅ Workflow is valid.');
    process.exit(0);
  } catch (err) {
    console.error('Validator error:', err.message);
    process.exit(1);
  }
}

// ESM equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateWorkflow };
