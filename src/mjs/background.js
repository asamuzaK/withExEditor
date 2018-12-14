/**
 * background.js
 */

import {
  throwErr,
} from "./common.js";
import {
  getAllStorage,
} from "./browser.js";
import {
  migrateStorage,
} from "./migrate.js";
import {
  handleCmd, handleDisconnectedHost, handleMsg, handlePort, host,
  onTabActivated, onTabRemoved, onTabUpdated, onWindowFocusChanged,
  onWindowRemoved, openOptionsPage, portContextMenuData, restoreContentScript,
  setDefaultIcon, setVars, storeSharedData, syncUI, toggleBadge,
} from "./main.js";
import fileExtData from "./file-ext.js";
import liveEditData from "./live-edit.js";
import nsUriData from "./ns-uri.js";

/* api */
const {
  browserAction, commands, contextMenus, runtime, storage,
  tabs, windows,
} = browser;

/* constants */
import {
  FILE_EXT, LIVE_EDIT, NS_URI,
} from "./constant.js";

/* listeners */
browserAction.onClicked.addListener(() => openOptionsPage().catch(throwErr));
commands.onCommand.addListener(cmd => handleCmd(cmd).catch(throwErr));
contextMenus.onClicked.addListener((info, tab) =>
  portContextMenuData(info, tab).catch(throwErr)
);
host.onDisconnect.addListener(port =>
  handleDisconnectedHost(port).then(toggleBadge).catch(throwErr)
);
host.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));
runtime.onConnect.addListener(port => handlePort(port).catch(throwErr));
runtime.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));
storage.onChanged.addListener(data =>
  setVars(data).then(syncUI).catch(throwErr)
);
tabs.onActivated.addListener(info => onTabActivated(info).catch(throwErr));
tabs.onUpdated.addListener((id, info, tab) =>
  onTabUpdated(id, info, tab).catch(throwErr)
);
tabs.onRemoved.addListener((id, info) =>
  onTabRemoved(id, info).catch(throwErr)
);
windows.onFocusChanged.addListener(windowId =>
  onWindowFocusChanged(windowId).catch(throwErr)
);
windows.onRemoved.addListener(windowId =>
  onWindowRemoved(windowId).catch(throwErr)
);

/* startup */
Promise.all([
  setDefaultIcon().then(getAllStorage).then(setVars).then(restoreContentScript)
    .then(syncUI),
  storeSharedData(NS_URI, nsUriData),
  storeSharedData(FILE_EXT, fileExtData),
  storeSharedData(LIVE_EDIT, liveEditData),
  migrateStorage(),
]).catch(throwErr);
