export const appHost: Map<any, any>;
export const globalOpts: Map<any, any>;
export const globalOptsKeys: Set<string>;
export const localOpts: Map<any, any>;
export const localOptsKeys: Set<string>;
export function setOpts(opt?: object, store?: boolean): Promise<void>;
export function toggleBadge(): Promise<any>;
export namespace menuItems {
    namespace openOptionsPage {
        export { OPTIONS_OPEN as id };
        export const contexts: string[];
        export const placeholder: string;
    }
    namespace modeEditText {
        export { MODE_EDIT as id };
        const contexts_1: string[];
        export { contexts_1 as contexts };
        const placeholder_1: string;
        export { placeholder_1 as placeholder };
    }
    namespace modeEditTextPlaintext {
        export { MODE_EDIT_TXT as id };
        const contexts_2: string[];
        export { contexts_2 as contexts };
        export { MODE_EDIT as parentId };
        const placeholder_2: string;
        export { placeholder_2 as placeholder };
    }
    namespace modeEditTextHtml {
        export { MODE_EDIT_HTML as id };
        const contexts_3: string[];
        export { contexts_3 as contexts };
        export { MODE_EDIT as parentId };
        const placeholder_3: string;
        export { placeholder_3 as placeholder };
    }
    namespace modeEditTextMarkdown {
        export { MODE_EDIT_MD as id };
        const contexts_4: string[];
        export { contexts_4 as contexts };
        export { MODE_EDIT as parentId };
        const placeholder_4: string;
        export { placeholder_4 as placeholder };
    }
    namespace modeViewMathML {
        export { MODE_MATHML as id };
        const contexts_5: string[];
        export { contexts_5 as contexts };
        const placeholder_5: string;
        export { placeholder_5 as placeholder };
    }
    namespace modeViewSelection {
        export { MODE_SELECTION as id };
        const contexts_6: string[];
        export { contexts_6 as contexts };
        const placeholder_6: string;
        export { placeholder_6 as placeholder };
    }
    namespace modeViewSource {
        export { MODE_SOURCE as id };
        const contexts_7: string[];
        export { contexts_7 as contexts };
        const placeholder_7: string;
        export { placeholder_7 as placeholder };
    }
    namespace modeViewSVG {
        export { MODE_SVG as id };
        const contexts_8: string[];
        export { contexts_8 as contexts };
        const placeholder_8: string;
        export { placeholder_8 as placeholder };
    }
}
export function createMenuItemData(key?: string): object;
export function createContextMenu(): Promise<any[]>;
export function updateContextMenu(data?: object, all?: boolean): Promise<any[]>;
export function restoreContextMenu(): Promise<any>;
export function openOptionsPage(): Promise<any>;
export const tabList: Set<any>;
export function addIdToTabList(id: number): Promise<object>;
export function removeIdFromTabList(id: number): Promise<object>;
export function restoreTabList(): Promise<void>;
export function handleConnectableTab(tab?: object): Promise<any[]>;
export function handleClickedMenu(info?: object, tab?: object): Promise<any> | null;
export function sendTmpFileData(key: string, msg?: object): Promise<any> | null;
export function sendGetContent(): Promise<any> | null;
export function extractEditorConfig(data?: object): Promise<any[]>;
export function hostPostMsg(msg: any): Promise<void>;
export function handleHostMsg(msg?: object): Promise<any[]>;
export function handleDisconnectedHost(port?: object): Promise<any[]>;
export function handleHostOnDisconnect(port: object): Promise<any>;
export function handleHostOnMsg(msg?: object): Promise<any>;
export function setHost(): Promise<void>;
export function handleMsg(msg?: object, sender?: object): Promise<any[]>;
export function onTabActivated(info: object): Promise<any[]>;
export function onTabUpdated(id: number, info: object, tab: object): Promise<any[]>;
export function onTabRemoved(id: number, info: object): Promise<any[]>;
export function onWindowFocusChanged(): Promise<any[]>;
export function onWindowRemoved(): Promise<any[]>;
export function handleCmd(cmd: string): Promise<any> | null;
export function sendVariables(obj: object): Promise<any[]>;
export function setStorageValue(item: string, obj?: object, changed?: boolean): Promise<any[]>;
export function handleStorage(data?: object, area?: string): Promise<any[]>;
export function startup(): Promise<any>;
import { OPTIONS_OPEN } from "./constant.js";
import { MODE_EDIT } from "./constant.js";
import { MODE_EDIT_TXT } from "./constant.js";
import { MODE_EDIT_HTML } from "./constant.js";
import { MODE_EDIT_MD } from "./constant.js";
import { MODE_MATHML } from "./constant.js";
import { MODE_SELECTION } from "./constant.js";
import { MODE_SOURCE } from "./constant.js";
import { MODE_SVG } from "./constant.js";
