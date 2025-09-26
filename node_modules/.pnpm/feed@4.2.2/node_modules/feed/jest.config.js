module.exports = {
  verbose: true,
  collectCoverage: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "__tests__/util/"],
  testRegex: "(/__tests__/.*\\.spec)\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "@app/(.*)": "<rootDir>/src/$1",
  },
};
