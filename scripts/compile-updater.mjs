import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Finds the C# compiler (csc.exe) on the host Windows machine.
 * First checks .NET Framework 4.0/4.8 64-bit, then 32-bit, then PATH.
 * Returns null if not found or running on a non-Windows platform.
 */
export function findCscCompiler() {
  if (process.platform !== 'win32') {
    return null;
  }

  const candidates = [
    'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
    'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  try {
    const which = execSync('where.exe csc.exe 2>nul').toString().trim().split('\r\n')[0];
    if (which && fs.existsSync(which)) return which;
  } catch {}

  return null;
}

/**
 * Compiles updater/Program.cs into target output path (e.g. dist/p42-util-airspace-acars/Update.exe).
 * If csc.exe is unavailable (e.g. Linux / macOS test runners), seamlessly uses assets/Update.exe.
 * @param {string} [outputPath]
 * @returns {string} Path to generated Update.exe
 */
export function compileUpdater(outputPath) {
  const targetPath = outputPath || path.join(ROOT_DIR, 'dist', 'p42-util-airspace-acars', 'Update.exe');
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const cscPath = findCscCompiler();
  const fallbackAsset = path.join(ROOT_DIR, 'assets', 'Update.exe');

  if (cscPath) {
    const programCs = path.join(ROOT_DIR, 'updater', 'Program.cs');
    if (!fs.existsSync(programCs)) {
      throw new Error(`updater/Program.cs does not exist: ${programCs}`);
    }

    const thumbPath = path.join(ROOT_DIR, 'assets', 'Thumbnail.jpg');
    const iconPath = path.join(ROOT_DIR, 'assets', 'app.ico');

    const args = [
      '/nologo',
      '/target:winexe',
      '/platform:anycpu',
      '/optimize+',
      '/reference:System.dll',
      '/reference:System.Drawing.dll',
      '/reference:System.Windows.Forms.dll',
      '/reference:System.IO.Compression.dll',
      '/reference:System.IO.Compression.FileSystem.dll',
      '/reference:System.Net.Http.dll',
      '/reference:System.Web.Extensions.dll'
    ];

    if (fs.existsSync(iconPath)) {
      args.push(`/win32icon:"${iconPath}"`);
      args.push(`/resource:"${iconPath}",app.ico`);
    }

    if (fs.existsSync(thumbPath)) {
      args.push(`/resource:"${thumbPath}",Thumbnail.jpg`);
    }

    args.push(`/out:"${targetPath}"`);
    args.push(`"${programCs}"`);

    const cmd = `"${cscPath}" ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit' });

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Failed to compile Update.exe at: ${targetPath}`);
    }

    // Keep assets/Update.exe updated as a fallback for non-Windows platforms
    try {
      fs.copyFileSync(targetPath, fallbackAsset);
    } catch {}

    const stat = fs.statSync(targetPath);
    console.log(`[updater] Update.exe compiled successfully: ${targetPath} (${stat.size} bytes)`);
    return targetPath;
  }

  // Cross-platform fallback when csc.exe is absent (Linux, macOS, container runners)
  if (fs.existsSync(fallbackAsset)) {
    fs.copyFileSync(fallbackAsset, targetPath);
    const stat = fs.statSync(targetPath);
    console.log(`[updater] Notice: csc.exe not present on ${process.platform}. Copied precompiled Update.exe from assets (${stat.size} bytes)`);
    return targetPath;
  }

  if (fs.existsSync(targetPath)) {
    console.log(`[updater] Notice: csc.exe not present on ${process.platform}. Preserved existing ${targetPath}`);
    return targetPath;
  }

  console.warn(`[updater] Warning: csc.exe not available on ${process.platform}. Writing stub Update.exe.`);
  fs.writeFileSync(targetPath, Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00', 'binary'));
  return targetPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  compileUpdater();
}
