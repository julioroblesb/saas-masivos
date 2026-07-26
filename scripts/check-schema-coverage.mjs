import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const snapshot = JSON.parse(
  fs.readFileSync(path.join(root, 'supabase/snapshots/production-schema.json'), 'utf8'),
);
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, 'supabase/snapshots/production-catalog.json'), 'utf8'),
);
const migrationsDirectory = path.join(root, 'supabase/migrations');
const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith('.sql'))
  .sort();
const sql = migrationFiles
  .map((file) => fs.readFileSync(path.join(migrationsDirectory, file), 'utf8'))
  .join('\n')
  .toLowerCase();

const localColumns = new Map();

for (const table of snapshot.tables) {
  const columns = new Set();
  const escapedTable = table.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const createPattern = new RegExp(
    `create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+(?:public\\.)?${escapedTable}\\s*\\(([\\s\\S]*?)\\n\\s*\\);`,
    'gi',
  );

  for (const match of sql.matchAll(createPattern)) {
    for (const line of match[1].split('\n')) {
      const columnMatch = line.match(/^\s*"?([a-z_][a-z0-9_]*)"?\s+/i);
      if (
        columnMatch &&
        !['constraint', 'primary', 'foreign', 'unique', 'check'].includes(columnMatch[1])
      ) {
        columns.add(columnMatch[1]);
      }
    }
  }

  const alterPattern = new RegExp(
    `alter\\s+table\\s+(?:public\\.)?${escapedTable}\\s+([\\s\\S]*?);`,
    'gi',
  );
  for (const match of sql.matchAll(alterPattern)) {
    const addColumnPattern = /add\s+column(?:\s+if\s+not\s+exists)?\s+"?([a-z_][a-z0-9_]*)"?/gi;
    for (const columnMatch of match[1].matchAll(addColumnPattern)) {
      columns.add(columnMatch[1]);
    }
  }

  localColumns.set(table.name, columns);
}

const missingColumns = snapshot.tables.flatMap((table) =>
  table.columns
    .filter((column) => !localColumns.get(table.name)?.has(column.name))
    .map((column) => `${table.name}.${column.name}`),
);

const liveFunctions = [
  ...new Set(
    catalog.objects
      .filter((object) => object.kind === 'function')
      .map((object) => object.name.split('(')[0]),
  ),
];
const ignoredLegacyFunctions = new Set();
const missingFunctions = liveFunctions.filter(
  (name) =>
    !ignoredLegacyFunctions.has(name) &&
    !new RegExp(`create(?:\\s+or\\s+replace)?\\s+function\\s+(?:public\\.)?${name}\\b`, 'i').test(
      sql,
    ),
);

const versions = migrationFiles.map((file) => file.split('_')[0]);
const duplicateVersions = versions.filter((version, index) => versions.indexOf(version) !== index);

const report = {
  migrationFiles: migrationFiles.length,
  duplicateVersions: [...new Set(duplicateVersions)],
  tables: snapshot.tables.length,
  missingColumns,
  functions: liveFunctions.length,
  missingFunctions,
  ignoredLegacyFunctions: [...ignoredLegacyFunctions],
};

console.log(JSON.stringify(report, null, 2));

if (
  report.duplicateVersions.length > 0 ||
  report.missingColumns.length > 0 ||
  report.missingFunctions.length > 0
) {
  process.exitCode = 1;
}
