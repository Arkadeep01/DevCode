/**
 * Type-checks the server the way the hosting platform's builder does.
 *
 * The project's own `npm run build` runs `tsc -p tsconfig.json`, which
 * resolves modules with `moduleResolution: NodeNext`. The platform build
 * (Vercel's Node/Express builder) type-checks the same sources through a
 * language service whose `resolveModuleNames` hook calls the legacy
 * `ts.resolveModuleName()` API *without* a `resolutionMode` argument. That
 * API always resolves in CommonJS mode, so a package such as `helmet` is
 * resolved to its CommonJS declaration file instead of its ESM one.
 *
 * For an ES module importing a CommonJS module, TypeScript then binds the
 * default import to `module.exports` — the whole namespace — so code such
 * as `helmet(...)` stops type-checking ("TS2349: This expression is not
 * callable") even though the project's own build is green.
 *
 * This script reproduces that resolution mode, so the difference is caught
 * here instead of in a production build.
 *
 * Usage: `npm run typecheck:platform`
 */
const path = require('node:path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'tsconfig.json');

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

if (configFile.error) {
  console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  process.exit(1);
}

const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectRoot,
  undefined,
  configPath,
);

const fileNames = parsed.fileNames.filter((name) => name.endsWith('.ts'));

const host = {
  getScriptFileNames: () => fileNames,
  getScriptVersion: () => '1',
  getScriptSnapshot: (name) => {
    const contents = ts.sys.readFile(name);
    return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
  },
  getCurrentDirectory: () => projectRoot,
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
  useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
  getNewLine: () => ts.sys.newLine,
  // The platform's hook: the legacy resolver, without a resolution mode.
  resolveModuleNames: (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      const result = ts.resolveModuleName(moduleName, containingFile, parsed.options, ts.sys);
      return result.resolvedModule;
    }),
};

const service = ts.createLanguageService(host);

const diagnostics = fileNames
  .flatMap((name) => service.getSemanticDiagnostics(name))
  .filter(
    (diagnostic, index, all) =>
      all.findIndex(
        (other) => other.file === diagnostic.file && other.start === diagnostic.start,
      ) === index,
  );

for (const diagnostic of diagnostics) {
  const location = diagnostic.file
    ? `${path.relative(projectRoot, diagnostic.file.fileName)}(${diagnostic.start})`
    : '(root)';
  console.error(
    `${location} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n  ')}`,
  );
}

if (diagnostics.length > 0) {
  console.error(
    `\n${diagnostics.length} type error(s) under the platform's module resolution — the production build would fail.`,
  );
  process.exit(1);
}

console.log(`Platform type check passed (${fileNames.length} files, CommonJS module resolution).`);
