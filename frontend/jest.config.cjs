// Jest runs the React tests in a fake browser (jsdom). Test files sit next to the code: *.test.tsx
module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^axios$': 'axios/dist/node/axios.cjs' }, // Jest cannot load axios' ESM build
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Jest needs CommonJS output; the app itself is built by Vite.
        tsconfig: {
          jsx: 'react-jsx',
          module: 'CommonJS',
          moduleResolution: 'node10',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
        diagnostics: { ignoreCodes: [151001] },
      },
    ],
  },
};
