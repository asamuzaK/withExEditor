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
* Enabled on MathML elements and shows a generated DOM tree in MathML format. It may not be exactly the same as the source of the DOM tree, e.g. the order of the attributes.

### View Selection Source with *exEditor*
* Shows a generated DOM tree of the selection in XML format. It may not be exactly the same as the source of the DOM tree, e.g. the order of the attributes.
* If there are multiple ranges in selection, each range will be shown with a comment as a delimiter.
* If the selection is not DOM parsable, then creates a file that contains only the range of text selected.

### Edit Text with *exEditor*
* Enabled on form input elements, textarea elements, and editable elements.
* Edited contents will be synchronized when you go back to the browser and move focus to the element which you've edited.

***

## Options

### Toolbar Button Icon
* Choose the icon.

### Editor Path
* Enter the editor path.
* When selecting an editor on Mac OS, pick the file under '/Applications/[yourEditor].app/Contents/MacOS/' directory.

### Editor Label
* Enter the label of the editor.
* Disabled if editor is not selected.

### Command Line Options
* Command line options of the editor.
* When using backslash (\\) character, it must be escaped with an extra backslash. ex: C:\\\\Windows
* If argument contains space(s), quote them with the double quotation mark ("). ex: "Some Arg"

### Put File Path After Command Line Options
* Some editor requires the file path to be put after the command arguments. Enable this option in that case.

### Run Command In A Shell
* Spawns a shell and runs a command within that shell.
* If this option is enabled, you can run a shell script instead of executing the editor directly.
  1. Create a shell script (batch file) which executes the editor.
  2. In the 'Editor Path' field, enter the shell script path instead of the editor.
  3. Enable this option.

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

***

## About Error / Warning Notification
Error or Warning message will be notified when...
* Failed to execute the editor.
* The process of the editor did not exit normally.
* Failed to remove the temporary files at the end of Private Browsing.
