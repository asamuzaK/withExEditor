EN | [JA](./README.ja.md)

# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, from the context menu.
Available with (X)HTML, JavaScript, CSS, SVG, XML documents.

## Add-on Page
[withExEditor :: Add-ons for Firefox](https://addons.mozilla.org/ja/firefox/addon/withexeditor/ "withExEditor :: Add-ons for Firefox")

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

## Options In Add-on Manager

### Select An Editor
* Choose the editor which you want to use.
* When selecting an editor on Mac OS X, pick the file under `/Applications/[yourEditor].app/Contents/MacOS/` directory.

### Command Line Options
* Command line options of the editor.
* When using backslash (`\`) character, it must be escaped with an extra backslash.
ex: `C:\\Windows`
* If argument contains space(s), quote them with the double quotation mark (`"`).
ex: `"Some Arg"`

### Run Command In A Shell
* Spawns a shell and runs a command within that shell.
* The editor will be executed like Node.js `child_process.spawn(editorPath, [filePath, cmdArgs], option)`.
  But for example, suppose you want to put some extra arguments before the file path.
  To do so
  * Create a shell script (batch file)  
    ex: sample.cmd
    ```
    @echo off
    start "" "C:\Program Files\MyEditor\Editor.exe" /arg %*
    ```
  * Pick that shell script instead of the editor.
  * Enable this option
* Then it will be spawned like `child_process.spawn("C:\Windows\system32\cmd.exe" [/c, shellScript, filePath, cmdArgs])` (`child_process.spawn(/bin/sh [-c, shellScript, filePath, cmdArgs])` on Linux and Mac).

### Access Key
* Access key commonly used for the context menu, the shortcut for toolbar button options panel, and the shortcut for executing the editor directly.
* Choose any key, but it must be a single character.
* In the context menu, press `key` itself.

### Enable Shortcut Key To Open / Close The Options Panel
* To open / close the panel from the toolbar button, press `Ctrl + Alt + key` (`Cmd + Opt + key` on Mac).

### Enable Shortcut Key To Execute The Editor Directly
* To execute the editor without going through the context menu, press `Ctrl + Shift + key` (`Cmd + Shift + key` on Mac).

### Enable During Private Browsing
* Enables if checked, disables if not.

### Enable Only When Editing Text
* Appears in the context menu only if the content is editable.

### Forcibly Remove The Temporary Files
* The temporary files will be forcibly removed both at the end of Private Browsing and at shut down.
* It is recommended to be checked, but depending on the setting of the editor, there is a possibility that trouble occurs if you enable this option.

### Other Options
* You can customize the other options from the options panel.

***

## Options In Toolbar Button
* You can choose the icon color, you can rename the label of the editor, and you can open Add-on Manager from here.

***

## About Error / Warning Notification
Error or Warning message will be notified when...
* Failed to execute the external editor.
* Failed to remove the temporary files at the end of Private Browsing.
