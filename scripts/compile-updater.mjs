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
 */
export function findCscCompiler() {
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

  throw new Error('C# compiler csc.exe was not found on this system.');
}

/**
 * Compiles updater/Program.cs into target output path (e.g. dist/p42-util-airspace-acars/Update.exe).
 * @param {string} [outputPath]
 * @returns {string} Path to generated Update.exe
 */
export function compileUpdater(outputPath) {
  const cscPath = findCscCompiler();
  const targetPath = outputPath || path.join(ROOT_DIR, 'dist', 'p42-util-airspace-acars', 'Update.exe');
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

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

  const stat = fs.statSync(targetPath);
  console.log(`[updater] Update.exe compiled successfully: ${targetPath} (${stat.size} bytes)`);
  return targetPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  compileUpdater();
}

