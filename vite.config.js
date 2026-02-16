import { defineConfig } from 'vite'

export default defineConfig({
    // GitHub Pages のサブディレクトリデプロイに対応するためベースパスを相対パスに設定
    base: './',
    build: {
        outDir: 'dist',
    }
})
