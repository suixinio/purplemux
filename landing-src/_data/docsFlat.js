const docsNav = require('./docsNav');

module.exports = docsNav.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.group })),
);
