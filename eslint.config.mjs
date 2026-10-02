import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...expoConfig,
  eslintConfigPrettier,
  {
    // React Native has no Buffer of its own, and the native crypto module
    // ships a second implementation next to the `buffer` package the Solana
    // libraries import. Two implementations in one bundle is how a 64-bit
    // read that passes in Node throws on a device.
    files: ["src/**", "app/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "Buffer",
          message: 'Import it (`import { Buffer } from "buffer"`).',
        },
      ],
    },
  },
  globalIgnores([".expo/**", "dist/**", "ios/**", "android/**", "coverage/**", "expo-env.d.ts"]),
]);

export default eslintConfig;
