/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  extensionsToTreatAsEsm: ['.ts'], // https://github.com/kulshekhar/ts-jest/issues/4223#issuecomment-2035586157
  testEnvironment: "node",
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
