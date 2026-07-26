import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations');
const migrations = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const expectedName = /^(\d{14})_[a-z0-9_]+\.sql$/;
const versions = new Set();
const failures = [];

for (const migration of migrations) {
  const match = migration.match(expectedName);
  if (!match) {
    failures.push(`${migration}: invalid filename`);
    continue;
  }

  const version = match[1];
  if (versions.has(version)) {
    failures.push(`${migration}: duplicate migration version ${version}`);
  }
  versions.add(version);

  const sql = readFileSync(join(migrationsDirectory, migration), 'utf8');
  if (sql.trim().length === 0) failures.push(`${migration}: empty migration`);
  if (/^(<{7}|={7}|>{7})/m.test(sql)) {
    failures.push(`${migration}: unresolved merge conflict`);
  }
  if (!sql.includes(';')) failures.push(`${migration}: no SQL statement terminator`);
}

if (failures.length > 0) {
  console.error('Migration validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${migrations.length} ordered migrations.`);
