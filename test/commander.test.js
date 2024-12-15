/* api */
import fs, { promises as fsPromise } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sinon from 'sinon';
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import {
  cleanDirectory, commander, extractLibraries, includeLibraries, parseCommand,
  saveLibraryPackage
} from '../scripts/commander.js';

/* constants */
const DIR_CWD = process.cwd();

describe('save library package info', () => {
  it('should throw', async () => {
    await saveLibraryPackage().catch(e => {
      assert.instanceOf(e, TypeError);
      assert.strictEqual(e.message, 'Expected Array but got Undefined.');
    });
  });

  it('should throw', async () => {
    await saveLibraryPackage([]).catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it('should throw', async () => {
    await saveLibraryPackage([
      'foo'
    ]).catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it('should throw', async () => {
    await saveLibraryPackage([
      'foo',
      {
        name: 'foo'
      }
    ]).catch(e => {
      assert.instanceOf(e, Error);
    });
  });

  it('should throw', async () => {
    await saveLibraryPackage([
      'url',
      {
        name: 'url-sanitizer',
        raw: 'https://raw.githubusercontent.com/asamuzaK/urlSanitizer/',
        vPrefix: 'v',
        cdn: 'https://unpkg.com/url-sanitizer',
        repository: {
          type: 'git',
          url: 'https://github.com/asamuzaK/urlSanitizer.git'
        },
        type: 'module',
        files: [
          {
            file: 'foo',
            path: 'foo.txt'
          }
        ]
      }
    ]).catch(e => {
      const filePath = path.resolve(
        DIR_CWD, 'node_modules', 'url-sanitizer', 'foo.txt'
      );
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, `${filePath} is not a file.`);
    });
  });

  it('should throw', async () => {
    await saveLibraryPackage([
      'url',
      {
        name: 'url-sanitizer',
        raw: 'https://raw.githubusercontent.com/asamuzaK/urlSanitizer/',
        vPrefix: 'v',
        cdn: 'https://unpkg.com/url-sanitizer',
        repository: {
          type: 'git',
          url: 'https://github.com/asamuzaK/urlSanitizer.git'
        },
        type: 'module',
        files: [
          {
            file: 'foo',
            path: 'LICENSE'
          }
        ]
      }
    ]).catch(e => {
      const filePath = path.resolve(DIR_CWD, 'src', 'lib', 'url', 'foo');
      assert.instanceOf(e, Error);
      assert.strictEqual(e.message, `${filePath} is not a file.`);
    });
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubInfo = sinon.stub(console, 'info');
    const filePath =
      path.resolve(DIR_CWD, 'src', 'lib', 'url', 'package.json');
    const res = await saveLibraryPackage([
      'url',
      {
        name: 'url-sanitizer',
        raw: 'https://raw.githubusercontent.com/asamuzaK/urlSanitizer/',
        vPrefix: 'v',
        cdn: 'https://unpkg.com/url-sanitizer',
        repository: {
          type: 'git',
          url: 'https://github.com/asamuzaK/urlSanitizer.git'
        },
        type: 'module',
        files: [
          {
            file: 'LICENSE',
            path: 'LICENSE'
          },
          {
            file: 'url-sanitizer-wo-dompurify.min.js',
            path: 'dist/url-sanitizer-wo-dompurify.min.js'
          },
          {
            file: 'url-sanitizer-wo-dompurify.min.js.map',
            path: 'dist/url-sanitizer-wo-dompurify.min.js.map'
          }
        ]
      }
    ]);
    const { called: infoCalled } = stubInfo;
    const { calledOnce: writeCalled } = stubWrite;
    stubInfo.restore();
    stubWrite.restore();
    assert.isTrue(writeCalled, 'called');
    assert.isFalse(infoCalled, 'not called');
    assert.strictEqual(res, filePath, 'result');
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubInfo = sinon.stub(console, 'info');
    const filePath =
      path.resolve(DIR_CWD, 'src', 'lib', 'url', 'package.json');
    const res = await saveLibraryPackage([
      'url',
      {
        name: 'url-sanitizer',
        raw: 'https://raw.githubusercontent.com/asamuzaK/urlSanitizer/',
        vPrefix: 'v',
        cdn: 'https://unpkg.com/url-sanitizer',
        repository: {
          type: 'git',
          url: 'https://github.com/asamuzaK/urlSanitizer.git'
        },
        type: 'module',
        files: [
          {
            file: 'LICENSE',
            path: 'LICENSE'
          },
          {
            file: 'url-sanitizer-wo-dompurify.min.js',
            path: 'dist/url-sanitizer-wo-dompurify.min.js'
          },
          {
            file: 'url-sanitizer-wo-dompurify.min.js.map',
            path: 'dist/url-sanitizer-wo-dompurify.min.js.map'
          }
        ]
      }
    ], true);
    const { calledOnce: writeCalled } = stubWrite;
    const { calledOnce: infoCalled } = stubInfo;
    stubWrite.restore();
    stubInfo.restore();
    assert.isTrue(writeCalled, 'called');
    assert.isTrue(infoCalled, 'called');
    assert.strictEqual(res, filePath, 'result');
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubInfo = sinon.stub(console, 'info');
    const filePath =
      path.resolve(DIR_CWD, 'src', 'lib', 'purify', 'package.json');
    const res = await saveLibraryPackage([
      'purify',
      {
        name: 'dompurify',
        raw: 'https://raw.githubusercontent.com/cure53/DOMPurify/',
        cdn: 'https://unpkg.com/dompurify',
        repository: {
          type: 'git',
          url: 'git://github.com/cure53/DOMPurify.git'
        },
        files: [
          {
            file: 'LICENSE',
            path: 'LICENSE'
          },
          {
            file: 'purify.min.js',
            path: 'dist/purify.min.js'
          },
          {
            file: 'purify.min.js.map',
            path: 'dist/purify.min.js.map'
          }
        ]
      }
    ]);
    const { called: infoCalled } = stubInfo;
    const { calledOnce: writeCalled } = stubWrite;
    stubInfo.restore();
    stubWrite.restore();
    assert.isTrue(writeCalled, 'called');
    assert.isFalse(infoCalled, 'not called');
    assert.strictEqual(res, filePath, 'result');
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubInfo = sinon.stub(console, 'info');
    const filePath =
      path.resolve(DIR_CWD, 'src', 'lib', 'purify', 'package.json');
    const res = await saveLibraryPackage([
      'purify',
      {
        name: 'dompurify',
        raw: 'https://raw.githubusercontent.com/cure53/DOMPurify/',
        cdn: 'https://unpkg.com/dompurify',
        repository: {
          type: 'git',
          url: 'git://github.com/cure53/DOMPurify.git'
        },
        files: [
          {
            file: 'LICENSE',
            path: 'LICENSE'
          },
          {
            file: 'purify.min.js',
            path: 'dist/purify.min.js'
          },
          {
            file: 'purify.min.js.map',
            path: 'dist/purify.min.js.map'
          }
        ]
      }
    ], true);
    const { calledOnce: writeCalled } = stubWrite;
    const { calledOnce: infoCalled } = stubInfo;
    stubWrite.restore();
    stubInfo.restore();
    assert.isTrue(writeCalled, 'called');
    assert.isTrue(infoCalled, 'called');
    assert.strictEqual(res, filePath, 'result');
  });
});

describe('extract libraries', () => {
  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubAll = sinon.stub(Promise, 'allSettled').resolves([
      {
        reason: new Error('error'),
        status: 'rejected'
      }
    ]);
    const stubTrace = sinon.stub(console, 'trace');
    const i = stubTrace.callCount;
    const j = stubWrite.callCount;
    await extractLibraries();
    const { callCount: traceCallCount } = stubTrace;
    const { callCount: writeCallCount } = stubWrite;
    stubAll.restore();
    stubTrace.restore();
    stubWrite.restore();
    assert.strictEqual(traceCallCount, i + 1, 'trace');
    assert.strictEqual(writeCallCount, j, 'write');
  });

  it('should not call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubAll = sinon.stub(Promise, 'allSettled').resolves([
      {
        status: 'resolved'
      }
    ]);
    const stubTrace = sinon.stub(console, 'trace');
    const i = stubTrace.callCount;
    const j = stubWrite.callCount;
    await extractLibraries();
    const { callCount: traceCallCount } = stubTrace;
    const { callCount: writeCallCount } = stubWrite;
    stubAll.restore();
    stubTrace.restore();
    stubWrite.restore();
    assert.strictEqual(traceCallCount, i, 'trace');
    assert.strictEqual(writeCallCount, j, 'write');
  });

  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubAll = sinon.stub(Promise, 'allSettled').resolves([
      {
        reason: new Error('error'),
        status: 'rejected'
      }
    ]);
    const stubTrace = sinon.stub(console, 'trace');
    const i = stubTrace.callCount;
    const j = stubWrite.callCount;
    const opt = {
      dir: 'url'
    };
    await extractLibraries(opt);
    const { callCount: traceCallCount } = stubTrace;
    const { callCount: writeCallCount } = stubWrite;
    stubAll.restore();
    stubTrace.restore();
    stubWrite.restore();
    assert.strictEqual(traceCallCount, i + 1, 'trace');
    assert.strictEqual(writeCallCount, j, 'write');
  });

  it('should not call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubAll = sinon.stub(Promise, 'allSettled').resolves([
      {
        status: 'resolved'
      }
    ]);
    const stubTrace = sinon.stub(console, 'trace');
    const i = stubTrace.callCount;
    const j = stubWrite.callCount;
    const opt = {
      dir: 'url'
    };
    await extractLibraries(opt);
    const { callCount: traceCallCount } = stubTrace;
    const { callCount: writeCallCount } = stubWrite;
    stubAll.restore();
    stubTrace.restore();
    stubWrite.restore();
    assert.strictEqual(traceCallCount, i, 'trace');
    assert.strictEqual(writeCallCount, j, 'write');
  });
});

