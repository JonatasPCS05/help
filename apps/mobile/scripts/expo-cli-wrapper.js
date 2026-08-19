// Wrapper usado pelo Gradle (react { cliFile = ... }) no lugar do
// @expo/cli direto. O React Native Gradle Plugin sempre relativiza o
// --entry-file recebido (ex.: vira "index.js"), e o `expo export:embed`
// resolve esse caminho relativo a partir da raiz do monorepo detectada
// automaticamente, não do cwd real — causando "Unable to resolve module
// ./index.js" em builds nativas dentro de um workspace. Este script
// reescreve --entry-file para o caminho absoluto correto antes de repassar
// tudo pro CLI real do Expo.
const { spawnSync } = require("child_process");
const path = require("path");

const realCli = require.resolve("@expo/cli", {
  paths: [require.resolve("expo/package.json", { paths: [__dirname] })],
});

const args = process.argv.slice(2);
const entryFileIndex = args.indexOf("--entry-file");
if (entryFileIndex !== -1) {
  args[entryFileIndex + 1] = path.resolve(__dirname, "..", "index.js");
}

const result = spawnSync(process.execPath, [realCli, ...args], {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
});

process.exit(result.status ?? 1);
