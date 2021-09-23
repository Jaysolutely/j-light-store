module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {},
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
