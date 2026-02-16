#!/usr/bin/env node

import fs from 'fs';

import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function main() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const input = JSON.parse(fs.readFileSync(0, 'utf-8'));

    const response = await axios.post(
      process.env.TEMPORAL_GATEWAY || 'http://localhost:8088/workflow/start',
      input
    );

    console.warn('Workflow started:', response.data);
    process.exit(0);
  } catch (err) {
    console.error('Temporal dispatch failed:', err.message);
    process.exit(1);
  }
}

void main();
