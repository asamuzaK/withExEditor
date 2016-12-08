[EN](./README.md) | JA

# withExEditor
コンテキストメニュー（右クリック）から、お好みのエディタを使用して、「ソース表示」「選択部分のソース表示」、または「テキスト編集」ができるようになります。
(X)HTML、JavaScript、CSS、SVG、XMLなどで使用可能です。

## アドオンのページ
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## 使用方法

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
* 選択部分がDOMで解析不能な場合は、選択部分のみを含んだファイルを生成して表示します。

### テキストを *exEditor* で編集
* input要素、textarea要素や編集可能な要素上で有効になります。
* エディタで編集・保存した内容は、ブラウザに戻って元の要素にフォーカスを移すと同期されます。

***

## 設定項目

### ツールバーボタンアイコン
* アイコンを選択してください。

### マニフェストのパス
* アプリケーションマニフェストのパスを入力してください。

### エディタの表示名
* エディタの表示名を入力してください。
* エディタが選択されてない場合は無効となります。

### アクセスキー
* コンテキストメニュー、設定ページを開くショートカット、および直接エディタを実行するためのショートカットで共通して使用するアクセスキーを設定します。
* アクセスキーは任意の値に変更可能です。ただし、一文字である必要があります。
* コンテキストメニューでは設定した「キー」をそのまま押してください。

### 設定ページを開くショートカットキーを有効化
* 設定ページを開くには「Ctrl + Alt + キー」（Macは「Cmd + Opt + キー」）を押してください。

### エディタを直接起動するショートカットキーを有効化
* コンテキストメニューを経由せずにエディタを直接起動するには「Ctrl + Shift + キー」（Macは「Cmd + Shift + キー」）を押してください。

### プライベートブラウジング中も有効化
* チェックを入れると有効、チェックを外すと無効です。

### テキスト編集のみ有効化
* コンテンツが編集可能な場合にのみ、コンテキストメニューに表示されます。

### 一時ファイルを強制的に削除
* プライベートブラウジングの終了時やブラウザの終了時に一時ファイルを強制的に削除します。
* チェックを入れておくことを推奨しますが、エディタの設定によっては強制削除を有効にすると不具合が起こる可能性があります。

***

## マニュアル
### 重要なお知らせ
これまでのwithExEditorで使用してきたJetpack SDKとは異なり、Mozillaの新しいアドオンのエコシステムWebExtensionsでは、アドオンから子プロセスを生成することはできません（つまり、外部エディタはもう直接起動できません）。
代わりに、WebExtensionsでは、ブラウザはメッセージを介してネイティブアプリケーションとやりとりする仕組みとなっています。
詳細については、[Native messaging - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging)を参照してください。

このため、withExEditorを使うにあたり、ユーザーのみなさんは：

* 外部エディタを起動するためのホスト
* ホストのアプリケーションマニフェスト

を準備する必要があります。

### ホスト
使用するエディタを起動するホストを作成し、任意の場所に保存します。
ホストは標準入力（stdin）で渡されるバイナリデータを扱えるものである必要があります。
withExEditorからはソース表示やテキスト編集用に作成した「一時ファイルのパス」をホストに送信します。

以下はpythonスクリプトによるホストの例です。

Pythonスクリプトの例（Windows / Linux / Mac）：
```
#!/usr/bin/env python
# coding: utf-8

import sys, json, struct, subprocess

# Read a message from stdin and decode it.
def getMessage():
  rawLength = sys.stdin.buffer.read(4)
  if len(rawLength) == 0:
    sys.exit(0)
  message = sys.stdin.buffer.read(struct.unpack('@I', rawLength)[0])
  if message:
    return json.loads(message.decode('utf-8'))
  else:
    return false

file = getMessage()

# Command array for subprocess.run()
cmd = []

# Editor path
app = "C:\Program Files\Path\To\YourEditor.exe"

# Command line arguments array as appropriate.
# args = []

if file:
  cmd.append(app)

  # If you want to put arguments before file, extend cmd here
  # cmd.extend(args)

  cmd.append(file)

  # If you want to put arguments after file, extend cmd here
  # cmd.extend(args)

  subprocess.run(cmd)

sys.exit()
```

Windowsでは、pythonスクリプトを実行するためのシェルスクリプト（バッチファイル）も作成します。

シェルスクリプトの例（Windows）：
```
@echo off
python "C:\path\to\youreditor.py"
```

### アプリケーションマニフェスト
ホストのパスを含むJSON形式のアプリケーションマニフェストを作成します。

マニフェストの例：
```
{
  "name": "youreditor",
  "description": "Host to execute youreditor"
  "path": "C:\\path\\to\\youreditor.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

* *name* - 使用するエディタの名前。小文字の英字と数字、ドット、アンダーバーのみ使用可能です。また、ホストのファイル名と一致している必要があります。
* *description* - ホストの説明。
* *path* - エディタを起動するホストのパス。Windowsの場合は、ディレクトリの区切りであるバックスラッシュ文字にはさらにバックスラッシュを加えてエスケープさせる必要があることに注意してください。また、上記の例に倣ってpythonスクリプトでホストを作成した場合、Windowsではpythonスクリプトのパスではなく、シェルスクリプトのパスを記入してください。
* *type* - "stdio"を記入してください。
* *allowed_extensions* - アドオンのIDの配列。withExEditorのIDである"jid1-WiAigu4HIo0Tag@jetpack"を[]括弧の中に記入してください。

マニフェストは、 "name"フィールドと同じファイル名、.jsonのファイル拡張子、UTF-8（BOMなし）の文字コードで保存してください。
保存先については、[App manifest location](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location)を参照してください。

Windowsではさらにレジストリも設定する必要があります。
マニフェストを"C:¥Users¥xxx¥youreditor.json"に保存したと仮定した場合、cmd.exeで次のコマンドを実行するとレジストリキーを保存することができます。

REG ADDの例（Windows）：
```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\youreditor" /ve /d "C:\Users\xxx\youreditor.json" /f
```

以上の作業を終えたら、*設定ページでマニフェストのパスを入力してください*。
