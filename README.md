EN | [JA](./README.ja.md)

[![build](https://github.com/asamuzaK/withExEditor/workflows/build/badge.svg)](https://github.com/asamuzaK/withExEditor/actions?query=workflow%3Abuild)
[![devDependency Status](https://david-dm.org/asamuzaK/withExEditor/dev-status.svg)](https://david-dm.org/asamuzaK/withExEditor?type=dev)
[![Mozilla Add-on](https://img.shields.io/amo/v/jid1-WiAigu4HIo0Tag@jetpack.svg)](https://addons.mozilla.org/addon/withexeditor/)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/koghhpkkcndhhclklnnnhcpkkplfkgoi.svg)](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi)

# withExEditor

Extension for Gecko based browsers and Blink based browsers.

From the context menu (right click), you can "View source" "View selection" or "Edit text" with your favorite editor.
Enabled in (X)HTML, JavaScript, CSS, MathML, SVG, XML, etc.

## Download

Gecko:
* [withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

Blink:
* [withExEditor - Chrome Web Store](https://chrome.google.com/webstore/detail/withexeditor/koghhpkkcndhhclklnnnhcpkkplfkgoi "withExEditor - Chrome Web Store")

### Important Notice

To use withExEditor, you also need to prepare a host which executes your editor.
The browser interacts with the host via messages, and the editor is executed by the host.
Please download the host for withExEditor from [asamuzaK/withExEditorHost (GitHub)](https://github.com/asamuzaK/withExEditorHost "asamuzaK/withExEditorHost: Native messaging host for withExEditor").

***

## Context Menus

### View Page Source with *exEditor*

* Creates a copy of the page, save as a temporary file, and opens it with an external editor.
* The temporary file is encoded in UTF-8, even if the original document is not so.
* If you are browsing a local file, then the local file will be opened directly.

### View MathML Source with *exEditor*

* Enabled on MathML elements, and shows a generated DOM tree.

### View SVG Source with *exEditor*

* Enabled on SVG elements, and shows a generated DOM tree.

### View Selection with *exEditor*

* Shows a generated DOM tree of selection in XML format.
* If the selection is not DOM parsable (like JavaScript, CSS), a source file will be created.

### Edit Text with *exEditor*

* Enabled on input elements, textarea elements and content editable elements like rich text editors.
* The contents edited and saved in the external editor are synchronized when you go back to the browser.
* When editing the contents of a rich text editor, you can markup the contents in HTML.
  However, keep in mind that the rich text editor may change your markup.

***

## Options

### Toolbar Button Icon

* Choose the icon.

### withExEditorHost

* Notifies when the latest version of the host is available.
* If you are using a binary host, get the latest version from [asamuzaK/withExEditorHost (GitHub)](https://github.com/asamuzaK/withExEditorHost "asamuzaK/withExEditorHost: Native messaging host for withExEditor"). If you are using the npm package, update with the command `npm i -g withexeditorhost`.

### Host Connection

* If the status is `Disconnected` or `Unknown` instead of `Connected`, you need to reload withExEditor.

### Host Compatibility

* If the status is `Incompatible` or `Unknown` instead of `Compatible`, you need to update the host.

### Editor State

* If the status is `Not Executable` or `Unknown` instead of `Executable`, you need to run the setup script on the host.

### Editor Label

* Enter the label of the editor.
* If the input field is disabled, you need to run the setup script on the host.

### Notify Host Error

* Enable this option if you want to be notified when a host fails.

### Enable Only When Editing Text

* Enable this option if you want to use this extension only when the content is editable.

### Select File Format When Saving Temporary Files

* Adds a context menu item for selecting a temporary file extension.

### Automatically Synchronize Edited Content On Specific Sites

* Enable this option if you want to automatically synchronize edited content.
* Note that this option is disabled during private browsing.

### Reload withExEditor

* Try when withExEditor stops working, for example when updating Node.js or updating withExEditorHost.
