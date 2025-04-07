/**
 * @fileoverview Viteの設定ファイル
 * 
 * このファイルでは、Viteビルドツールの設定を行います。
 * 開発サーバーの設定やビルド設定などを含みます。
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // ベースパスの設定
  base: './',
  
  // 静的ファイルのディレクトリ
  publicDir: 'public',
  
  // 解決設定
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  // 開発サーバー設定
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  
  // ビルド設定
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    sourcemap: true
  }
}); 