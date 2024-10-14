export { liveEdit as default };
export function getLiveEditKey(elm: object): string | null;
export function getLiveEditElement(node: object): object;
export function getLiveEditContent(elm: object, key: string): string | null;
declare namespace liveEdit {
    namespace aceEditor {
        let className: string;
        let getContent: string;
        let setContent: string;
        let url: string;
    }
    namespace codeMirror {
        let className_1: string;
        export { className_1 as className };
        let getContent_1: string;
        export { getContent_1 as getContent };
        let setContent_1: string;
        export { setContent_1 as setContent };
        let url_1: string;
        export { url_1 as url };
    }
    namespace tiddlyWiki {
        export let isIframe: boolean;
        let className_2: string;
        export { className_2 as className };
        let getContent_2: string;
        export { getContent_2 as getContent };
        let setContent_2: string;
        export { setContent_2 as setContent };
        let url_2: string;
        export { url_2 as url };
    }
    namespace tinyMCE {
        let isIframe_1: boolean;
        export { isIframe_1 as isIframe };
        let className_3: any;
        export { className_3 as className };
        let getContent_3: string;
        export { getContent_3 as getContent };
        let setContent_3: string;
        export { setContent_3 as setContent };
        let url_3: string;
        export { url_3 as url };
    }
}
