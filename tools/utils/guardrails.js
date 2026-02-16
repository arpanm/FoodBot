import path from 'path';

const PROTECTED_PATHS = ['/.ai', '/packages/contracts'];

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function assertPathAllowed(targetPath) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const normalized = path.resolve(targetPath);

  for (const blocked of PROTECTED_PATHS) {
    if (normalized.includes(blocked)) {
      throw new Error(`Write denied to protected path: ${blocked}`);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function assertDiffFormat(patch) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  if (!patch.includes('---') || !patch.includes('+++')) {
    throw new Error('Patch must be unified diff format');
  }
}

export { assertPathAllowed, assertDiffFormat };
