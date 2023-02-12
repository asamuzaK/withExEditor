[EN](./README.md) | JA

[![build](https://github.com/asamuzaK/withExEditor/workflows/build/badge.svg)](https://github.com/asamuzaK/withExEditor/actions?query=workflow%3Abuild)
[![CodeQL](https://github.com/asamuzaK/withExEditor/workflows/CodeQL/badge.svg)](https://github.com/asamuzaK/withExEditor/actions?query=workflow%3ACodeQL)
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
* 選択部分がDOMで解析不能な場合は（例えば、JavaScriptやCSSなど）、ソースファイルを表示します。

### テキストを *exEditor* で編集

* input要素、textarea要素や、いわゆるリッチテキストエディタといったコンテンツが編集可能な要素上で有効になります。
* 外部エディタで編集および保存した内容は、ブラウザに戻ったときに同期されます。
* リッチテキストエディタのコンテンツを編集する際には、HTMLでコンテンツをマークアップできます。
  ただし、リッチテキストエディタによってマークアップが変更される場合があることに注意してください。

***

## オプション項目

### ツールバーボタンアイコン

* アイコンを選択してください。

### withExEditorHost

* ホストの最新版が入手可能になった場合に通知されます。
* バイナリのホストを使用している場合は、[asamuzaK/withExEditorHost (GitHub)](https://github.com/asamuzaK/withExEditorHost "asamuzaK/withExEditorHost: Native messaging host for withExEditor")から最新バージョンを入手してください。npmパッケージを使っている場合は、コマンド `npm i -g withexeditorhost` で更新してください。

### ホストの接続状態

* 状態が「接続」ではなく「未接続」や「不明」となっている場合は、withExEditor を再読み込みしてください。

### ホストの互換性

* 状態が「互換」ではなく「非互換」や「不明」となっている場合は、ホストをアップデートしてください。

### エディタの状態

* 状態が「実行可能」ではなく「実行不可」や「不明」となっている場合は、ホストでセットアップスクリプトを実行してください。

### エディタの表示名

* エディタの表示名を入力してください。
* 入力欄が無効になっている場合は、ホストでセットアップスクリプトを実行してください。

### ホストのエラーを通知

* ホストでエラーが起きたときに通知する場合は、このオプションを有効にしてください。

### テキスト編集のみ有効化

* コンテンツが編集可能な場合にのみこの拡張機能を使用する場合は、このオプションを有効にしてください。

### 一時ファイルの保存時にファイル形式を選択する

* 一時ファイルの拡張子を選択するためのコンテキストメニュー項目を追加します。

### 特定のサイトでは編集したコンテンツを自動的に同期する

* 編集したコンテンツを自動的に同期させる場合は、このオプションに有効にしてください。
* プライベートブラウジング中は、このオプションは無効化されます。
