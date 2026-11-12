/**
 * Type-checks the server the way the hosting platform's builder does.
 *
 * The platform (Vercel's Node/Express builder) type-checks the project in
 * addition to running the project's own build script. It loads TypeScript
 * from the project's devDependencies and — because that TypeScript still
 * exposes the legacy compiler API — checks the sources through a language
 * service whose `resolveModuleNames` hook calls the legacy
 * `ts.resolveModuleName()` API *without* a `resolutionMode` argument. That
 * API always resolves modules in CommonJS mode, so a dual package such as
 * `helmet` is resolved to its CommonJS declaration, where a default import
 * binds to `module.exports` instead of the exported function. The build then
 * fails with "TS2349: This expression is not callable" even though the
 * project's own `tsc` run is green.
 *
 * This script mirrors that path — the same config computation and the same
 * resolver — and additionally checks the sources with the ESM resolution mode
 * the project's own build uses. Both must be clean, so a difference between
 * the platform's check and the project's own build is caught here instead of
 * in a production build.
 *
 * Usage: `npm run typecheck:platform`
 */
const path = require('node:path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'tsconfig.json');

/** The options the platform's builder adds to the project's tsconfig. */
const BUILDER_COMPILER_OPTIONS = {
  sourceMap: true,
  inlineSourceMap: false,
  inlineSources: true,
  declaration: false,
  noEmit: false,
  outDir: '$$ts-node$$',
};

/**
 * Reads the project's tsconfig the way the platform's builder does: the file
 * list is replaced by the entry files the builder detected, and the builder's
 * own compiler options are merged on top of the project's.
 */
function readConfig() {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    process.exit(1);
  }

  const config = { ...configFile.config, files: [], include: [] };
  config.compilerOptions = {
    ...config.compilerOptions,
    ...BUILDER_COMPILER_OPTIONS,
  };

  const parsed = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  );

  return parsed.options;
}

/**
 * Type-checks the project with the given module resolution mode.
 *
 * `legacy` reproduces the platform's builder: the legacy resolver, called
 * without a resolution mode. `import` reproduces the project's own build.
 */
function check(mode, options) {
  const fileNames = ts.sys.readDirectory(path.join(projectRoot, 'src'), ['.ts'], undefined, [
    '**/*',
  ]);

  const host = {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => '1',
    getScriptSnapshot: (name) => {
      const contents = ts.sys.readFile(name);
      return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
    },
    getCurrentDirectory: () => projectRoot,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (compilerOptions) => ts.getDefaultLibFilePath(compilerOptions),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getNewLine: () => ts.sys.newLine,
    resolveModuleNames:
      mode === 'legacy'
        ? (moduleNames, containingFile) =>
            moduleNames.map((moduleName) => {
              // No `resolutionMode`: this is what makes the platform's
              // resolver fall back to CommonJS mode.
              const result = ts.resolveModuleName(moduleName, containingFile, options, ts.sys);
              return result.resolvedModule;
            })
        : undefined,
  };

  const service = ts.createLanguageService(host);

  return fileNames
    .flatMap((name) => service.getSemanticDiagnostics(name))
    .filter(
      (diagnostic, index, all) =>
        all.findIndex(
          (other) => other.file === diagnostic.file && other.start === diagnostic.start,
        ) === index,
    );
}

function report(mode, diagnostics) {
  for (const diagnostic of diagnostics) {
    let location = '(root)';
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      location = `${path.relative(projectRoot, diagnostic.file.fileName)}(${line + 1},${character + 1})`;
    }
    console.error(
      `${mode}: ${location} error TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n  ')}`,
    );
  }
}

const options = readConfig();
const failures = [];

for (const mode of ['legacy', 'import']) {
  const diagnostics = check(mode, options);
  report(mode, diagnostics);
  failures.push(...diagnostics.map((diagnostic) => ({ mode, diagnostic })));
}

if (failures.length > 0) {
  console.error(
    `\n${failures.length} type error(s) — the production build would fail. ` +
      'The platform resolves modules in CommonJS mode, so a dual package must ' +
      'not be resolved through its CommonJS declaration.',
  );
  process.exit(1);
}

console.log(
  `Platform type check passed (ESM and CommonJS module resolution, ${options.module}/${options.moduleResolution}).`,
);
