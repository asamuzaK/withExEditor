/**
 * uri-scheme.js
 * TODO: rename file
 */

/* shared */
import { getType, isString } from './common.js';

/* constants */
const HEX = 16;

/**
 * uri schemes
 *
 * @see {@link https://www.iana.org/assignments/uri-schemes/uri-schemes.xhtml}
 *      - Historical schemes omitted
 *      - Added 'moz-extension' scheme
 */
const uriSchemes = [
  'aaa',
  'aaas',
  'about',
  'acap',
  'acct',
  'acd',
  'acr',
  'adiumxtra',
  'adt',
  'afp',
  'afs',
  'aim',
  'amss',
  'android',
  'appdata',
  'apt',
  'ar',
  'ark',
  'attachment',
  'aw',
  'barion',
  'beshare',
  'bitcoin',
  'bitcoincash',
  'blob',
  'bolo',
  'browserext',
  'cabal',
  'calculator',
  'callto',
  'cap',
  'cast',
  'casts',
  'chrome',
  'chrome-extension',
  'cid',
  'coap',
  'coaps',
  'com-eventbrite-attendee',
  'content',
  'content-type',
  'crid',
  'cstr',
  'cvs',
  'dab',
  'dat',
  'data',
  'dav',
  'diaspora',
  'dict',
  'did',
  'dis',
  'dlna-playcontainer',
  'dlna-playsingle',
  'dns',
  'dntp',
  'doi',
  'dpp',
  'drm',
  'dtmi',
  'dtn',
  'dvb',
  'dvx',
  'dweb',
  'ed2k',
  'eid',
  'elsi',
  'embedded',
  'ens',
  'ethereum',
  'example',
  'facetime',
  'feed',
  'feedready',
  'fido',
  'file',
  'finger',
  'first-run-pen-experience',
  'fish',
  'fm',
  'ftp',
  'fuchsia-pkg',
  'geo',
  'gg',
  'git',
  'gitoid',
  'gizmoproject',
  'go',
  'gopher',
  'graph',
  'gtalk',
  'h323',
  'ham',
  'hcap',
  'hcp',
  'http',
  'https',
  'hxxp',
  'hxxps',
  'hydrazone',
  'hyper',
  'iax',
  'icap',
  'icon',
  'im',
  'imap',
  'info',
  'iotdisco',
  'ipfs',
  'ipn',
  'ipns',
  'ipp',
  'ipps',
  'irc',
  'irc6',
  'ircs',
  'iris',
  'iris.beep',
  'iris.lwz',
  'iris.xpc',
  'iris.xpcs',
  'isostore',
  'itms',
  'jabber',
  'jar',
  'jms',
  'keyparc',
  'lastfm',
  'lbry',
  'ldap',
  'ldaps',
  'leaptofrogans',
  'lorawan',
  'lpa',
  'lvlt',
  'magnet',
  'mailto',
  'maps',
  'market',
  'matrix',
  'message',
  'microsoft.windows.camera',
  'microsoft.windows.camera.multipicker',
  'microsoft.windows.camera.picker',
  'mid',
  'mms',
  'mongodb',
  'moz',
  'moz-extension',
  'ms-access',
  'ms-appinstaller',
  'ms-browser-extension',
  'ms-calculator',
  'ms-drive-to',
  'ms-enrollment',
  'ms-excel',
  'ms-eyecontrolspeech',
  'ms-gamebarservices',
  'ms-gamingoverlay',
  'ms-getoffice',
  'ms-help',
  'ms-infopath',
  'ms-inputapp',
  'ms-lockscreencomponent-config',
  'ms-media-stream-id',
  'ms-meetnow',
  'ms-mixedrealitycapture',
  'ms-mobileplans',
  'ms-newsandinterests',
  'ms-officeapp',
  'ms-people',
  'ms-powerpoint',
  'ms-project',
  'ms-publisher',
  'ms-restoretabcompanion',
  'ms-screenclip',
  'ms-screensketch',
  'ms-search',
  'ms-search-repair',
  'ms-secondary-screen-controller',
  'ms-secondary-screen-setup',
  'ms-settings',
  'ms-settings-airplanemode',
  'ms-settings-bluetooth',
  'ms-settings-camera',
  'ms-settings-cellular',
  'ms-settings-cloudstorage',
  'ms-settings-connectabledevices',
  'ms-settings-displays-topology',
  'ms-settings-emailandaccounts',
  'ms-settings-language',
  'ms-settings-location',
  'ms-settings-lock',
  'ms-settings-nfctransactions',
  'ms-settings-notifications',
  'ms-settings-power',
  'ms-settings-privacy',
  'ms-settings-proximity',
  'ms-settings-screenrotation',
  'ms-settings-wifi',
  'ms-settings-workplace',
  'ms-spd',
  'ms-stickers',
  'ms-sttoverlay',
  'ms-transit-to',
  'ms-useractivityset',
  'ms-virtualtouchpad',
  'ms-visio',
  'ms-walk-to',
  'ms-whiteboard',
  'ms-whiteboard-cmd',
  'ms-word',
  'msnim',
  'msrp',
  'msrps',
  'mss',
  'mt',
  'mtqp',
  'mumble',
  'mupdate',
  'mvn',
  'news',
  'nfs',
  'ni',
  'nih',
  'nntp',
  'notes',
  'num',
  'ocf',
  'oid',
  'onenote',
  'onenote-cmd',
  'opaquelocktoken',
  'openpgp4fpr',
  'otpauth',
  'palm',
  'paparazzi',
  'payment',
  'payto',
  'pkcs11',
  'platform',
  'pop',
  'pres',
  'proxy',
  'psyc',
  'pttp',
  'pwid',
  'qb',
  'query',
  'quic-transport',
  'redis',
  'rediss',
  'reload',
  'res',
  'resource',
  'rmi',
  'rsync',
  'rtmfp',
  'rtmp',
  'rtsp',
  'rtsps',
  'rtspu',
  'sarif',
  'secondlife',
  'secret-token',
  'service',
  'session',
  'sftp',
  'sgn',
  'shc',
  'sieve',
  'simpleledger',
  'simplex',
  'sip',
  'sips',
  'skype',
  'smb',
  'smp',
  'sms',
  'smtp',
  'snmp',
  'soap.beep',
  'soap.beeps',
  'soldat',
  'spiffe',
  'spotify',
  'ssb',
  'ssh',
  'starknet',
  'steam',
  'stun',
  'stuns',
  'submit',
  'svn',
  'swh',
  'swid',
  'swidpath',
  'tag',
  'taler',
  'teamspeak',
  'tel',
  'teliaeid',
  'telnet',
  'tftp',
  'things',
  'thismessage',
  'tip',
  'tn3270',
  'tool',
  'turn',
  'turns',
  'tv',
  'udp',
  'unreal',
  'urn',
  'ut2004',
  'uuid-in-package',
  'v-event',
  'vemmi',
  'ventrilo',
  'ves',
  'view-source',
  'vnc',
  'vscode',
  'vscode-insiders',
  'vsls',
  'w3',
  'wcr',
  'web3',
  'webcal',
  'wifi',
  'ws',
  'wss',
  'wtai',
  'wyciwyg',
  'xcon',
  'xcon-userid',
  'xfire',
  'xmlrpc.beep',
  'xmlrpc.beeps',
  'xmpp',
  'xri',
  'ymsgr',
  'z39.50r',
  'z39.50s'
];

