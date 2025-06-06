# 初音ミク ドット絵アニメーション

Three.jsを使った初音ミクのドット絵3Dアニメーションプロジェクトです。画像から3Dピクセルアートを生成し、インタラクティブなアニメーションとして表示します。

## 機能

- 画像から3Dピクセルアートの自動生成
- 3D空間でのインタラクティブな操作（回転、ズーム）
- カスタマイズ可能なアニメーション設定
- パフォーマンス最適化（インスタンス化メッシュの使用）
- モバイルデバイス対応のレスポンシブデザイン
- ブルームエフェクトによる光の表現

## 技術スタック

- TypeScript
- Three.js (3Dレンダリング)
- Vite (ビルドツール)

## 開発環境のセットアップ

### 前提条件

- Node.js 18.0.0以上

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/tacyan/MikuAnimation.git
cd MikuAnimation

# 依存関係のインストール
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてアプリケーションを確認できます。

### ビルド

```bash
npm run build
```

### 画像を変える

```
src/main.ts
の
const pixels = await this.pixelGenerator.generateFromImage('/src/local_image/C3BUam2VEAACSXg.jpg');
を
src/local_image
に画像を置いて
src/local_image/shopping.png
とかにすると動く画像を変えれます。
```

ビルドされたファイルは `dist` ディレクトリに出力されます。

## プロジェクト構造

```
MikuAnimation/
├── public/         # 静的ファイル
├── src/            # ソースコード
│   ├── components/ # UIコンポーネント
│   ├── config/     # 設定ファイル
│   ├── utils/      # ユーティリティ関数
│   ├── main.ts     # メインエントリーポイント
│   └── styles.css  # スタイルシート
├── index.html      # HTMLエントリーポイント
└── vite.config.js  # Vite設定
```

## 使い方

1. アプリケーションを開くと、3Dピクセルアートが表示されます
2. マウスドラッグで回転、スクロールでズームができます
3. 右側のコントロールパネルで以下の設定を調整できます：
   - 回転速度
   - ズームレベル
   - エフェクト強度（ブルーム）
   - アニメーションのON/OFF
   - ビューのリセット

## パフォーマンス最適化

このプロジェクトでは以下のパフォーマンス最適化を実装しています：

- インスタンス化メッシュによる効率的なレンダリング
- 解像度スケーリングによる処理負荷の調整
- GPU加速のためのCSS最適化
- フレームレート制限オプション

## ライセンス

[ライセンス情報] 
