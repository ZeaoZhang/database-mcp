/**
 * Binary manager for genai-toolbox binaries (内网版本 - 无外网依赖)
 *
 * 二进制查找顺序：
 * 1. CLI 参数 --binary-path
 * 2. 环境变量 TOOLBOX_PATH
 * 3. npm 包集成的二进制 (binaries/ 或平台特定包)
 * 4. 当前目录 ./binaries/
 * 5. 用户主目录 ~/.mcp-database/binaries/
 * 6. 系统 PATH
 */

import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import type { Platform, BinaryManagerOptions } from './types.js';

const require = createRequire(import.meta.url);

/**
 * Get current platform information
 */
export function getPlatform(): Platform {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap: Record<string, { os: Platform['os']; binaryName: string }> = {
    linux: { os: 'linux', binaryName: 'toolbox' },
    darwin: { os: 'darwin', binaryName: 'toolbox' },
    win32: { os: 'win32', binaryName: 'toolbox.exe' },
  };

  const archMap: Record<string, Platform['arch']> = {
    x64: 'x64',
    arm64: 'arm64',
  };

  if (!platformMap[platform]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (!archMap[arch]) {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return {
    ...platformMap[platform],
    arch: archMap[arch],
  };
}

/**
 * Get the expected binary name for current platform
 */
export function getBinaryName(): string {
  return getPlatform().binaryName;
}

/**
 * Check if a file exists and is executable
 */
function isExecutable(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) {
      return false;
    }
    const stats = statSync(filePath);
    // Check if it's a file (not directory) and has some size
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

/**
 * Try to find binary in system PATH
 */
function findInPath(binaryName: string): string | null {
  try {
    const command = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${command} ${binaryName}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const path = result.trim().split('\n')[0];
    return path && isExecutable(path) ? path : null;
  } catch {
    return null;
  }
}

/**
 * Get platform-specific package name
 */
function getPlatformPackageName(): string {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap: Record<string, string> = {
    'darwin-arm64': '@mcp-database/darwin-arm64',
    'darwin-x64': '@mcp-database/darwin-x64',
    'linux-arm64': '@mcp-database/linux-arm64',
    'linux-x64': '@mcp-database/linux-x64',
    'win32-x64': '@mcp-database/win32-x64',
  };

  return platformMap[`${platform}-${arch}`] || '';
}

/**
 * Try to find binary from platform-specific npm package
 */
function findFromPlatformPackage(): string | null {
  const packageName = getPlatformPackageName();
  if (!packageName) {
    return null;
  }

  try {
    const pkg = require(packageName);
    if (pkg.binaryPath && isExecutable(pkg.binaryPath)) {
      return pkg.binaryPath;
    }
  } catch {
    // Package not installed
  }

  return null;
}

/**
 * Try to find binary from bundled binaries directory
 */
function findFromBundledBinaries(): string | null {
  const platform = process.platform;
  const arch = process.arch;
  const binaryName = getBinaryName();

  const platformDir = `${platform}-${arch}`;
  const packageDir = dirname(new URL(import.meta.url).pathname);

  // 检查 binaries/<platform>/ 目录
  const searchPaths = [
    join(packageDir, '..', 'binaries', platformDir, binaryName),
    join(packageDir, '..', '..', 'binaries', platformDir, binaryName),
  ];

  for (const searchPath of searchPaths) {
    if (isExecutable(searchPath)) {
      return searchPath;
    }
  }

  return null;
}

/**
 * Search for binary in common locations
 */
export function findBinary(options: BinaryManagerOptions = {}): string | null {
  const binaryName = getBinaryName();
  const searchPaths: string[] = [];

  // 1. 用户通过选项指定的路径
  if (options.binaryPath) {
    if (isExecutable(options.binaryPath)) {
      return options.binaryPath;
    }
    // 如果指定的是目录，查找目录下的二进制
    const inDir = join(options.binaryPath, binaryName);
    if (isExecutable(inDir)) {
      return inDir;
    }
  }

  // 2. 环境变量 TOOLBOX_PATH
  const envPath = process.env.TOOLBOX_PATH;
  if (envPath) {
    if (isExecutable(envPath)) {
      return envPath;
    }
    const inEnvDir = join(envPath, binaryName);
    if (isExecutable(inEnvDir)) {
      return inEnvDir;
    }
  }

  // 3. 平台特定的 npm 包 (如 @mcp-database/darwin-arm64)
  const fromPlatformPkg = findFromPlatformPackage();
  if (fromPlatformPkg) {
    return fromPlatformPkg;
  }

  // 4. 集成在主包中的二进制 (binaries/<platform>/)
  const fromBundled = findFromBundledBinaries();
  if (fromBundled) {
    return fromBundled;
  }

  // 5. 当前工作目录下的 binaries 文件夹
  searchPaths.push(join(process.cwd(), 'binaries', binaryName));

  // 6. 当前工作目录
  searchPaths.push(join(process.cwd(), binaryName));

  // 7. 包安装目录下的 binaries 文件夹 (旧版兼容)
  const packageDir = dirname(new URL(import.meta.url).pathname);
  searchPaths.push(join(packageDir, '..', 'binaries', binaryName));
  searchPaths.push(join(packageDir, '..', '..', 'binaries', binaryName));

  // 8. 用户主目录下的 .mcp-database/binaries
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    searchPaths.push(join(homeDir, '.mcp-database', 'binaries', binaryName));
    searchPaths.push(join(homeDir, '.mcp-database', binaryName));
  }

  // 搜索所有路径
  for (const searchPath of searchPaths) {
    if (isExecutable(searchPath)) {
      return searchPath;
    }
  }

  // 9. 系统 PATH
  const inSystemPath = findInPath(binaryName);
  if (inSystemPath) {
    return inSystemPath;
  }

  return null;
}

/**
 * Check if binary exists at the specified path
 */
export function binaryExists(binaryPath: string): boolean {
  return isExecutable(binaryPath);
}

/**
 * Get binary path - throws if not found
 */
export function getBinaryPath(binaryDir?: string): string {
  const found = findBinary({ binaryPath: binaryDir });
  if (!found) {
    throw new Error(getBinaryNotFoundMessage());
  }
  return found;
}

/**
 * Generate helpful error message when binary is not found
 */
function getBinaryNotFoundMessage(): string {
  const binaryName = getBinaryName();
  const platform = getPlatform();
  const platformPackage = getPlatformPackageName();

  const osMap = {
    linux: 'linux',
    darwin: 'darwin',
    win32: 'windows',
  };

  const archMap = {
    x64: 'amd64',
    arm64: 'arm64',
  };

  const downloadUrl = `https://storage.googleapis.com/genai-toolbox/v0.21.0/${osMap[platform.os]}/${archMap[platform.arch]}/${binaryName}`;

  return `
genai-toolbox binary not found!

Option 1: Install platform-specific package (recommended for npm users)
  npm install ${platformPackage}

Option 2: Install full package with all platform binaries
  npm install @mcp-database/full

Option 3: Manual installation
  a. Set environment variable:
     export TOOLBOX_PATH=/path/to/${binaryName}

  b. Or place in current directory:
     ./binaries/${binaryName}

  c. Or place in home directory:
     ~/.mcp-database/binaries/${binaryName}

  d. Or add to system PATH

Download URL (for external network access):
${downloadUrl}

Or use Homebrew (if available):
brew install mcp-toolbox
`;
}

/**
 * Ensure binary is available (内网版本 - 不下载，只查找)
 */
export async function ensureBinary(options: BinaryManagerOptions = {}): Promise<string> {
  const binaryPath = findBinary(options);

  if (!binaryPath) {
    throw new Error(getBinaryNotFoundMessage());
  }

  return binaryPath;
}

/**
 * Verify binary by running --version
 */
export async function verifyBinary(binaryPath: string): Promise<string> {
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, ['--version']);

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim() || 'unknown version');
      } else {
        reject(
          new Error(
            `Binary verification failed with code ${code}` +
              (errorOutput ? `\nError: ${errorOutput}` : '')
          )
        );
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to execute binary: ${err.message}`));
    });
  });
}

/**
 * Get download instructions for manual installation
 */
export function getDownloadInstructions(): string {
  return getBinaryNotFoundMessage();
}
