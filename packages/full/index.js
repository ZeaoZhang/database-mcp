const { join } = require('path');

const platform = process.platform;
const arch = process.arch;
const platformDir = `${platform}-${arch}`;
const binaryName = platform === 'win32' ? 'toolbox.exe' : 'toolbox';

module.exports = {
  binaryPath: join(__dirname, 'binaries', platformDir, binaryName),
};

// Re-export everything from mcp-database
module.exports.mcpDatabase = require('mcp-database');
