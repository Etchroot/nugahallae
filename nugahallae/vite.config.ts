import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import aitDevtools from "@apps-in-toss/devtools/unplugin";

// `--mode web`: 앱인토스 밖에서 시연하기 위한 데모 웹 빌드.
// TDS는 앱인토스 밖에서 실행되지 않으므로 src/web/의 대체 부품으로 바꿔 끼운다.
export default defineConfig(({ mode }) => ({
  plugins: [aitDevtools.vite(), react()],
  resolve:
    mode === 'web'
      ? {
          alias: {
            '@toss/tds-mobile-ait': fileURLToPath(new URL('./src/web/tds-mobile-ait.tsx', import.meta.url)),
            '@toss/tds-mobile': fileURLToPath(new URL('./src/web/tds-mobile.tsx', import.meta.url)),
          },
        }
      : undefined,
}))
