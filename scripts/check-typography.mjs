import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('apps/web/src');
const extensions = new Set(['.css', '.ts', '.tsx']);
const violations = [];

const rules = [
  {
    name: 'No se permiten tamaños tipográficos inferiores a 12px',
    pattern: /text-\[(?:[0-9]|1[01])px\]|font-size\s*:\s*(?:[0-9]|1[01])px/g,
  },
  {
    name: 'No se permiten fuentes web o familias antiguas',
    pattern: /fonts\.googleapis|next\/font|Nunito|Outfit|font-outfit/g,
  },
  {
    name: 'No se permiten tamaños tipográficos arbitrarios',
    pattern: /text-\[(?!#[0-9a-fA-F]{3,8}\])[^'"\]\s]+\]/g,
  },
  {
    name: 'No se permiten interlineados arbitrarios',
    pattern: /leading-\[[^\]]+\]/g,
  },
];

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(absolute);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;

    const source = await readFile(absolute, 'utf8');
    const lines = source.split(/\r?\n/);

    for (const rule of rules) {
      for (let index = 0; index < lines.length; index += 1) {
        rule.pattern.lastIndex = 0;
        const matches = lines[index].match(rule.pattern);
        if (!matches) continue;

        violations.push({
          file: path.relative(process.cwd(), absolute),
          line: index + 1,
          rule: rule.name,
          matches: [...new Set(matches)].join(', '),
        });
      }
    }
  }
}

await visit(root);

const globalCss = await readFile(path.join(root, 'app/globals.css'), 'utf8');
const contracts = [
  ['pila system-ui', '--font-sans: system-ui'],
  ['números tabulares', 'font-variant-numeric: tabular-nums lining-nums'],
  ['longitud narrativa', 'max-width: 65ch'],
  ['título de página', '@utility type-page-title'],
  ['métrica empresarial', '@utility type-metric'],
  ['columna cuantitativa', '@utility numeric-column'],
];

for (const [name, token] of contracts) {
  if (!globalCss.includes(token)) {
    violations.push({
      file: 'apps/web/src/app/globals.css',
      line: 1,
      rule: `Falta el contrato global: ${name}`,
      matches: token,
    });
  }
}

if (violations.length > 0) {
  console.error('El contrato tipográfico empresarial no se cumple:\n');
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} — ${violation.rule} (${violation.matches})`,
    );
  }
  process.exit(1);
}

console.log('Contrato tipográfico empresarial validado.');
