<div align="center">
  <img src="public/balloon-icon.png" width="96" height="96" alt="Balloon Editor">

  <h1>Balloon</h1>

  <p>青空文庫形式のテキスト編集と校正を、TBD</p>

  <p>
    <a href="https://balloon-aozora.vercel.app/">Web版を開く</a>
    ・
    <a href="https://github.com/furisake/balloon/issues">バグ報告・機能要望</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  </p>
</div>

## Balloon Editorについて

Balloon Editorは、青空文庫形式のテキストを編集・校正するためのWebエディタです。ルビや注記を含む原稿を、横書き・縦書きのプレビューで確認しながら作業できます。

原稿はブラウザ内で処理され、編集中の内容はローカルストレージへ自動保存されます。

## 主な機能

- 青空文庫形式のプレーンテキスト編集
- ルビ、注記、見出し、改ページのプレビュー
- 横書き・縦書き表示の切り替え
- 1列あたりの文字数指定（デフォルトは自動）
- UTF-8 / Shift_JISテキストの読み込みとShift_JISでの保存
- ブラウザ内への下書き自動保存
- 文字数・行数の表示
- 校正プラグインの個別ON/OFF

### 校正プラグイン

| プラグイン | 内容 |
| --- | --- |
| 文字チェッカー | JIS外字、半角文字、全角チルダなどを検出します。 |
| 包摂・外字注記チェッカー | 外字注記辞書をもとに、面区点番号、Unicode番号、不要な包摂注記を点検します。 |
| OCR誤認識ハイライト | OCR誤認識や誤入力の可能性が高い文字列を強調します。 |
| スペース・改行の強調 | 半角・全角スペースと改行位置を可視化します。 |

指摘箇所へマウスを重ねると、検出理由や確認内容が表示されます。校正結果はあくまで確認支援です。修正時は必ず底本と青空文庫の最新資料を確認してください。

## 使い方

### Web版

[https://balloon-aozora.vercel.app/](https://balloon-aozora.vercel.app/) を開くだけで利用できます。

1. 「エディタを開く」を選択します。
2. テキストファイルを開くか、原稿を直接入力します。
3. 設定メニューから書字方向、1列の文字数、校正プラグインを調整します。
4. 編集とプレビューを切り替えて原稿を確認します。
5. 保存ボタンまたは `Ctrl+S` / `Command+S` でShift_JISテキストを保存します。

### ローカル開発

必要な環境はNode.js 20.9以降です。

```bash
git clone git@github.com:furisake/balloon.git
cd balloon
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

本番用ビルドは次のコマンドで確認できます。

```bash
npm run lint
npm run build
npm run start
```

## 技術構成

- [Next.js](https://nextjs.org/) / React
- [TypeScript](https://www.typescriptlang.org/)
- [Tiptap](https://tiptap.dev/) / ProseMirror
- [Tailwind CSS](https://tailwindcss.com/)
- [Base UI](https://base-ui.com/)

## 参考資料

本プロジェクトでは、以下のツールと資料を参考にしています。各プロジェクトの作成者・整備に携わった皆様に感謝します。

- [青空文庫 校正マニュアル](https://www.aozora.gr.jp/KOSAKU/MANUAL_4.html)
- [青空文庫・外字注記辞書](https://www.aozora.gr.jp/gaiji_chuki/)
- [校正ツール2.0化ひとりプロジェクト](https://eunheui.sakura.ne.jp/aozora/proofreader.html)
- [AozoraBunko::Checkerkun](https://github.com/pawa-/AozoraBunko-Checkerkun)
- [えあ草紙](https://www.satokazzz.com/airzoshi/tachiyomi.php)

## コントリビューション

バグ報告、機能提案、ドキュメント改善、プルリクエストを歓迎します。まずは[Issues](https://github.com/furisake/balloon/issues)からお知らせください。

## ライセンス

このプロジェクトは[MIT License](LICENSE)のもとで公開されています。
