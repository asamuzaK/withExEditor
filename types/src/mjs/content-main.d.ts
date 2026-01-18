export namespace vars {
    let tabId: string;
    let windowId: string;
    let incognito: boolean;
    let isMac: boolean;
    let enableOnlyEditable: boolean;
    let enableSyncAuto: boolean;
    let syncAutoUrls: any;
    let contextMode: any;
    let contextNode: any;
    namespace keyBackSpace {
        export let code: string;
        export let key: string;
        export { KEY_CODE_BS as keyCode };
    }
    namespace keyCtrlA {
        let code_1: string;
        export { code_1 as code };
        let key_1: string;
        export { key_1 as key };
        export { KEY_CODE_A as keyCode };
    }
}
export function setModifierKey(bool?: boolean): void;
export const dataIds: Map<any, any>;
export function setDataId(dataId: string, data: object): object;
export function getTargetElementFromDataId(dataId: string): object;
export function getDataIdFromURI(uri: string, subst?: string): string;
export function getQueriedItems(elm: object): any[];
export function createIdData(elm: object): object;
export function setTmpFileData(data?: object): object;
export function updateTmpFileData(obj?: object): object;
export function removeTmpFileData(obj?: object): boolean;
export function fetchSource(data?: object): Promise<object>;
export function createTmpFileData(data?: object): Promise<object>;
export function sendMsg(msg: string | object): Promise<any> | null;
export function sendEachDataId(bool?: boolean): Promise<any[]>;
export function sendTmpFileData(dataId: string): Promise<any> | null;
export function requestTmpFile(evt: object): Promise<any[] | Error>;
export function setDataIdController(elm: object, dataId: string): void;
export function createContentData(elm: object, mode: string): Promise<object>;
export function createContentDataMsg(data: object): Promise<object>;
export function sendContent(elm: object, mode: string): Promise<any[]>;
export function getContextMode(elm: object): string;
export function determineContentProcess(obj?: object): Promise<any>;
export function createReplacingContent(node: object, opt?: object): object;
export function replaceEditableContent(node: object, opt?: object): void;
export function replaceEditControlValue(elm: object, opt?: object): void;
export function replaceLiveEditContent(elm: object, opt?: object): void;
export function syncText(obj?: object): Promise<any[]>;
export function handleMsg(msg: string | object): Promise<any[]>;
export function runtimeOnMsg(msg: string | object): Promise<any>;
export function sendTabStatus(): Promise<any>;
export function startup(): Promise<any>;
export function handleBeforeContextMenu(evt: object): Promise<any> | null;
export function handleKeyDown(evt: object): Promise<any> | null;
export function handleReadyState(evt: object): Promise<any> | null;
declare const KEY_CODE_BS: 8;
declare const KEY_CODE_A: 65;
export {};
