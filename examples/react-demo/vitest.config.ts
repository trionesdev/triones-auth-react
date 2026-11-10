import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 直接测试工作区源码，无需先 build 各个包
    alias: {
      '@trionesdev/auth-react': resolvePath('../../packages/auth-react/src/index.tsx'),
      '@trionesdev/react-router-auth': resolvePath('../../packages/react-router-auth/src/index.ts'),
    },
    dedupe: ['react', 'react-dom', 'react-router'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