describe('include libraries', () => {
  it('should call function', async () => {
    const stubWrite = sinon.stub(fsPromise, 'writeFile');
    const stubAll = sinon.stub(Promise, 'allSettled').resolves([
      {
        reason: new Error('error'),
        status: 'rejected'
      }
    ]);
    const stubTrace = sinon.stub(console, 'trace');
    const i = stubTrace.callCount;
    const j = stubWrite.callCount;
    const res = await includeLibraries();
    const { callCount: traceCallCount } = stubTrace;
    const { callCount: writeCallCount } = stubWrite;
    stubAll.restore();
    stubTrace.restore();
    stubWrite.restore();
    assert.strictEqual(traceCallCount, i + 1, 'trace');
    assert.strictEqual(writeCallCount, j, 'write');
    assert.isUndefined(res, 'result');
  });
});

describe('clean directory', () => {
  it('should not call funtion', () => {
    const stubRm = sinon.stub(fs, 'rmSync');
    const dir = path.resolve('foo');
    cleanDirectory({ dir });
    const { called: rmCalled } = stubRm;
    stubRm.restore();
    assert.isFalse(rmCalled, 'not called');
  });

  it('should call funtion', () => {
    const stubRm = sinon.stub(fs, 'rmSync');
    const stubInfo = sinon.stub(console, 'info');
    const dir = path.resolve('test', 'file');
    cleanDirectory({ dir });
    const { calledOnce: rmCalled } = stubRm;
    const { called: infoCalled } = stubInfo;
    stubRm.restore();
    stubInfo.restore();
    assert.isTrue(rmCalled, 'called');
    assert.isFalse(infoCalled, 'not called');
  });

  it('should call funtion', () => {
    const stubRm = sinon.stub(fs, 'rmSync');
    const stubInfo = sinon.stub(console, 'info');
    const dir = path.resolve('test', 'file');
    cleanDirectory({ dir, info: true });
    const { calledOnce: rmCalled } = stubRm;
    const { calledOnce: infoCalled } = stubInfo;
    stubRm.restore();
    stubInfo.restore();
    assert.isTrue(rmCalled, 'called');
    assert.isTrue(infoCalled, 'not called');
  });
});