export { uriSchemes as default };

/**
 * is URI
 *
 * @param {string} uri - URI input
 * @returns {boolean} - result
 */
export const isUri = uri => {
  let res;
  if (isString(uri)) {
    try {
      const { protocol } = new URL(uri);
      const scheme = protocol.replace(/:$/, '');
      const schemeParts = scheme.split('+');
      res = /^(?:ext|web)\+[a-z]+$/.test(scheme) ||
            schemeParts.every(s => uriSchemes.includes(s));
    } catch (e) {
      res = false;
    }
  }
  return !!res;
};

/**
 * get URL encoded string
 *
 * @param {string} str - string
 * @returns {string} - URL encoded string
 */
export const getUrlEncodedString = str => {
  if (!isString(str)) {
    throw new TypeError(`Expected String but got ${getType(str)}.`);
  }
  const chars = [];
  for (const ch of str) {
    chars.push(`%${ch.charCodeAt(0).toString(HEX).toUpperCase()}`);
  }
  return chars.join('');
};

/**
 * escape URL encoded HTML special chars
 *
 * @param {string} ch - URL encoded char
 * @returns {string} - escaped URL encoded HTML special char
 */
export const escapeUrlEncodedHtmlChars = ch => {
  if (isString(ch)) {
    if (/^%[\da-z]{2}$/i.test(ch)) {
      ch = ch.toUpperCase();
    } else {
      throw new Error(`${ch} is not a URL encoded character.`);
    }
  } else {
    throw new TypeError(`Expected String but got ${getType(ch)}.`);
  }
  const [amp, num, lt, gt, quot, apos] =
    ['&', '#', '<', '>', '"', "'"].map(getUrlEncodedString);
  let escapedChar;
  if (ch === amp) {
    escapedChar = `${amp}amp;`;
  } else if (ch === lt) {
    escapedChar = `${amp}lt;`;
  } else if (ch === gt) {
    escapedChar = `${amp}gt;`;
  } else if (ch === quot) {
    escapedChar = `${amp}quot;`;
  } else if (ch === apos) {
    escapedChar = `${amp}${num}39;`;
  } else {
    escapedChar = ch;
  }
  return escapedChar;
};

/**
 * sanitize URL
 *
 * @param {string} url - URL input
 * @param {object} opt - options to accept / deny schemes
 * @returns {?string} - sanitized URL
 */
export const sanitizeUrl = (url, opt = { data: false, file: false }) => {
  let sanitizedUrl;
  if (isUri(url)) {
    const { data, file } = opt;
    const { href, protocol } = new URL(url);
    const scheme = protocol.replace(/:$/, '');
    const schemeParts = scheme.split('+');
    // TODO: accept / deny keys in opt
    if ((data || schemeParts.every(s => s !== 'data')) &&
        (file || schemeParts.every(s => s !== 'file'))) {
      // TODO: add check if data scheme is accepted and data are base64
      const [amp, lt, gt, quot, apos] =
        ['&', '<', '>', '"', "'"].map(getUrlEncodedString);
      const escapeCharsReg = /[<>"']/g;
      const ampersandReg = new RegExp(amp, 'g');
      const htmlCharsReg = new RegExp(`(${lt}|${gt}|${quot}|${apos})`, 'g');
      sanitizedUrl = href.replace(escapeCharsReg, getUrlEncodedString)
        .replace(ampersandReg, escapeUrlEncodedHtmlChars)
        .replace(htmlCharsReg, escapeUrlEncodedHtmlChars);
    }
  }
  return sanitizedUrl || null;
};