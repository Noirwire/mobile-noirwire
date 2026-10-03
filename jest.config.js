const preset = require("jest-expo/jest-preset");

// Icons are imported from the icon package's untranspiled source, and the
// shared wallet package and the Solana and key libraries it stands on ship ES
// modules, so they join the packages the preset already lets the transformer
// read.
const [packagesToTransform, ...otherIgnores] = preset.transformIgnorePatterns;
const ES_MODULE_PACKAGES = [
  "@noirwire/shared",
  "@solana",
  "@scure",
  "@noble",
  "@zxcvbn-ts",
  "ed25519-hd-key",
  "jayson",
  "uuid",
  "phosphor-react-native",
];

// The Solana libraries' React Native builds are `.mjs` files, which the
// preset's script transform does not match.
const [babelJest, babelOptions] = preset.transform["\\.[jt]sx?$"];
const scriptTransform = [
  babelJest,
  { ...babelOptions, plugins: [require.resolve("./jest/dynamicImportToRequire")] },
];

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Its exports map names only "browser" and "node", neither of which the
    // React Native test environment asks for.
    "^rpc-websockets$": "<rootDir>/node_modules/rpc-websockets/dist/index.browser.cjs",
  },
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/dist/", "/e2e/"],
  transform: { ...preset.transform, "\\.[jt]sx?$": scriptTransform, "\\.mjs$": scriptTransform },
  transformIgnorePatterns: [
    packagesToTransform.replace("(?!(", `(?!(${ES_MODULE_PACKAGES.join("|")}|`),
    ...otherIgnores,
  ],
};
