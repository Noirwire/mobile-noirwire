const preset = require("jest-expo/jest-preset");

// Icons are imported from the icon package's untranspiled source, so it joins
// the packages the preset already lets the transformer read.
const [packagesToTransform, ...otherIgnores] = preset.transformIgnorePatterns;

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/dist/"],
  transformIgnorePatterns: [
    packagesToTransform.replace("(?!(", "(?!(phosphor-react-native|"),
    ...otherIgnores,
  ],
};
