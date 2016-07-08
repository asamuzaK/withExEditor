# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, on context menu.
Available with (X)HTML, JavaScript, CSS, SVG, XML documents.

## Add-on Page
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/ja/firefox/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Usage

### View Page Source with *exEditor*
* Creates a temporary file and opens with the external editor.
* The temporary file is encoded in UTF-8, even if the original document is not so.
* When browsing a local file, the local file will be opened directly.

### View MathML Source with *exEditor*
* Enabled on MathML elements and shows a generated DOM tree in MathML format. It may not be the same with the DOM tree of the document source.

### View Selection Source with *exEditor*
* Shows a generated DOM tree of the selection in XML format. It may not be the same with the DOM tree of the document source.
* If there are multiple ranges in selection, each range will be shown with a comment as a delimiter.
* If the selection is not DOM parsable, then creates a file that contains only the range of text selected.

### Edit Text with *exEditor*
* Enabled on form input elements, textarea elements, and editable elements.
* Edited contents will be synchronized when you go back to the browser and move focus to the element which you've edited.

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

### Access Key
* You can choose any key. But, it must be a single character.
* On context menu, press `key` itself.
* To open / close the panel from the toolbar button, press `Ctrl + Alt + key` (`Cmd + Opt + key` on Mac).

### Enable During Private Browsing
* Enables if checked, disabled if not.

### Enable Only For Text Entry Fields
* Appears on context menu only when content is editable.

### Force To Remove The Temporary Files At Shutdown
* You can choose whether or not to forcibly remove the temporary files at the end of Private Browsing, or when you quit Firefox.
* It is recommended to be checked, but there is a possibility that trouble occurs if you enable this option. It depends on the settings of the editor.

***

## Options In Toolbar Button
* You can choose the icon color, you can rename the label of the editor, and you can open Add-on Manager from here.

***

## About Error / Warning Notification
Error or Warning message will be notified when...
* Failed to execute the external editor.
* Failed to remove the temporary files at the end of Private Browsing.
