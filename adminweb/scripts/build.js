#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get all arguments except node and script name
const args = process.argv.slice(2);

// Filter out --no-lint flag as it's not supported in Next.js 16.1.6
const filteredArgs = args.filter(arg => arg !== '--no-lint');

// Find next binary
const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');

// Verify next binary exists
if (!fs.existsSync(nextBin)) {
  console.error('Error: Next.js binary not found at', nextBin);
  process.exit(1);
}

// Spawn next build with filtered arguments
// We always use 'build' as the command, and pass through other flags like --turbopack
const child = spawn('node', [nextBin, 'build', ...filteredArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('error', (error) => {
  console.error('Error spawning Next.js build:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
