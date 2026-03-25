const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '.next', 'node_modules');

if (!fs.existsSync(dir)) {
  console.log('[resolve-symlinks] .next/node_modules not found, skipping');
  process.exit(0);
}

for (const entry of fs.readdirSync(dir)) {
  const full = path.join(dir, entry);
  const stat = fs.lstatSync(full);
  if (!stat.isSymbolicLink()) continue;

  const target = fs.realpathSync(full);
  fs.unlinkSync(full);
  fs.cpSync(target, full, { recursive: true });
  console.log(`[resolve-symlinks] ${entry} -> copied`);
}
