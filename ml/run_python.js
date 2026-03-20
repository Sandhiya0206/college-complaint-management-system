#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node ml/run_python.js <script.py> [...args]');
  process.exit(1);
}

const scriptPath = path.resolve(args[0]);
const scriptArgs = args.slice(1);

const candidates = [];

const localVenvPython = process.platform === 'win32'
  ? path.resolve(__dirname, '..', '.venv', 'Scripts', 'python.exe')
  : path.resolve(__dirname, '..', '.venv', 'bin', 'python');

candidates.push({ command: localVenvPython, args: [] });

if (process.env.YOLO_PYTHON) candidates.push({ command: process.env.YOLO_PYTHON, args: [] });
if (process.env.PYTHON_BIN) candidates.push({ command: process.env.PYTHON_BIN, args: [] });
if (process.env.PYTHON) candidates.push({ command: process.env.PYTHON, args: [] });

if (process.platform === 'win32') {
  candidates.push({ command: 'py', args: ['-3'] });
}

candidates.push({ command: 'python', args: [] });
candidates.push({ command: 'python3', args: [] });

let lastError = null;

for (const candidate of candidates) {
  const result = spawnSync(candidate.command, [...candidate.args, scriptPath, ...scriptArgs], {
    stdio: 'inherit',
    shell: false
  });

  if (!result.error) {
    process.exit(result.status === null ? 1 : result.status);
  }

  if (result.error.code !== 'ENOENT') {
    lastError = result.error;
    break;
  }

  lastError = result.error;
}

console.error('Unable to find a usable Python executable.');
if (lastError) {
  console.error(lastError.message);
}
process.exit(1);
