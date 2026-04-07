#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const cliArgs = process.argv.slice(2);
const locationFlags = cliArgs.filter((arg) =>
  ['--local', '--preview', '--remote'].includes(arg),
);

if (locationFlags.length > 1) {
  throw new Error(`Only one location flag is allowed, received: ${locationFlags.join(', ')}`);
}

const locationFlag = locationFlags[0] ?? '--remote';
const dbName = cliArgs.find((arg) => !arg.startsWith('--')) ?? 'cfblog-db';

function safeIdentifier(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }

  return name;
}

function quoteSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function quotePowerShellArg(value) {
  const text = String(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function runWrangler(extraArgs, { parseJson = false, quiet = false } = {}) {
  const args = ['wrangler', 'd1', 'execute', dbName, locationFlag, '--yes', ...extraArgs];

  if (!quiet) {
    console.log(`$ ${npxCommand} ${args.join(' ')}`);
  }

  try {
    const stdout =
      process.platform === 'win32'
        ? execFileSync(
            'powershell.exe',
            [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              `& ${quotePowerShellArg(npxCommand)} ${args.map(quotePowerShellArg).join(' ')}`,
            ],
            {
              cwd: repoRoot,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          )
        : execFileSync(npxCommand, args, {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          });

    return parseJson ? JSON.parse(stdout) : stdout;
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(String(error.stdout));
    }
    if (error.stderr) {
      process.stderr.write(String(error.stderr));
    }
    throw error;
  }
}

function executeSql(command) {
  runWrangler(['--command', command]);
}

function executeFile(relativePath) {
  runWrangler(['--file', `./${relativePath}`]);
}

function queryRows(command) {
  const output = runWrangler(['--command', command, '--json'], {
    parseJson: true,
    quiet: true,
  });

  if (!Array.isArray(output) || output.length === 0) {
    return [];
  }

  return Array.isArray(output[0]?.results) ? output[0].results : [];
}

function columnExists(tableName, columnName) {
  const table = safeIdentifier(tableName);
  return queryRows(`PRAGMA table_info(${table});`).some(
    (row) => String(row.name || '') === columnName,
  );
}

function tableExists(tableName) {
  return queryRows(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${quoteSqlString(tableName)};`,
  ).length > 0;
}

function indexExists(indexName) {
  return queryRows(
    `SELECT name FROM sqlite_master WHERE type = 'index' AND name = ${quoteSqlString(indexName)};`,
  ).length > 0;
}

function siteSettingsExist(keys) {
  if (!tableExists('site_settings')) {
    return false;
  }

  const keyList = keys.map((key) => quoteSqlString(key)).join(', ');
  const rows = queryRows(
    `SELECT setting_key FROM site_settings WHERE setting_key IN (${keyList});`,
  );
  const found = new Set(rows.map((row) => String(row.setting_key || '')));

  return keys.every((key) => found.has(key));
}

const migrationPlan = [
  {
    id: '0001_add_sticky_to_posts.sql',
    description: 'posts.sticky column and idx_posts_sticky index',
    isSatisfied() {
      return columnExists('posts', 'sticky') && indexExists('idx_posts_sticky');
    },
    reconcile() {
      const hasSticky = columnExists('posts', 'sticky');

      if (!hasSticky) {
        console.log(`Applying compatibility migration ${this.id}...`);
        executeFile(`migrations/${this.id}`);
      }

      if (!indexExists('idx_posts_sticky')) {
        console.log('Ensuring idx_posts_sticky exists...');
        executeSql('CREATE INDEX IF NOT EXISTS idx_posts_sticky ON posts(sticky);');
      }
    },
  },
  {
    id: '0002_add_moment_comments.sql',
    description: 'moment_comments table and related indexes',
    isSatisfied() {
      return (
        tableExists('moment_comments') &&
        indexExists('idx_moment_comments_moment') &&
        indexExists('idx_moment_comments_parent') &&
        indexExists('idx_moment_comments_status')
      );
    },
    reconcile() {
      console.log(`Applying compatibility migration ${this.id}...`);
      executeFile(`migrations/${this.id}`);
    },
  },
  {
    id: '0003_add_mail_notification_settings.sql',
    description: 'mail notification settings in site_settings',
    isSatisfied() {
      return siteSettingsExist([
        'mail_notifications_enabled',
        'notify_admin_on_comment',
        'notify_commenter_on_reply',
        'mail_from_name',
        'mail_from_email',
      ]);
    },
    reconcile() {
      console.log(`Applying compatibility migration ${this.id}...`);
      executeFile(`migrations/${this.id}`);
    },
  },
];

function main() {
  console.log(`Reconciling ${locationFlag.replace('--', '')} D1 schema for ${dbName}...`);

  console.log('Applying schema baseline from schema.sql...');
  executeFile('schema.sql');

  for (const migration of migrationPlan) {
    if (migration.isSatisfied()) {
      console.log(`Skipping ${migration.id}: ${migration.description} already present.`);
      continue;
    }

    migration.reconcile();

    if (!migration.isSatisfied()) {
      throw new Error(`Reconciliation failed for ${migration.id}.`);
    }

    console.log(`Reconciled ${migration.id}.`);
  }

  console.log('D1 schema reconciliation completed.');
}

main();
