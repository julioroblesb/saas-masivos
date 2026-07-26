import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);

const binaryExtensions = new Set([
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.lock',
  '.pdf',
  '.png',
  '.webp',
  '.woff',
  '.woff2',
]);

const rules = [
  {
    name: 'GitHub personal access token',
    expression: /github_pat_[A-Za-z0-9_]{20,}/g,
  },
  {
    name: 'GitHub classic token',
    expression: /ghp_[A-Za-z0-9]{30,}/g,
  },
  {
    name: 'Supabase secret key',
    expression: /sb_secret_[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Private key material',
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'Credential embedded in database URL',
    expression: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/gi,
  },
];

const allowedFragments = [
  '[YOUR-PASSWORD]',
  '<password>',
  'CHANGE_ME',
  'example-password',
  'localhost:5432',
  '${EVOLUTION_POSTGRES_PASSWORD}',
];

const findings = [];

for (const file of trackedFiles) {
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (binaryExtensions.has(extension)) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const rule of rules) {
    rule.expression.lastIndex = 0;
    for (const match of content.matchAll(rule.expression)) {
      const value = match[0];
      if (allowedFragments.some((fragment) => value.includes(fragment))) continue;
      const line = content.slice(0, match.index).split('\n').length;
      findings.push(`${file}:${line} (${rule.name})`);
    }
  }
}

if (findings.length > 0) {
  console.error('Potential secrets detected:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed for ${trackedFiles.length} tracked files.`);
