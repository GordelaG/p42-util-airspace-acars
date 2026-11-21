import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const UPDATER_EXE_NAME = 'AirspaceACARS-Manager.exe';

/**
 * Normalizes a semantic version string (e.g. "v1.2.3" -> "1.2.3").
 * @param {string} rawVersion
 * @returns {string}
 */
function normalizeSemver(rawVersion) {
  const cleaned = String(rawVersion || '1.0.0').trim().replace(/^v/i, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : '1.0.0';
}

/**
 * Finds the installed .NET Framework 4.x reference directory on Windows.
 * @returns {string|null}
 */
export function findNetFxDir() {
  if (process.platform !== 'win32') return null;

  const candidates = [
    'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319',
    'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319'
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'mscorlib.dll'))) {
      return dir;
    }
  }
  return null;
}

/**
 * Finds the modern Roslyn C# compiler (csc.dll from .NET SDK) on Windows.
 * Compiling with modern Roslyn produces clean, deterministic PE binaries with
 * current linker metadata rather than legacy .NET 4.0 csc.exe signatures.
 * @returns {{ dotnetPath: string, roslynCscDll: string } | null}
 */
export function findRoslynCompiler() {
  if (process.platform !== 'win32') return null;

  const dotnetRoots = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'dotnet'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'dotnet')
  ];

  for (const root of dotnetRoots) {
    const dotnetExe = path.join(root, 'dotnet.exe');
    const sdkRoot = path.join(root, 'sdk');
    if (!fs.existsSync(dotnetExe) || !fs.existsSync(sdkRoot)) continue;

    try {
      const sdks = fs
        .readdirSync(sdkRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
        .reverse();

      for (const sdkVer of sdks) {
        const cscDll = path.join(sdkRoot, sdkVer, 'Roslyn', 'bincore', 'csc.dll');
        if (fs.existsSync(cscDll)) {
          return { dotnetPath: dotnetExe, roslynCscDll: cscDll };
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Finds the fallback legacy C# compiler (csc.exe) on the host Windows machine.
 * Returns null if not found or running on a non-Windows platform.
 */
export function findCscCompiler() {
  if (process.platform !== 'win32') {
    return null;
  }

  const netFxDir = findNetFxDir();
  if (netFxDir) {
    const csc = path.join(netFxDir, 'csc.exe');
    if (fs.existsSync(csc)) return csc;
  }

  try {
    const which = execSync('where.exe csc.exe 2>nul').toString().trim().split('\r\n')[0];
    if (which && fs.existsSync(which)) return which;
  } catch {}

  return null;
}

/**
 * Builds C# AssemblyInfo source with complete PE VersionInfo metadata.
 * @param {string} version
 * @returns {string}
 */
function buildAssemblyInfoSource(version) {
  const cleanVersion = normalizeSemver(version);
  const winVersion = `${cleanVersion}.0`;

  return `using System.Reflection;
using System.Resources;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

[assembly: AssemblyTitle("Airspace ACARS Manager")]
[assembly: AssemblyDescription("Official Package Manager and Updater for Airspace ACARS (Parallel 42 Flow Pro)")]
[assembly: AssemblyConfiguration("Release")]
[assembly: AssemblyCompany("Airspace Team (FerrLab)")]
[assembly: AssemblyProduct("Airspace ACARS for Microsoft Flight Simulator")]
[assembly: AssemblyCopyright("Copyright (c) 2026 Airspace Team (FerrLab)")]
[assembly: AssemblyTrademark("Airspace ACARS")]
[assembly: AssemblyCulture("")]
[assembly: ComVisible(false)]
[assembly: Guid("8f4e2a10-9c3b-4d7e-b123-616972737061")]
[assembly: NeutralResourcesLanguage("en-US")]
[assembly: TargetFramework(".NETFramework,Version=v4.8", FrameworkDisplayName = ".NET Framework 4.8")]
[assembly: AssemblyVersion("${winVersion}")]
[assembly: AssemblyFileVersion("${winVersion}")]
[assembly: AssemblyInformationalVersion("${cleanVersion}")]
`;
}

/**
 * Compiles updater/Program.cs into target output path (e.g. dist/p42-util-airspace-acars/AirspaceACARS-Manager.exe).
 * Prefers modern Roslyn csc.dll targeting .NET Framework 4.8 for clean, deterministic PE binaries,
 * falling back to native csc.exe on Windows or assets/AirspaceACARS-Manager.exe on non-Windows runners.
 * @param {string} [outputPath]
 * @param {{ version?: string }} [options]
 * @returns {string} Path to generated AirspaceACARS-Manager.exe
 */
export function compileUpdater(outputPath, options = {}) {
  const targetPath = outputPath || path.join(ROOT_DIR, 'dist', 'p42-util-airspace-acars', UPDATER_EXE_NAME);
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let pkgVersion = options.version || process.env.RELEASE_VERSION || '';
  if (!pkgVersion) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      pkgVersion = pkg.version || '1.0.0';
    } catch {
      pkgVersion = '1.0.0';
    }
  }
  const cleanVersion = normalizeSemver(pkgVersion);

  const fallbackAsset = path.join(ROOT_DIR, 'assets', UPDATER_EXE_NAME);
  const netFxDir = findNetFxDir();
  const roslyn = netFxDir ? findRoslynCompiler() : null;
  const legacyCscPath = findCscCompiler();

  if (roslyn || legacyCscPath) {
    const programCs = path.join(ROOT_DIR, 'updater', 'Program.cs');
    if (!fs.existsSync(programCs)) {
      throw new Error(`updater/Program.cs does not exist: ${programCs}`);
    }

    const iconPath = path.join(ROOT_DIR, 'assets', 'app.ico');
    const manifestPath = path.join(ROOT_DIR, 'updater', 'app.manifest');
    const tempAsmInfoPath = path.join(
      os.tmpdir(),
      `airspace-acars-assemblyinfo-${process.pid}-${Date.now()}.cs`
    );

    fs.writeFileSync(tempAsmInfoPath, buildAssemblyInfoSource(cleanVersion), 'utf8');

    const refNames = [
      'System.dll',
      'System.Core.dll',
      'System.Drawing.dll',
      'System.Windows.Forms.dll',
      'System.IO.Compression.dll',
      'System.IO.Compression.FileSystem.dll',
      'System.Net.Http.dll',
      'System.Web.Extensions.dll'
    ];

    try {
      const commonFlags = [
        '/nologo',
        '/target:winexe',
        '/platform:anycpu',
        '/optimize+',
        '/debug-',
        '/highentropyva+',
        '/subsystemversion:6.00'
      ];

      if (fs.existsSync(iconPath)) {
        commonFlags.push(`/win32icon:${iconPath}`);
      }

      if (fs.existsSync(manifestPath)) {
        commonFlags.push(`/win32manifest:${manifestPath}`);
      }

      if (roslyn && netFxDir) {
        const roslynArgs = [
          'exec',
          roslyn.roslynCscDll,
          ...commonFlags,
          '/deterministic+',
          '/nostdlib+',
          `/reference:${path.join(netFxDir, 'mscorlib.dll')}`,
          ...refNames.map((r) => `/reference:${path.join(netFxDir, r)}`),
          `/out:${targetPath}`,
          tempAsmInfoPath,
          programCs
        ];
        execFileSync(roslyn.dotnetPath, roslynArgs, { stdio: 'inherit' });
      } else {
        const cscArgs = [
          ...commonFlags,
          ...refNames.map((r) => `/reference:${r}`),
          `/out:${targetPath}`,
          tempAsmInfoPath,
          programCs
        ];
        execFileSync(legacyCscPath, cscArgs, { stdio: 'inherit' });
      }
    } finally {
      try {
        if (fs.existsSync(tempAsmInfoPath)) fs.unlinkSync(tempAsmInfoPath);
      } catch {}
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Failed to compile ${UPDATER_EXE_NAME} at: ${targetPath}`);
    }

    // Keep assets/AirspaceACARS-Manager.exe updated as a fallback for non-Windows platforms
    try {
      fs.copyFileSync(targetPath, fallbackAsset);
    } catch {}

    const stat = fs.statSync(targetPath);
    const compilerLabel = roslyn ? 'Roslyn' : 'csc.exe';
    console.log(
      `[updater] ${UPDATER_EXE_NAME} v${cleanVersion} compiled via ${compilerLabel}: ${targetPath} (${stat.size} bytes)`
    );
    return targetPath;
  }

  // Cross-platform fallback when no Windows C# compiler is present (Linux, macOS, containers)
  if (fs.existsSync(fallbackAsset)) {
    fs.copyFileSync(fallbackAsset, targetPath);
    const stat = fs.statSync(targetPath);
    console.log(
      `[updater] Notice: C# compiler not present on ${process.platform}. Copied precompiled ${UPDATER_EXE_NAME} from assets (${stat.size} bytes)`
    );
    return targetPath;
  }

  if (fs.existsSync(targetPath)) {
    console.log(
      `[updater] Notice: C# compiler not present on ${process.platform}. Preserved existing ${targetPath}`
    );
    return targetPath;
  }

  console.warn(`[updater] Warning: C# compiler not available on ${process.platform}. Writing stub ${UPDATER_EXE_NAME}.`);
  fs.writeFileSync(targetPath, Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00', 'binary'));
  return targetPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  compileUpdater();
}
