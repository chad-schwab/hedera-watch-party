/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts"],
  testPathIgnorePatterns: ["/node_modules/", "/__fixtures__/"],
  transform: {
    "\\.ts$": ["ts-jest", { tsconfig: "./tsconfig-tests.json" }],
    "\\.js$": "babel-jest",
  },
};
