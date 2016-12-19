EN | [JA](./README.ja.md)

# withExEditor
Firefox add-on to View Source, View Selection, and Edit Texts with the external editor which you like, from the context menu.
Available with (X)HTML, JavaScript, CSS, MathML, SVG, XML documents.

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
* Disabled if application manifest path field is not filled, or could not find the host etc.

### Access Key
* Access key commonly used for the context menu, for the shortcut to open the options page, and for the shortcut to execute the editor directly.
* Choose any key, but it must be a single character.
* In the context menu, press 'key' itself.
* NOTE: accesskey in context menu is not yet implemented in WebExtensions.

### Enable Shortcut Key To Open The Options Page
* To open the options page, press 'Ctrl + Alt + key' ('Cmd + Opt + key' on Mac).

### Enable Shortcut Key To Execute The Editor Directly
* To execute the editor without going through the context menu, press 'Ctrl + Shift + key' ('Cmd + Shift + key' on Mac).

### Enable During Private Browsing
* Enables if checked, disables if not.

### Enable Only When Editing Text
* Appears in the context menu only if the content is editable.

### Forcibly Remove Temporary Files
* Forcibly remove temporary files at the end of Private Browsing or at shut down.
* Recommended to be checked, though depending on the editor, this option may cause problems if it is enabled.

***

## Application Manifest Manual
### Important Notice
Unlike the Jetpack SDK used by prior withExEditor, Mozilla's new add-on ecosystem WebExtensions does not allow to spawn child process from the add-on (that is, external editor can not be executed directly anymore).
Instead, in WebExtensions, the browser interacts with native application via messages.
For details, refer to [Native messaging - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging).

Therefore, to use withExEditor, you need to prepare:

* A host which executes the external editor
* An application manifest of the host

### Host
Create a host which executes the editor, and save it in an arbitrary location.
The host should be able to handle binary data passed in standard input (stdin).
From withExEditor, "temporary file path", which is created for source view / text edit, will be sent to the host.

The following is an example of a host written in Python.

Python Script Example:
```
#!/usr/bin/env python
# coding: utf-8

import sys, json, struct, subprocess

# Read a message from stdin and decode it.
def getMessage():
  rawLength = sys.stdin.buffer.read(4)
  if len(rawLength) == 0:
    sys.exit()
  message = sys.stdin.buffer.read(struct.unpack("@I", rawLength)[0])
  if message:
    return json.loads(message.decode("utf-8"))
  else:
    return false

# Editor path
app = "C:\Program Files\Path\To\YourEditor.exe"

# Command line arguments array as appropriate.
# args = []

while True:
  file = getMessage()
  cmd = []
  cmd.append(app)

  # If you want arguments before file
  # cmd.extend(args)

  cmd.append(file)

  # If you want arguments after file
  # cmd.extend(args)

  subprocess.run(cmd)

sys.exit()
```

On Windows, also create a shell script (batch file) to execute python script.

Shell Script Example (Windows):
```
@echo off
python "C:\path\to\youreditor.py"
```

### Application manifest
Create an application manifest in JSON format that contains the path of the host.

Manifest Example:
```
{
  "name": "youreditor",
  "description": "Host to execute youreditor",
  "path": "C:\\path\\to\\youreditor.cmd",
  "type": "stdio",
  "allowed_extensions": ["jid1-WiAigu4HIo0Tag@jetpack"]
}
```

* *name* - The name of the editor to use. Only lowercase letters and numbers, dots, underscores are allowed. - It must also match the filename of the host.
* *description* - Description of the host.
* *path* - The path of the host that executes the editor. Note that on Windows, it is necessary to escape backslashes, which is a directory delimiter, by adding an extra backslash. Also on Windows, if you created a host with the python script following the above example, fill in the path of the shell script, not the path of the python script.
* *type* - Enter "stdio".
* *allowed_extensions* - An array of addon IDs. Fill in the bracket with "jid1-WiAigu4HIo0Tag@jetpack" which is ID of withExEditor.

Save the manifest with the same file name as the "name" field, the file extension of .json, and the character code of UTF-8 (without BOM).
Refer to [App manifest location](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_manifest_location) where to save the manifest.

On Windows, you also need to set the registry.
If the path of the manifest is "C:\Users\xxx\youreditor.json", run the following command with cmd.exe.
Then you can save the registry key.

REG ADD Example (Windows):
```
REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\youreditor" /ve /d "C:\Users\xxx\youreditor.json" /f
```

After completing the above work, *enter the manifest path in Options page*.
