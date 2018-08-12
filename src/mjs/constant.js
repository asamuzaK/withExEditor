/**
 * constant.js
 */

export const CONTENT_GET = "getContent";
export const CONTENT_SCRIPT_PATH = "js/content.js";
export const CONTEXT_MENU = "contextMenu";
export const DATA_I18N = "data-i18n";
export const EDITOR_CONFIG_GET = "getEditorConfig";
export const EDITOR_CONFIG_RES = "resEditorConfig";
export const EDITOR_CONFIG_TS = "editorConfigTimestamp";
export const EDITOR_EXEC = "execEditor";
export const EDITOR_FILE_NAME = "editorFileName";
export const EDITOR_LABEL = "editorLabel";
export const ENABLE_PB = "enablePB";
export const EXT_LOCALE = "extensionLocale";
export const EXT_RELOAD = "reloadExtension";
export const FILE_EXT = "fileExt";
export const FILE_EXT_PATH = "data/fileExt.json";
export const HOST = "withexeditorhost";
export const HOST_CONNECTION = "hostConnection";
export const HOST_ERR_NOTIFY = "notifyHostError";
export const HOST_STATUS = "hostStatus";
export const HOST_STATUS_GET = "getHostStatus";
export const HOST_VERSION = "hostVersion";
export const HOST_VERSION_CHECK = "checkHostVersion";
export const ICON = "img/icon.svg";
export const ICON_AUTO = "buttonIconAuto";
export const ICON_BLACK = "buttonIconBlack";
export const ICON_COLOR = "buttonIconColor";
export const ICON_DARK = "buttonIconDark";
export const ICON_DARK_ID = "#dark";
export const ICON_LIGHT = "buttonIconLight";
export const ICON_LIGHT_ID = "#light";
export const ICON_ID = "iconId";
export const ICON_WHITE = "buttonIconWhite";
export const IS_ENABLED = "isEnabled";
export const IS_EXECUTABLE = "isExecutable";
export const IS_WEBEXT = "isWebExtension";
export const KEY_ACCESS = "accessKey";
export const KEY_EDITOR = "editorShortCut";
export const KEY_OPTIONS = "optionsShortCut";
export const LABEL = "withExEditor";
export const LIVE_EDIT = "liveEdit";
export const LIVE_EDIT_PATH = "data/liveEdit.json";
export const LOCAL_FILE_VIEW = "viewLocalFile";
export const MENU_ENABLED = "menuEnabled";
export const MODE_EDIT = "modeEditText";
export const MODE_MATHML = "modeViewMathML";
export const MODE_SELECTION = "modeViewSelection";
export const MODE_SOURCE = "modeViewSource";
export const MODE_SVG = "modeViewSVG";
export const NS_URI = "nsUri";
export const NS_URI_PATH = "data/nsUri.json";
export const ONLY_EDITABLE = "enableOnlyEditable";
export const OPTIONS_OPEN = "openOptionsPage";
export const PORT_CONTENT = "portContent";
export const PROCESS_CHILD = "childProcess";
export const STORAGE_SET = "setStorage";
export const SYNC_AUTO = "enableSyncAuto";
export const SYNC_AUTO_URL = "syncAutoUrls";
export const THEME_DARK =
  "firefox-compact-dark@mozilla.org@personas.mozilla.org";
export const THEME_LIGHT =
  "firefox-compact-light@mozilla.org@personas.mozilla.org";
export const TMP_FILES = "tmpFiles";
export const TMP_FILES_PB = "tmpFilesPb";
export const TMP_FILES_PB_REMOVE = "removePrivateTmpFiles";
export const TMP_FILE_CREATE = "createTmpFile";
export const TMP_FILE_DATA_PORT = "portTmpFileData";
export const TMP_FILE_DATA_REMOVE = "removeTmpFileData";
export const TMP_FILE_GET = "getTmpFile";
export const TMP_FILE_REQ = "requestTmpFile";
export const TMP_FILE_RES = "resTmpFile";
export const TYPE_FROM = 8;
export const TYPE_TO = -1;
export const VARS_SET = "setVars";
export const VERSION_PART =
    "(?:0|[1-9]\\d{0,3}|[1-5]\\d{4}|6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5]))))";
export const VERSION_TOOLKIT =
    `(${VERSION_PART}(?:\\.${VERSION_PART}){1,3})([A-z]+(?:-?[A-z\\d]+)?)?`;
export const VERSION_TOOLKIT_REGEXP = new RegExp(`^(?:${VERSION_TOOLKIT})$`);
export const WARN = "warn";
export const WARN_COLOR = "#D70022";
export const WARN_TEXT = "!";
export const WEBEXT_ID = "jid1-WiAigu4HIo0Tag@jetpack";
