#!/usr/bin/env node

import fs from 'fs';

import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function main() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const event = JSON.parse(fs.readFileSync(0, 'utf-8'));

    await axios.post(process.env.OBSERVABILITY_URL || 'http://localhost:8090/events', event);

    console.warn('Telemetry event sent');
    process.exit(0);
  } catch (err) {
    console.error('Telemetry failed:', err.message);
    process.exit(1);
  }
}

void main();
