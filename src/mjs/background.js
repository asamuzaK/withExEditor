/**
 * background.js
 */

/* shared */
import { throwErr } from './common.js';
import {
  handleCmd, handleMsg, onTabActivated, onTabRemoved, onTabUpdated,
  onWindowFocusChanged, onWindowRemoved, openOptionsPage, sendContextMenuData,
  setVars, startup
} from './main.js';

/* api */
const { commands, runtime, storage, tabs, windows } = browser;
const action = browser.action ?? browser.browserAction;
const menus = browser.menus ?? browser.contextMenus;

/* listeners */
action.onClicked.addListener(() => openOptionsPage().catch(throwErr));
commands.onCommand.addListener(cmd => handleCmd(cmd).catch(throwErr));
menus.onClicked.addListener((info, tab) =>
  sendContextMenuData(info, tab).catch(throwErr)
);
runtime.onInstalled.addListener(() => startup().catch(throwErr));
runtime.onMessage.addListener((msg, sender) =>
  handleMsg(msg, sender).catch(throwErr)
);
runtime.onStartup.addListener(() => startup().catch(throwErr));
storage.onChanged.addListener((data, area) =>
  setVars(data, area).catch(throwErr)
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
