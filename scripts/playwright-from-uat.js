#!/usr/bin/env node
/**
 * Run Playwright spec for a phase and merge results into UAT.
 * Usage: node scripts/playwright-from-uat.js --uat <path> | --phase <NN>
 *
 * - Runs npx playwright test e2e/<phase>-*.spec.ts --reporter=json
 * - Parses JSON for test title "N. Name" and ok (true/false)
 * - Updates UAT: tests with result [pending] get result: pass or result: issue
 * - Recomputes Summary and Current Test
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  let uatPath = null;
  let phase = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--uat' && args[i + 1]) {
      uatPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === '--phase' && args[i + 1]) {
      phase = args[i + 1].replace(/^0+/, '') || '1';
      phase = phase.padStart(2, '0');
      i++;
    }
  }
  if (uatPath && fs.existsSync(uatPath)) return { uatPath };
  if (phase) {
    const phaseDir = path.join(process.cwd(), '.planning', 'phases');
    const dirs = fs.readdirSync(phaseDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    const match = dirs.find((d) => d.name.startsWith(phase + '-'));
    if (match) {
      const uat = path.join(phaseDir, match.name, `${phase}-${match.name.split('-')[1]}-UAT.md`);
      const alt = path.join(phaseDir, match.name, `${match.name.split('-')[0]}-UAT.md`);
      const candidates = [path.join(phaseDir, match.name, `${phase}-UAT.md`), uat, alt];
      for (const c of candidates) {
        if (fs.existsSync(c)) return { uatPath: c };
      }
      return { uatPath: path.join(phaseDir, match.name, `${phase}-UAT.md`) };
    }
  }
  return {};
}

function findSpecForPhase(uatPath) {
  const phasesDir = path.dirname(uatPath);
  const phaseName = path.basename(phasesDir);
  const phaseNum = phaseName.split('-')[0];
  const e2eDir = path.join(process.cwd(), 'e2e');
  if (!fs.existsSync(e2eDir)) return null;
  const specName = `${phaseNum}-${phaseName.split('-').slice(1).join('-')}.spec.ts`;
  const specPath = path.join(e2eDir, specName);
  if (fs.existsSync(specPath)) return specPath;
  const files = fs.readdirSync(e2eDir);
  const match = files.find((f) => f.startsWith(phaseNum + '-') && f.endsWith('.spec.ts'));
  return match ? path.join(e2eDir, match) : null;
}

function runPlaywright(specPath) {
  const rel = path.relative(process.cwd(), specPath);
  try {
    const out = execSync(`npx playwright test "${rel}" --reporter=json`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out;
  } catch (err) {
    return (err.stdout || '') + (err.stderr || '');
  }
}

function extractResults(jsonStr) {
  const results = {};
  let obj;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    return results;
  }
  function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.title === 'string' && typeof o.ok === 'boolean') {
      const m = o.title.match(/^\s*(\d+)\.\s*(.+)$/);
      if (m) results[parseInt(m[1], 10)] = { ok: o.ok, title: o.title };
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) v.forEach(walk);
      else walk(v);
    }
  }
  walk(obj);
  return results;
}

function parseUAT(content) {
  const tests = [];
  const block = /^### (\d+)\. (.+)$/gm;
  let m;
  while ((m = block.exec(content)) !== null) {
    const start = m.index;
    const num = parseInt(m[1], 10);
    const name = m[2].trim();
    const rest = content.slice(start + m[0].length);
    const nextBlock = rest.match(/^### \d+\. /m);
    const blockEnd = nextBlock ? rest.indexOf(nextBlock[0]) : rest.length;
    const blockContent = rest.slice(0, blockEnd);
    const fullBlock = m[0] + blockContent;
    const resultMatch = blockContent.match(/result:\s*(\S+)/);
    const raw = resultMatch ? resultMatch[1].trim() : 'pending';
    const result = raw === '[pending]' || raw === 'pending' ? '[pending]' : raw;
    const expectedMatch = blockContent.match(/expected:\s*(.+?)(?=\n\w|\n\n|$)/s);
    const expected = expectedMatch ? expectedMatch[1].trim() : '';
    tests.push({ num, name, result, fullBlock, expected, start });
  }
  return tests;
}

function updateUATContent(content, playwrightResults) {
  const tests = parseUAT(content);
  let firstPending = null;
  const updates = [];
  for (const t of tests) {
    if (t.result !== '[pending]') continue;
    if (firstPending === null) firstPending = t.num;
    const pw = playwrightResults[t.num];
    if (pw === undefined) continue;
    const newResult = pw.ok
      ? `result: pass`
      : `result: issue\nreported: "Playwright: failed"\nseverity: major`;
    const newFullBlock = t.fullBlock.replace(/result:\s*(?:\[\s*pending\s*\]|pending)(\n(?:reported:|severity:).*)?/, newResult);
    updates.push({ start: t.start, oldLen: t.fullBlock.length, newFullBlock });
  }
  let out = content;
  for (const u of updates.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, u.start) + u.newFullBlock + out.slice(u.start + u.oldLen);
  }
  out = recomputeSummary(out);
  out = updateCurrentTest(out, firstPending);
  out = updateFrontmatterTimestamp(out);
  return out;
}

function recomputeSummary(content) {
  const tests = parseUAT(content);
  let passed = 0,
    issues = 0,
    pending = 0,
    skipped = 0;
  for (const t of tests) {
    if (t.result === 'pass') passed++;
    else if (t.result === 'issue') issues++;
    else if (t.result === 'skipped') skipped++;
    else pending++;
  }
  const total = tests.length;
  const summary = `total: ${total}\npassed: ${passed}\nissues: ${issues}\npending: ${pending}\nskipped: ${skipped}`;
  return content.replace(
    /## Summary\n\n(total: \d+\npassed: \d+\nissues: \d+\npending: \d+\nskipped: \d+)/m,
    `## Summary\n\n${summary}`
  );
}

function updateCurrentTest(content, firstPendingNum) {
  if (firstPendingNum === null) {
    return content.replace(
      /## Current Test\n\n[\s\S]*?awaiting: user response/,
      '## Current Test\n\n[testing complete - no pending tests]'
    );
  }
  const tests = parseUAT(content);
  const t = tests.find((x) => x.num === firstPendingNum);
  if (!t) return content;
  const newCurrent = `number: ${t.num}\nname: ${t.name}\nexpected: |\n  ${t.expected.split('\n').join('\n  ')}\nawaiting: user response`;
  return content.replace(/## Current Test\n\n[\s\S]*?(?=\n## Tests)/, `## Current Test\n\n${newCurrent}\n\n`);
}

function updateFrontmatterTimestamp(content) {
  const now = new Date().toISOString();
  return content.replace(/^updated: .+$/m, `updated: ${now}`);
}

function main() {
  const { uatPath } = parseArgs();
  if (!uatPath) {
    console.error('Usage: node scripts/playwright-from-uat.js --uat <path> | --phase <NN>');
    process.exit(1);
  }
  const specPath = findSpecForPhase(uatPath);
  if (!specPath) {
    console.warn('No Playwright spec found for this phase; skipping.');
    process.exit(0);
  }
  console.log('Running Playwright:', path.relative(process.cwd(), specPath));
  const jsonStr = runPlaywright(specPath);
  const results = extractResults(jsonStr);
  if (Object.keys(results).length === 0) {
    console.warn('No test results parsed (run may have failed).');
    process.exit(0);
  }
  const content = fs.readFileSync(uatPath, 'utf-8');
  const updated = updateUATContent(content, results);
  fs.writeFileSync(uatPath, updated);
  console.log('Updated UAT:', uatPath);
}

main();
