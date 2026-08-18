const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Monorepo (npm workspaces): pacotes sem conflito de versão em outro
// workspace (ex.: @react-navigation/core) sobem pro node_modules da RAIZ,
// que também tem react@18.x (usado pelo admin). De lá, o require('react')
// deles resolve pra esse react@18.x em vez do react@19.x local do mobile,
// gerando duas cópias de React ao mesmo tempo ("Invalid hook call") —
// confirmado inspecionando o bundle gerado.
//
// `extraNodeModules` não resolve isso: ele só é consultado quando a
// resolução normal FALHA, e aqui ela "funciona", só que aponta pro React
// errado. É preciso interceptar a resolução ativamente.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, "package.json") },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
