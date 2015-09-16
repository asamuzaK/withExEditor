# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, on context menu.

## Add-on Page
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/ja/firefox/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Usage

* Can be used with ASCII files, such as (X)HTML, JS, CSS, XML, and SVG etc.
* Creates "temporary file", and then will be loaded by external editor.
  In "View Source" or "View Selection" mode, the file name is based on URI.
  In "Edit Text" mode, the file name is based on timestamp.
  If the same file exists, the file will be over written.
* When browsing a local file, in the "View Source" mode, the local file will be opened directly.
* "View Selection" will show a generated DOM tree.
  It may not be the same with the DOM tree of the document source.
* In the "Edit Text" mode, contents will be synchronized when you go back to the browser and move focus to the element which you edited.
* If something fails during "View Selection" or "Edit Text" mode, it will switch to "View Source" mode. (Or, just fail and do nothing.)
* When selecting editor on Mac, pick the file under /Applications/[yourEditor].app/Contents/MacOS/ directory.
* You can choose whether to use in Private Browsing.
* You can choose whether or not to forcibly remove the temporary files at the end (of Private Browsing, or when you quit Firefox). (This may cause problem, it depends on editor setting.)

