/**
 * uri-scheme.test.js
 */

/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import uriSchemes, * as mjs from '../src/mjs/uri-scheme.js';

describe('uri-scheme', () => {
  it('should get string', () => {
    assert.isArray(uriSchemes);
    for (const scheme of uriSchemes) {
      assert.isString(scheme);
      assert.isTrue(/^[a-z][a-z0-9+\-.]*$/.test(scheme));
    }
  });

  describe('is URI', () => {
    const func = mjs.isUri;

    it('should get false', () => {
      const res = func();
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('foo');
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('foo:bar');
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('javascript:alert(1)');
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('Javas&#99;ript:alert(1)');
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('/../');
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('../../');
      assert.isFalse(res, 'result');
    });

    it('should get true', () => {
      const res = func('https://example.com');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func(' https://example.com ');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('https://example.com:8000/#foo?bar=baz');
      assert.isTrue(res, 'result');
    });

    it('should get false', () => {
      const res = func('https://example.com foo');
      assert.isFalse(res, 'result');
    });

    it('should get true', () => {
      const res = func('https://127.0.0.1');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('https://[::1]/');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('file:///C:/Users/Foo/');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('mailto:foo@example.com');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('ext+foo://example.com/');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('web+foo://example.com/');
      assert.isTrue(res, 'result');
    });

    it('should get true', () => {
      const res = func('git+https://example.com/');
      assert.isTrue(res, 'result');
    });

    it('should get false', () => {
      const res = func('foo+https://example.com/');
      assert.isFalse(res, 'result');
    });

    it('should get false', () => {
      const res = func('git+foo://example.com/');
      assert.isFalse(res, 'result');
    });

    it('should get true', () => {
      const res = func('URN:ISBN:4-8399-0454-5');
      assert.isTrue(res, 'result');
    });
  });

  describe('get URL encoded string', () => {
    const func = mjs.getUrlEncodedString;

    it('should throw', () => {
      assert.throws(() => func());
    });

    it('should get empty string', () => {
      const res = func('');
      assert.strictEqual(res, '', 'result');
    });

    it('should get encoded string', () => {
      const res = func('foo bar');
      assert.strictEqual(res, '%66%6F%6F%20%62%61%72', 'result');
    });

    it('should get encoded string', () => {
      const res = func('&#<>"\'');
      assert.strictEqual(res, '%26%23%3C%3E%22%27', 'result');
    });
  });

  describe('escape URL encoded HTML special chars', () => {
    const func = mjs.escapeUrlEncodedHtmlChars;

    it('should throw', () => {
      assert.throws(() => func());
    });

    it('should throw', () => {
      assert.throws(() => func('foo'));
    });

    it('should get unescaped char', () => {
      const res = func('%20');
      assert.strictEqual(res, '%20', 'result');
    });

    it('should get escaped char', () => {
      const res = func('%26');
      assert.strictEqual(res, '%26amp;', 'result');
    });

    it('should get escaped char', () => {
      const res = func('%3c');
      assert.strictEqual(res, '%26lt;', 'result');
    });

    it('should get escaped char', () => {
      const res = func('%3C');
      assert.strictEqual(res, '%26lt;', 'result');
    });

    it('should get escaped char', () => {
      const res = func('%3E');
      assert.strictEqual(res, '%26gt;', 'result');
    });

    it('should get escaped char', () => {
      const res = func('%22');
      assert.strictEqual(res, '%26quot;', 'result');
    });

    it('should get escaped char', () => {
      const res = func('%27');
      assert.strictEqual(res, '%26%2339;', 'result');
    });
  });

  describe('sanitize URL', () => {
    const func = mjs.sanitizeUrl;

    it('should get null', () => {
      const res = func();
      assert.isNull(res, 'result');
    });

    it('should get null', () => {
      const res = func('foo');
      assert.isNull(res, 'result');
    });

    it('should get value', () => {
      const res = func('https://example.com');
      assert.strictEqual(res, 'https://example.com/', 'result');
    });

    it('should get value', () => {
      const res = func('https://example.com:8000/#foo?bar=baz qux');
      assert.strictEqual(res, 'https://example.com:8000/#foo?bar=baz%20qux',
        'result');
    });

    it('should get value', () => {
      const res = func('https://example.com/?foo=bar&baz=qux');
      assert.strictEqual(res, 'https://example.com/?foo=bar&baz=qux',
        'result');
    });

    it('should get null', () => {
      const res = func('../../');
      assert.isNull(res, 'result');
    });

    it('should get null', () => {
      const res = func('/../');
      assert.isNull(res, 'result');
    });

    it('should get null', () => {
      const res = func('javascript:alert("XSS")');
      assert.isNull(res, 'result');
    });

    it('should get null', () => {
      const res = func('data:,Hello%2C%20World!');
      assert.isNull(res, 'result');
    });

    it('should get null', () => {
      const res = func('data:,Hello%2C%20World!', {
        file: true
      });
      assert.isNull(res, 'result');
    });

    it('should get value', () => {
      const res = func('data:,Hello%2C%20World!', {
        data: true
      });
      assert.strictEqual(res, 'data:,Hello%2C%20World!', 'result');
      assert.strictEqual(decodeURIComponent(res), 'data:,Hello, World!',
        'decode');
    });

    it('should get sanitized value', () => {
      const res = func("data:text/html,<script>alert('XSS');</script>?<script>alert(1);</script>", {
        data: true
      });
      assert.strictEqual(res, 'data:text/html,%26lt;script%26gt;alert(%26%2339;XSS%26%2339;);%26lt;/script%26gt;?%26lt;script%26gt;alert(1);%26lt;/script%26gt;',
        'result');
      assert.strictEqual(decodeURIComponent(res), 'data:text/html,&lt;script&gt;alert(&#39;XSS&#39;);&lt;/script&gt;?&lt;script&gt;alert(1);&lt;/script&gt;',
        'decode');
    });

    it('should get sanitized value', () => {
      const res = func("data:text/html,%3Cscript%3Ealert('XSS');%3C/script%3E?%3Cscript%3Ealert(1);%3C/script%3E", {
        data: true
      });
      assert.strictEqual(res, 'data:text/html,%26lt;script%26gt;alert(%26%2339;XSS%26%2339;);%26lt;/script%26gt;?%26lt;script%26gt;alert(1);%26lt;/script%26gt;',
        'result');
      assert.strictEqual(decodeURIComponent(res), 'data:text/html,&lt;script&gt;alert(&#39;XSS&#39;);&lt;/script&gt;?&lt;script&gt;alert(1);&lt;/script&gt;',
        'decode');
    });

    it('should get null', () => {
      const res = func('file:///foo/bar');
      assert.isNull(res, 'result');
    });

    it('should get null', () => {
      const res = func('file:///foo/bar', {
        data: true
      });
      assert.isNull(res, 'result');
    });

    it('should get value', () => {
      const res = func('file:///foo/bar', {
        file: true
      });
      assert.strictEqual(res, 'file:///foo/bar', 'result');
    });

    it('should get value', () => {
      const res = func('http://example.com/?lt=5&gt=4');
      const url = new URL(res);
      assert.strictEqual(res, 'http://example.com/?lt=5&gt=4', 'result');
      assert.deepEqual(Array.from(url.searchParams.entries()), [
        ['lt', '5'],
        ['gt', '4']
      ], 'search');
    });

    it('should get sanitized value', () => {
      const value = encodeURIComponent('5&gt=4');
      const res = func(`http://example.com/?lt=${value}`);
      const url = new URL(res);
      assert.strictEqual(res, 'http://example.com/?lt=5%26amp;gt%3D4', 'result');
      assert.strictEqual(decodeURIComponent(res),
        'http://example.com/?lt=5&amp;gt=4', 'decode');
      assert.deepEqual(Array.from(url.searchParams.entries()), [
        ['lt', '5&amp;gt=4']
      ], 'search');
    });

    it('should get sanitized value', () => {
      const res =
        func("http://example.com/?<script>alert('XSS');</script>");
      const url = new URL(res);
      assert.strictEqual(res,
        'http://example.com/?%26lt;script%26gt;alert(%26%2339;XSS%26%2339;);%26lt;/script%26gt;',
        'result');
      assert.strictEqual(decodeURIComponent(res),
        'http://example.com/?&lt;script&gt;alert(&#39;XSS&#39;);&lt;/script&gt;',
        'decode');
      assert.deepEqual(Array.from(url.searchParams.entries()), [
        ['&lt;script&gt;alert(&#39;XSS&#39;);&lt;/script&gt;', '']
      ], 'search');
    });

    it('should get sanitized value', () => {
      const res =
        func("http://example.com/?foo=bar&<script>alert('XSS');</script>");
      const url = new URL(res);
      assert.strictEqual(res,
        'http://example.com/?foo=bar&%26lt;script%26gt;alert(%26%2339;XSS%26%2339;);%26lt;/script%26gt;',
        'result');
      assert.strictEqual(decodeURIComponent(res),
        'http://example.com/?foo=bar&&lt;script&gt;alert(&#39;XSS&#39;);&lt;/script&gt;',
        'decode');
      assert.deepEqual(Array.from(url.searchParams.entries()), [
        ['foo', 'bar'],
        ['&lt;script&gt;alert(&#39;XSS&#39;);&lt;/script&gt;', '']
      ], 'search');
    });

    it('should get sanitized value', () => {
      const res = func('http://example.com/"onmouseover="alert(1)"');
      assert.strictEqual(res,
        'http://example.com/%26quot;onmouseover=%26quot;alert(1)%26quot;',
        'result');
      assert.strictEqual(decodeURIComponent(res),
        'http://example.com/&quot;onmouseover=&quot;alert(1)&quot;',
        'decode');
    });
  });
});