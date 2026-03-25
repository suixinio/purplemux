#!/usr/bin/env node

const path = require('path');

process.env.__PT_APP_DIR = path.resolve(__dirname, '..');
require('../dist/server.js');
