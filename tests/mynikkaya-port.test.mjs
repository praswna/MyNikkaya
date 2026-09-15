import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, env = {}, imports = {}) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, URL, process: { env },
    require: (name) => { assert.ok(name in imports, `Unexpected import: ${name}`); return imports[name]; } });
  return loaded.exports;
}

test('all new read formats use MyNikkaya configuration and preserve URL parameters', () => {
  const { sheetReadUrl } = load('../lib/config.ts', { GOOGLE_SHEETS_URL: 'https://example.com/mynikkaya/exec?format=csv&v=1' });
  for (const format of ['csv', 'settings', 'quiz']) {
    const url = sheetReadUrl(format);
    assert.equal(url.pathname, '/mynikkaya/exec');
    assert.equal(url.searchParams.get('format'), format);
    assert.equal(url.searchParams.get('v'), '1');
  }
});

test('missing sheet configuration fails locally rather than using the study-note sheet', () => {
  assert.throws(() => load('../lib/config.ts').sheetReadUrl('quiz'), /GOOGLE_SHEETS_URL/);
  assert.equal(load('../lib/config.ts', { APPS_SCRIPT_URL: 'https://example.com/exec' }).sheetReadUrl('settings').searchParams.get('format'), 'settings');
});

test('existing light and dark color customizations migrate without losing chosen colors', () => {
  const theme = load('../lib/theme.ts');
  const { resolveColorOverrides } = load('../lib/color-storage.ts', {}, { './theme': theme });
  for (const mode of ['dark', 'light']) {
    const colors = resolveColorOverrides(null, JSON.stringify({ [mode]: { bg: '#123456' } }), mode);
    assert.equal(colors.bg, '#123456');
    assert.equal(colors.text, theme.THEMES[mode].text);
    assert.ok(colors.textAccent);
    assert.ok(colors.categoryParentText);
  }
  assert.equal(resolveColorOverrides('{"bg":"#ABCDEF"}', '{"dark":{"bg":"#123456"}}', 'dark').bg, '#ABCDEF');
});

test('the bundled Buddhist corpus remains readable and indexed by the canon map', () => {
  const { parseGoogleSheetsCSV } = load('../lib/csv.ts');
  const quotes = parseGoogleSheetsCSV(readFileSync(new URL('../public/quotes_export.csv', import.meta.url), 'utf8'));
  assert.equal(quotes.length, 32);
  assert.ok(quotes.some(q => q.category === '대열반경'));
  const { buildCanonIndex } = load('../lib/canon.ts');
  const index = buildCanonIndex(quotes);
  assert.ok(Object.values(index.subtreeCount).some(count => count > 0));
});
