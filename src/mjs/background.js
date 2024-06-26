/**
 * background.js
 */

/* shared */
import { throwErr } from './common.js';
import {
  handleClickedMenu, handleCmd, handleMsg, handleStorage,
  onTabActivated, onTabRemoved, onTabUpdated, onWindowFocusChanged,
  onWindowRemoved, openOptionsPage, startup
} from './main.js';

/* api */
const { commands, runtime, storage, tabs, windows } = browser;
const action = browser.action ?? browser.browserAction;
const menus = browser.menus ?? browser.contextMenus;

/* listeners */
action.onClicked.addListener(() => openOptionsPage().catch(throwErr));
commands.onCommand.addListener((cmd, tab) =>
  handleCmd(cmd, tab).catch(throwErr));
menus.onClicked.addListener((info, tab) =>
  handleClickedMenu(info, tab).catch(throwErr)
);
runtime.onInstalled.addListener(() => startup().catch(throwErr));
runtime.onMessage.addListener((msg, sender) =>
  handleMsg(msg, sender).catch(throwErr)
);
runtime.onStartup.addListener(() => startup().catch(throwErr));
storage.onChanged.addListener((data, area) =>
  handleStorage(data, area, true).catch(throwErr)
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
