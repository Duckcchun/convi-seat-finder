import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom 환경에서 테스트 실행
    environment: 'jsdom',
    
    // 테스트 파일 글로브 패턴
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // CSS/스타일 인포트 무시
    css: true,
    
    // DOM 테스트 유틸리티 셋업
    setupFiles: ['./src/test/setup.ts'],
    
    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },

    // 전역 테스트 유틸 주입
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
