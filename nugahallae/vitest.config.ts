import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 테스트에서는 devtools unplugin을 쓰지 않는다(vite.config.ts와 분리).
// `@apps-in-toss/web-framework`는 각 테스트에서 vi.mock('@apps-in-toss/web-framework', ...)로 대체한다.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
