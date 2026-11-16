import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Resolve Next.js @/* path alias to src/*
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Use CommonJS for Jest compatibility
          module: 'CommonJS',
          moduleResolution: 'node',
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};

export default config;
