import { defineConfig } from 'vite'

export default defineConfig({
    // GitHub Pages のサブディレクトリデプロイに対応するためベースパスを設定
    base: '/monster-suika-v2/',
    build: {
        outDir: 'dist',
    }
})
