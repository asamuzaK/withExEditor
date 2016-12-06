EN | [JA](./README.ja.md)

# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, from the context menu.
Available with (X)HTML, JavaScript, CSS, SVG, XML documents.

## Add-on Page
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

## Usage

### View Page Source with *exEditor*
* Creates a temporary file and opens with the external editor.
* The temporary file is encoded in UTF-8, even if the original document is not so.
* When browsing a local file, the local file will be opened directly.

### View MathML Source with *exEditor*
* Enabled on MathML elements and shows a generated DOM tree in MathML format.

### View SVG Source with *exEditor*
* Enabled on SVG elements and shows a generated DOM tree in SVG format.

### View Selection Source with *exEditor*
* Shows a generated DOM tree of the selection in XML format.
* If there are multiple ranges in selection, each range will be shown with a comment as a delimiter.
* If the selection is not DOM parsable, then creates a file that contains only the range of text selected.

### Edit Text with *exEditor*
* Enabled on form input elements, textarea elements, and editable elements.
* Edited contents will be synchronized when you go back to the browser and move focus to the element which you've edited.

***

## Options

### Toolbar Button Icon
* Choose the icon.

### Manifest Path
* Enter the application manifest path.

### Editor Label
* Enter the label of the editor.
* Disabled if editor is not selected.

### Access Key
* Access key commonly used for the context menu, for the shortcut to open the options page, and for the shortcut to execute the editor directly.
* Choose any key, but it must be a single character.
* In the context menu, press 'key' itself.

### Enable Shortcut Key To Open The Options Page
* To open the options page, press 'Ctrl + Alt + key' ('Cmd + Opt + key' on Mac).

### Enable Shortcut Key To Execute The Editor Directly
* To execute the editor without going through the context menu, press 'Ctrl + Shift + key' ('Cmd + Shift + key' on Mac).

### Enable During Private Browsing
* Enables if checked, disables if not.

### Enable Only When Editing Text
* Appears in the context menu only if the content is editable.

### Forcibly Remove The Temporary Files
* The temporary files will be forcibly removed both at the end of Private Browsing and at shut down.
* It is recommended to be checked, but depending on the setting of the editor, there is a possibility that trouble occurs if you enable this option.
