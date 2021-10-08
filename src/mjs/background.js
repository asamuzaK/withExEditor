/**
 * background.js
 */

/* shared */
import { throwErr } from './common.js';
import {
  handleCmd, handleDisconnectedHost, handleMsg, handlePort, host,
  onTabActivated, onTabRemoved, onTabUpdated, onWindowFocusChanged,
  onWindowRemoved, openOptionsPage, postContextMenuData, setVars, startup
} from './main.js';

/* api */
const {
  browserAction, commands, runtime, storage, tabs, windows
} = browser;
const menus = browser.menus || browser.contextMenus;

/* listeners */
browserAction.onClicked.addListener(() => openOptionsPage().catch(throwErr));
commands.onCommand.addListener(cmd => handleCmd(cmd).catch(throwErr));
host.onDisconnect.addListener(port =>
  handleDisconnectedHost(port).catch(throwErr)
);
host.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));
menus.onClicked.addListener((info, tab) =>
  postContextMenuData(info, tab).catch(throwErr)
);
runtime.onConnect.addListener(port => handlePort(port).catch(throwErr));
runtime.onMessage.addListener((msg, sender) =>
  handleMsg(msg, sender).catch(throwErr)
);
storage.onChanged.addListener(data =>
  setVars(data).catch(throwErr)
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
document.addEventListener('DOMContentLoaded', startup);
