# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, on context menu.

## Add-on Page
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/ja/firefox/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Usage

### View Source
* Opens (X)HTML, JavaScript, CSS, SVG, XML source with the editor.
* When browsing a local file, the local file will be opened directly.

### View Selection
* Shows a generated DOM tree from the selection. It may not be the same with the DOM tree of the document source.

### Edit Text
* Can be used with inputs, textareas, or editable elements.
* Contents will be synchronized when you go back to the browser and move focus to the element which you've edited.

***

## Options In Add-on Manager

### Select An Editor
* Choose the editor which you want to use.
* When selecting an editor on Mac OS X, pick the file under `/Applications/[yourEditor].app/Contents/MacOS/` directory.

### Command Line Options
* Use when you want to start the editor with command line options.
* When using backslash (`\`) character, it must be escaped with an extra backslash.
ex: `C:\\Windows`
* If argument contains space(s), quote them with the double quotation mark (`"`).
ex: `"Some Arg"`

### DISPLAY Environment Variable
* For Linux only. Set this option if "Cannot open display" error occurred. Maybe, you also need to set "xhost".

### Access Key On Context Menu
* You can choose any key. But, it must be a single character.

### Enable During Private Browsing
* Enables if checked, disabled if not.

### Force To Remove The Temporary Files At Shutdown
* You can choose whether or not to forcibly remove the temporary files at the end of Private Browsing, or when you quit Firefox. This may cause problem, it depends on the editor setting.

### Initialize All Settings When Add-on Is Disabled
* If checked, all stored data will be removed and all prefs settings will be initialized.

***

## Options In Toolbar Button
* You can choose the icon color, you can rename the label of the editor, and you can open Add-on Manager from here.

***

## About Error / Warning Notification
Error or Warning message will be notified when...
* Failed to open the external editor.
* Failed to remove the temporary files at the end of Private Browsing.
* The add-on storage is / was over quota. In this case, stored data of temporary files are initialized.
