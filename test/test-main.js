const {main, getArgArr} = require("../lib/main");

exports["test main"] = function(assert) {
  assert.pass("Unit test running!");
/*
  assert.deepEqual(getArgArr(), [""], "arguments array 0");
  assert.deepEqual(getArgArr("1", "-a b -c \"d e\""), ["1", "-a", "b", "-c", "d e"], "arguments array 1");
  assert.deepEqual(getArgArr("2", 'a \'b\' "c"'), ["2", 'a', 'b', 'c'], "arguments array 2");
  assert.deepEqual(getArgArr("3", 'beep "boop" \'foo bar baz\' "it\'s \\"so\\" groovy"'), ["3", 'beep', 'boop', 'foo bar baz', 'it\'s "so" groovy'], "arguments array 3");
  assert.deepEqual(getArgArr("4", 'a b\\ c d'), ["4", 'a', 'b c', 'd'], "arguments array 4");
  assert.deepEqual(getArgArr("5", '\\$beep bo\\`op'), ["5", '$beep', 'bo`op'], "arguments array 5");
  assert.deepEqual(getArgArr("6", 'echo "foo = \\"foo\\""'), ["6", 'echo', 'foo = "foo"'], "arguments array 6");
  assert.deepEqual(getArgArr("7", ''), ["7"], "arguments array 7");
  assert.deepEqual(getArgArr("8", ' '), ["8"], "arguments array 8");
  assert.deepEqual(getArgArr("9", '\t'), ["9"], "arguments array 9");
  assert.deepEqual(getArgArr("10", '\t'), ["10"], "arguments array 10");
  assert.deepEqual(getArgArr("11", 'a"b c d"e'), ["11", 'ab c de'], "arguments array 11");
  assert.deepEqual(getArgArr("12", 'a\\ b"c d"\\ e f'), ["12", 'a bc d e', 'f'], "arguments array 12");
  assert.deepEqual(getArgArr("13", 'a\\ b"c d"\\ e\'f g\' h'), ["13", 'a bc d ef g', 'h'], "arguments array 13");
  assert.deepEqual(getArgArr("14", "x \"bl'a\"'h'"), ["14", 'x', "bl'ah"], "arguments array 14");
*/
};

exports["test main async"] = function(assert, done) {
  assert.pass("async Unit test running!");
  done();
};

require("sdk/test").run(exports);
