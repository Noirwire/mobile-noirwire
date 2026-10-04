const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// On a phone, `@scure/bip39` is the library with its seed step done by native
// crypto (src/platform/bip39.ts): in JavaScript that step takes seconds per
// key there, and an import derives dozens of keys. The web export keeps the
// library as it is. The stand-in's own import of the library goes through.
const BIP39_ON_A_PHONE = path.join(__dirname, "src/platform/bip39.ts");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "@scure/bip39" &&
    platform !== "web" &&
    context.originModulePath !== BIP39_ON_A_PHONE
  ) {
    return { type: "sourceFile", filePath: BIP39_ON_A_PHONE };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
