/**
 * background.js
 */

/* shared */
import { throwErr } from './common.js';
import {
  handleActivatedTab, handleCmd, handleConnectedPort, handleFocusedWindow,
  handleMsg, handleRemovedTab, handleRemovedWindow, handleUpdatedTab,
  openOptionsPage, postContextMenuData, setVars, startup
} from './main.js';

/* api */
const {
  browserAction, commands, runtime, storage, tabs, windows
} = browser;
const menus = browser.menus ?? browser.contextMenus;

/* listeners */
browserAction.onClicked.addListener(() => openOptionsPage().catch(throwErr));
commands.onCommand.addListener(cmd => handleCmd(cmd).catch(throwErr));
menus.onClicked.addListener((info, tab) =>
  postContextMenuData(info, tab).catch(throwErr)
);
runtime.onConnect.addListener(port =>
  handleConnectedPort(port).catch(throwErr)
);
runtime.onInstalled.addListener(() => startup().catch(throwErr));
runtime.onMessage.addListener((msg, sender) =>
  handleMsg(msg, sender).catch(throwErr)
);
runtime.onStartup.addListener(() => startup().catch(throwErr));
storage.onChanged.addListener(data => setVars(data).catch(throwErr));
tabs.onActivated.addListener(info => handleActivatedTab(info).catch(throwErr));
tabs.onUpdated.addListener((id, info, tab) =>
  handleUpdatedTab(id, info, tab).catch(throwErr)
);
tabs.onRemoved.addListener((id, info) =>
  handleRemovedTab(id, info).catch(throwErr)
);
windows.onFocusChanged.addListener(windowId =>
  handleFocusedWindow(windowId).catch(throwErr)
);
windows.onRemoved.addListener(windowId =>
  handleRemovedWindow(windowId).catch(throwErr)
);
