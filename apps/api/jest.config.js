/* global module */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@medbridge/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@medbridge/utils$': '<rootDir>/../../packages/utils/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
};
