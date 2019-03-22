[EN](./README.md) | JA

[![Build Status](https://travis-ci.org/asamuzaK/withExEditor.svg?branch=master)](https://travis-ci.org/asamuzaK/withExEditor)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditor/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditor?type=dev)
[![Mozilla Add-on](https://img.shields.io/amo/v/jid1-WiAigu4HIo0Tag@jetpack.svg)](https://addons.mozilla.org/addon/withexeditor/)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/koghhpkkcndhhclklnnnhcpkkplfkgoi.svg)](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi)

# withExEditor

GeckoベースのブラウザとBlinkベースのブラウザ用の拡張機能。

コンテキストメニュー（右クリック）から、お好みのエディタを使用して、「ソース表示」「選択部分のソース表示」、または「テキスト編集」ができるようになります。
(X)HTML、JavaScript、CSS、MathML、SVG、XMLなどで使用可能です。

## ダウンロード

Gecko:
* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

Blink:
* [withExEditor - Chrome ウェブストア](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome ウェブストア")

### 重要なお知らせ

withExEditorを使うには、エディタを起動するホストも用意する必要があります。
ブラウザはメッセージを介してホストと対話し、エディタはホストによって実行されます。
[asamuzaK/withExEditorHost (GitHub)](https://github.com/asamuzaK/withExEditorHost "asamuzaK/withExEditorHost: Native messaging host for withExEditor")からwithExEditor用のホストをダウンロードしてください。

***

## コンテキストメニュー

### ページのソースを *exEditor* で表示

* 一時ファイルを作成し、外部エディタで開きます。
* 元々のドキュメントがUTF-8以外でも、一時ファイルはUTF-8でエンコードされています。
* ローカルファイルを参照している場合、直接、そのローカルファイルを開きます。

### MathML のソースを *exEditor* で表示

* MathMLの要素上で有効になり、DOMツリーを生成してMathMLで表示します。

### SVG のソースを *exEditor* で表示

* SVGの要素上で有効になり、DOMツリーを生成してSVGで表示します。

### 選択した部分のソースを *exEditor* で表示

* 選択部分のDOMツリーを生成してXMLで表示します。
* 複数の選択部分があった場合、選択部分ごとに区切りとしてコメントを入れて表示します。
* 選択部分がDOMで解析不能な場合は（例えば、JavaScriptやCSSなど）、選択部分のみを含んだファイルを生成して表示します。

### テキストを *exEditor* で編集

* input要素、textarea要素や編集可能な要素上で有効になります。
* エディタで編集・保存した内容は、ブラウザに戻ると同期されます。

***

## 設定項目

### ツールバーボタンアイコン

* アイコンを選択してください。

### エディタの表示名

* エディタの表示名を入力してください。
* 入力欄が無効になっている場合は、ホストでセットアップスクリプトを実行してください。

### ホストのエラーを通知

* 有効化した場合、ホストでエラーが起きたときに通知します。

### テキスト編集のみ有効化

* コンテンツが編集可能な場合にのみ有効化します。

### 特定のサイトでは編集したコンテンツを自動的に同期する

* 編集したコンテンツを自動的に同期させる場合に有効化してください。
* プライベートブラウジング中は、このオプションは有効になりません。また、長い時間ブラウザを稼働させたり、多くの URL を登録すると、PCのパフォーマンスに影響する可能性があります。

### withExEditorを再読み込み

* Node.jsをアップデートしたときやホストをアップデートしたとき、または、withExEditorが動かなくなった場合に試してください。
