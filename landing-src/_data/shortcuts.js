const fs = require('node:fs');
const path = require('node:path');

const CATEGORY_META = {
  workspace: { label: 'Workspace' },
  tab: { label: 'Tabs' },
  pane: { label: 'Panes & splits' },
  panel: { label: 'Panel' },
  view: { label: 'Views & modes' },
  app: { label: 'App' },
};

const ORDER = ['workspace', 'tab', 'pane', 'panel', 'view', 'app'];

const parseActions = (src) => {
  const start = src.indexOf('export const ACTIONS = {');
  if (start < 0) throw new Error('ACTIONS not found');
  const afterStart = src.indexOf('{', start);
  const actions = [];
  const entryRe = /'([\w.]+)':\s*\{([\s\S]*?)\n\s*\},/g;
  entryRe.lastIndex = afterStart + 1;
  let m;
  while ((m = entryRe.exec(src)) !== null) {
    if (src.slice(entryRe.lastIndex, entryRe.lastIndex + 30).match(/^\s*\}\s*as const/)) {
      // guard against overshooting into post-ACTIONS code
    }
    const body = m[2];
    const label = body.match(/label:\s*'([^']+)'/)?.[1];
    const category = body.match(/category:\s*'([^']+)'/)?.[1];
    const mac = body.match(/display:\s*\{\s*mac:\s*'([^']+)'/)?.[1];
    const other = body.match(/other:\s*'([^']+)'/)?.[1];
    if (!label || !category || !mac || !other) continue;
    actions.push({ id: m[1], label, category, mac, other });
  }
  return actions;
};

module.exports = () => {
  const tsPath = path.resolve(__dirname, '../../src/lib/keyboard-shortcuts.ts');
  const src = fs.readFileSync(tsPath, 'utf8');
  const actions = parseActions(src);

  const byCategory = {};
  for (const a of actions) {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a);
  }

  return ORDER.filter((c) => byCategory[c]).map((c) => ({
    key: c,
    label: CATEGORY_META[c].label,
    actions: byCategory[c],
  }));
};
