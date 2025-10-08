#!/usr/bin/env node

import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const [,, command, profile] = process.argv;

const commands = ['copy', 'activate', 'sync'];

if (!command || !commands.includes(command) || !profile) {
  console.error(`\nUsage: node scripts/manage-env.mjs <command> <profile>\n`);
  console.error('Commands:');
  console.error('  copy <profile>     Create .env.<profile> from .env.example (no overwrite)');
  console.error('  activate <profile> Replace .env with .env.<profile>');
  console.error('  sync <profile>     Copy current .env into .env.<profile>');
  process.exit(1);
}

const examplePath = path.join(repoRoot, '.env.example');
const envPath = path.join(repoRoot, '.env');
const profilePath = path.join(repoRoot, `.env.${profile}`);

function requireExample() {
  if (!existsSync(examplePath)) {
    console.error('Missing .env.example. Create one before using this script.');
    process.exit(1);
  }
}

switch (command) {
  case 'copy': {
    requireExample();
    if (existsSync(profilePath)) {
      console.error(`.env.${profile} already exists. Aborting.`);
      process.exit(1);
    }
    copyFileSync(examplePath, profilePath);
    console.log(`Created .env.${profile} from .env.example`);
    break;
  }
  case 'activate': {
    if (!existsSync(profilePath)) {
      console.error(`.env.${profile} does not exist. Run "copy" first.`);
      process.exit(1);
    }
    copyFileSync(profilePath, envPath);
    console.log(`Activated profile ${profile} -> .env`);
    break;
  }
  case 'sync': {
    if (!existsSync(envPath)) {
      console.error('Missing .env. Create or activate an environment first.');
      process.exit(1);
    }
    copyFileSync(envPath, profilePath);
    console.log(`Synced .env to .env.${profile}`);
    break;
  }
  default:
    console.error('Unsupported command');
    process.exit(1);
}
