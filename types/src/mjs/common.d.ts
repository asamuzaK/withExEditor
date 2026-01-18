export function logErr(e: object): boolean;
export function throwErr(e: object): never;
export function logWarn(msg: string | object): boolean;
export function logMsg(msg: string | object): object;
export function getType(o: object): string;
export function isString(o: object): boolean;
export function isObjectNotEmpty(o: object): boolean;
export function sleep(msec?: number, doReject?: boolean): Promise<any> | null;
export function stringifyPositiveInt(i: number, zero?: boolean): string | null;
