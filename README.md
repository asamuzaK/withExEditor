EN | [JA](./README.ja.md)

[![Build Status](https://travis-ci.org/asamuzaK/withExEditor.svg?branch=master)](https://travis-ci.org/asamuzaK/withExEditor)
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

* Enabled on input elements, textarea element and editable elements.
* Edited contents will be synchronized when you go back to the browser.

***

## Options

### Toolbar Button Icon

* Choose the icon.

### Editor Label

* Enter the label of the editor.
* If the input field is disabled, run the setup script on the host.

### Notify Host Error

* If enabled, notifies when an error occurs on the host.

### Enable Only When Editing Text

* Enables only when the content is editable.

### Automatically Synchronize Edited Content On Specific Sites

* Enable when you want to automatically synchronize edited content.
* Note that this option will not be enabled when private browsing. Also note that if you leave your browser running for a long time or register many URLs, it may affect the performance of the PC.

### Reload withExEditor

* Try when withExEditor stops working, for example when updating Node.js or updating withExEditorHost.
