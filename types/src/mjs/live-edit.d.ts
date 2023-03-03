export { liveEdit as default };
export function getLiveEditKey(elm?: object): string | null;
export function getLiveEditElement(node?: object): object;
export function getLiveEditContent(elm?: object, key?: string): string | null;
declare namespace liveEdit {
    namespace aceEditor {
        const className: string;
        const getContent: string;
        const setContent: string;
        const url: string;
    }
    namespace codeMirror {
        const className_1: string;
        export { className_1 as className };
        const getContent_1: string;
        export { getContent_1 as getContent };
        const setContent_1: string;
        export { setContent_1 as setContent };
        const url_1: string;
        export { url_1 as url };
    }
    namespace tiddlyWiki {
        export const isIframe: boolean;
        const className_2: string;
        export { className_2 as className };
        const getContent_2: string;
        export { getContent_2 as getContent };
        const setContent_2: string;
        export { setContent_2 as setContent };
        const url_2: string;
        export { url_2 as url };
    }
    namespace tinyMCE {
        const isIframe_1: boolean;
        export { isIframe_1 as isIframe };
        const className_3: any;
        export { className_3 as className };
        const getContent_3: string;
        export { getContent_3 as getContent };
        const setContent_3: string;
        export { setContent_3 as setContent };
        const url_3: string;
        export { url_3 as url };
    }
}
