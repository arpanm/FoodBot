#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { assertPathAllowed, assertDiffFormat } from '../utils/guardrails.js';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function main() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const input = JSON.parse(fs.readFileSync(0, 'utf-8'));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { patch, target_paths } = input;

    assertDiffFormat(patch);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    target_paths.forEach(assertPathAllowed);

    const patchFile = path.join(process.cwd(), '.tmp_patch.diff');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    fs.writeFileSync(patchFile, patch);

    console.warn('Applying patch...');
    execSync(`git apply ${patchFile}`, { stdio: 'inherit' });

    fs.unlinkSync(patchFile);

    console.warn('Patch applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Patch failed:', err.message);
    process.exit(1);
  }
}

void main();
