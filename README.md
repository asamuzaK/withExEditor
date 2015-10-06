# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, on context menu.

## Add-on Page
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/ja/firefox/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Usage

### View Source
* Opens (X) HTML, JavaScript, CSS, SVG, XML source with the editor.
* When browsing a local file, the local file will be opened directly.

### View Selection
* Shows a generated DOM tree from the selection. It may not be the same with the DOM tree of the document source.

### Edit Text
* Can be used with inputs, textareas, or editable elements.
* Contents will be synchronized when you go back to the browser and move focus to the element which you've edited.

***

## Options in Addon Manager

### Select Editor
* Choose the editor which you want to use.
* When selecting an editor on Mac OSX, pick the file under `/Applications/[yourEditor].app/Contents/MacOS/` directory.

### Command line options
* Use when you want to start the editor with command line options.
* When using back slash (\) charactor, it must be escapted with an extra back slash.
ex: `C:\\Windows`
* If argument contains space(s), quote them with the double quotation mark.
ex: `"Some Arg"`

### DISPLAY Environment Variable
* For Linux only. Set this option if "Cannot open display" error occured. Maybe, you also need to set "xhost".

### Access key on context menu
* You can choose any key. But, it must be a single charactor.

### Enable during Private Browsing
* Enables if checked, disabled if not.

### Force to remove the temporary files at shutdown
* You can choose whether or not to forcibly remove the temporary files at the end of Private Browsing, or when you quit Firefox. This may cause problem, it depends on the editor setting.

***

## Options in toobar button
* You can choose icon color, and rename the label of the editor. You can open Addon Manager from here.