describe('parse command', () => {
  it('should not parse', () => {
    const stubParse = sinon.stub(commander, 'parse');
    const i = stubParse.callCount;
    parseCommand();
    assert.strictEqual(stubParse.callCount, i, 'not called');
    stubParse.restore();
  });

  it('should not parse', () => {
    const stubParse = sinon.stub(commander, 'parse');
    const i = stubParse.callCount;
    parseCommand([]);
    assert.strictEqual(stubParse.callCount, i, 'not called');
    stubParse.restore();
  });

  it('should not parse', () => {
    const stubParse = sinon.stub(commander, 'parse');
    const i = stubParse.callCount;
    parseCommand(['foo', 'bar', 'baz']);
    assert.strictEqual(stubParse.callCount, i, 'not called');
    stubParse.restore();
  });

  it('should parse', () => {
    const stubParse = sinon.stub(commander, 'parse');
    const stubVer = sinon.stub(commander, 'version');
    const i = stubParse.callCount;
    const j = stubVer.callCount;
    parseCommand(['foo', 'bar', '-v']);
    assert.strictEqual(stubParse.callCount, i + 1, 'called');
    assert.strictEqual(stubVer.callCount, j + 1, 'called');
    stubParse.restore();
    stubVer.restore();
  });

  it('should parse', () => {
    const stubParse = sinon.stub(commander, 'parse');
    const stubVer = sinon.stub(commander, 'version');
    const spyCmd = sinon.spy(commander, 'command');
    const i = stubParse.callCount;
    const j = stubVer.callCount;
    const k = spyCmd.callCount;
    parseCommand(['foo', 'bar', 'clean']);
    assert.strictEqual(stubParse.callCount, i + 1, 'called');
    assert.strictEqual(stubVer.callCount, j + 1, 'called');
    assert.strictEqual(spyCmd.callCount, k + 1, 'called');
    stubParse.restore();
    stubVer.restore();
    spyCmd.restore();
  });

  it('should parse', () => {
    const stubParse = sinon.stub(commander, 'parse');
    const stubVer = sinon.stub(commander, 'version');
    const spyCmd = sinon.spy(commander, 'command');
    const i = stubParse.callCount;
    const j = stubVer.callCount;
    const k = spyCmd.callCount;
    parseCommand(['foo', 'bar', 'include']);
    assert.strictEqual(stubParse.callCount, i + 1, 'called');
    assert.strictEqual(stubVer.callCount, j + 1, 'called');
    assert.strictEqual(spyCmd.callCount, k + 1, 'called');
    stubParse.restore();
    stubVer.restore();
    spyCmd.restore();
  });
});
