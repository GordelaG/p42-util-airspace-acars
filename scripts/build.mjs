import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileUpdater } from './compile-updater.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PACKAGE_NAME = 'p42-util-airspace-acars';
const SCRIPT_UID = '8f4e2a10-9c3b-4d7e-b123-airspaceacars';

/**
 * Converts a JS Date / millisecond timestamp to Windows FILETIME (100-ns intervals since Jan 1, 1601 UTC)
 * as required by MSFS layout.json.
 * @param {number} mtimeMs
 * @returns {number}
 */
export function toWindowsFileTime(mtimeMs) {
  const EPOCH_DIFF_MS = 11644473600000n;
  const fileTime = (BigInt(Math.trunc(mtimeMs)) + EPOCH_DIFF_MS) * 10000n;
  return Number(fileTime);
}

/**
 * Normalizes a version string (e.g. "v1.2.3" -> "1.2.3").
 * @param {string} rawVersion
 * @returns {string}
 */
export function normalizeVersion(rawVersion) {
  const cleaned = String(rawVersion || '1.0.0').trim().replace(/^v/i, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : '1.0.0';
}

/**
 * Generates the ReadMe.txt included inside the MSFS 2024 Community package.
 * @param {string} version
 * @returns {string}
 */
function buildReadMeContent(version) {
  return [
    '===============================================================================',
    `Flow Pro Widget: Airspace ACARS (${PACKAGE_NAME}) v${version}`,
    'Target Simulator: Microsoft Flight Simulator 2024 (MSFS 2024)',
    '===============================================================================',
    '',
    'PT-BR | INSTRUCOES DE INSTALACAO',
    '--------------------------------',
    '1. Extraia a pasta "p42-util-airspace-acars" diretamente dentro da sua pasta',
    '   "Community" do Microsoft Flight Simulator 2024.',
    '2. Inicie o MSFS 2024, abra a roda do Parallel 42 Flow Pro, entre no modo de',
    '   edicao e adicione o script "Airspace ACARS" a partir da biblioteca.',
    '3. Clique no widget na roda do Flow (ou use a barra de pesquisa Otto digitando',
    '   "acars", "vocc", "doc SBGR", "briefing SBRJ", "notam") para abrir o painel.',
    '',
    'EN | INSTALLATION INSTRUCTIONS',
    '------------------------------',
    '1. Extract the "p42-util-airspace-acars" folder directly into your Microsoft',
    '   Flight Simulator 2024 "Community" folder.',
    '2. Launch MSFS 2024, open the Parallel 42 Flow Pro wheel, enter edit mode,',
    '   and add the "Airspace ACARS" widget from the script library.',
    '3. Click the widget on the Flow wheel (or use the Otto search bar with queries',
    '   such as "acars", "vocc", "doc SBGR", "briefing SBRJ", "notam") to open it.',
    ''
  ].join('\r\n');
}

/**
 * Minimal valid 1x1 dark-blue JPEG fallback if assets/Thumbnail.jpg is not present.
 */
const FALLBACK_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

/**
 * Builds the MSFS 2024 Community package inside dist/p42-util-airspace-acars.
 * @param {object} [options]
 * @param {string} [options.outDir]
 * @param {string} [options.version]
 */
export function buildPackage(options = {}) {
  const pkgJsonPath = path.join(ROOT_DIR, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  const rawVersion =
    options.version ||
    process.env.RELEASE_VERSION ||
    process.env.GITHUB_REF_NAME ||
    pkgJson.version ||
    '1.0.0';
  const version = normalizeVersion(rawVersion);

  const srcDir = path.join(ROOT_DIR, 'src');
  const codeJsPath = path.join(srcDir, 'code.js');
  const codeHtmlPath = path.join(srcDir, 'code.html');
  const codeCssPath = path.join(srcDir, 'code.css');

  for (const filePath of [codeJsPath, codeHtmlPath, codeCssPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo fonte obrigatorio nao encontrado: ${filePath}`);
    }
  }

  const rawCodeJs = fs.readFileSync(codeJsPath, 'utf8');
  const rawCodeHtml = fs.readFileSync(codeHtmlPath, 'utf8');
  const rawCodeCss = fs.readFileSync(codeCssPath, 'utf8');

  if (!rawCodeJs.trim() || !rawCodeHtml.trim() || !rawCodeCss.trim()) {
    throw new Error('Os arquivos src/code.js, src/code.html e src/code.css nao podem estar vazios.');
  }

  // Ensure inner strings remain 100% 7-bit ASCII even after FlowShare.exe deserializes the JSON
  const codeJs = rawCodeJs.replace(
    /[\u007f-\uffff]/g,
    (ch) => '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4)
  );
  const codeHtml = rawCodeHtml.replace(
    /[\u007f-\uffff]/g,
    (ch) => '&#' + ch.charCodeAt(0) + ';'
  );
  const codeCss = rawCodeCss.replace(
    /[\u007f-\uffff]/g,
    (ch) => '\\' + ch.charCodeAt(0).toString(16) + ' '
  );

  const distBaseDir = options.outDir || path.join(ROOT_DIR, 'dist');
  const packageRoot = path.join(distBaseDir, PACKAGE_NAME);

  // Clean existing package output
  if (fs.existsSync(packageRoot)) {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  const templatesDir = path.join(packageRoot, 'Flow', 'templates');
  const contentInfoDir = path.join(packageRoot, 'ContentInfo', PACKAGE_NAME);
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(contentInfoDir, { recursive: true });

  // 1. Write Flow/templates/p42-util-airspace-acars.json
  const nowMs = Date.now();
  const templatePayload = {
    app_version: `2024.${version}`,
    scripts: [
      {
        code: 'javascript',
        uid: SCRIPT_UID,
        name: 'Airspace ACARS',
        short: 'mdi:airplane',
        params: {
          code_js: codeJs,
          code_css: codeCss,
          code_html: codeHtml,
          last_edit: nowMs,
          tags: 'Airspace ACARS',
          can_otto: true,
          reference: 'airspace_acars',
          description:
            'Integracao Airspace ACARS para Parallel 42 Flow no MSFS 2024: mensagens do vOCC, pesquisa e leitura de documentos/briefings de aeroportos, conexao com Virtual Airlines (Device Code OAuth) e NOTAMs.',
          creator: 'Airspace',
          package: PACKAGE_NAME
        }
      }
    ]
  };

  const templateFilePath = path.join(templatesDir, `${PACKAGE_NAME}.json`);
  const jsonAsciiSafe = JSON.stringify(templatePayload, null, 2).replace(
    /[\u007f-\uffff]/g,
    (ch) => '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4)
  );
  fs.writeFileSync(templateFilePath, jsonAsciiSafe, 'utf8');

  // 2. Write ContentInfo/p42-util-airspace-acars/Thumbnail.jpg
  const assetThumbPath = path.join(ROOT_DIR, 'assets', 'Thumbnail.jpg');
  const targetThumbPath = path.join(contentInfoDir, 'Thumbnail.jpg');
  if (fs.existsSync(assetThumbPath)) {
    fs.copyFileSync(assetThumbPath, targetThumbPath);
  } else {
    fs.writeFileSync(targetThumbPath, Buffer.from(FALLBACK_JPEG_BASE64, 'base64'));
  }

  // 3. Write ReadMe.txt
  const readMePath = path.join(packageRoot, 'ReadMe.txt');
  fs.writeFileSync(readMePath, buildReadMeContent(version), 'utf8');

  // 3.5. Compile Update.exe into package root
  const updaterDestPath = path.join(packageRoot, 'Update.exe');
  compileUpdater(updaterDestPath);

  // 4. Collect all content files for layout.json
  const relativeFiles = [
    `ContentInfo/${PACKAGE_NAME}/Thumbnail.jpg`,
    `Flow/templates/${PACKAGE_NAME}.json`,
    'ReadMe.txt',
    'Update.exe'
  ];

  let totalSize = 0;
  const layoutEntries = relativeFiles.map((relPath) => {
    const absPath = path.join(packageRoot, ...relPath.split('/'));
    const stat = fs.statSync(absPath);
    totalSize += stat.size;
    return {
      path: relPath,
      size: stat.size,
      date: toWindowsFileTime(stat.mtimeMs)
    };
  });

  const layoutPayload = {
    content: layoutEntries
  };

  const layoutFilePath = path.join(packageRoot, 'layout.json');
  const layoutContent = JSON.stringify(layoutPayload, null, 2) + '\n';
  fs.writeFileSync(layoutFilePath, layoutContent, 'utf8');
  totalSize += Buffer.byteLength(layoutContent, 'utf8');

  // 5. Write manifest.json
  const manifestPayload = {
    dependencies: [],
    content_type: 'MISC',
    title: 'Flow - Airspace ACARS',
    manufacturer: 'Parallel 42',
    creator: 'Airspace',
    package_version: version,
    minimum_game_version: '1.2.0',
    release_notes: {
      neutral: {
        LastUpdate: `v${version} - Airspace ACARS for Parallel 42 Flow (MSFS 2024)`,
        OlderHistory: ''
      }
    },
    total_package_size: String(totalSize).padStart(20, '0')
  };

  const manifestFilePath = path.join(packageRoot, 'manifest.json');
  fs.writeFileSync(manifestFilePath, JSON.stringify(manifestPayload, null, 2) + '\n', 'utf8');

  return {
    packageName: PACKAGE_NAME,
    version,
    packageRoot,
    templateFilePath,
    layoutFilePath,
    manifestFilePath,
    layoutEntries
  };
}

// Execute when run directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = buildPackage();
  console.log(
    `[build] Pacote MSFS 2024 gerado com sucesso: ${result.packageRoot} (v${result.version})`
  );
  for (const entry of result.layoutEntries) {
    console.log(`  - ${entry.path} (${entry.size} bytes)`);
  }
}

