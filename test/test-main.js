const {main, concatArg} = require("../lib/main");

exports["test main"] = function(assert) {
  assert.pass("Unit test running!");
  if (concatArg) {
    assert.deepEqual(concatArg(), [], "arguments array 0-1");
    assert.deepEqual(concatArg([]), [], "arguments array 0-2");
    assert.deepEqual(concatArg({}), [], "arguments array 0-3");
    assert.deepEqual(concatArg(null), [], "arguments array 0-4");
    assert.deepEqual(concatArg(""), [], "arguments array 0-5");
    assert.deepEqual(concatArg("1", "-a b -c \"d e\""), ["1", "-a", "b", "-c", "d e"], "arguments array 1-1");
    assert.deepEqual(concatArg("1", ["-a"], "b", ["-c", "\"d e\""]), ["1", "-a", "b", "-c", "d e"], "arguments array 1-2");
    assert.deepEqual(concatArg("2", 'a \'b\' "c"'), ["2", 'a', 'b', 'c'], "arguments array 2");
    assert.deepEqual(concatArg("3", 'beep "boop" \'foo bar baz\' "it\'s \\"so\\" groovy"'), ["3", 'beep', 'boop', 'foo bar baz', 'it\'s "so" groovy'], "arguments array 3");
    assert.deepEqual(concatArg("4", 'a b\\ c d'), ["4", 'a', 'b c', 'd'], "arguments array 4");
    assert.deepEqual(concatArg("5", '\\$beep bo\\`op'), ["5", '$beep', 'bo`op'], "arguments array 5");
    assert.deepEqual(concatArg("6", 'echo "foo = \\"foo\\""'), ["6", 'echo', 'foo = "foo"'], "arguments array 6");
    assert.deepEqual(concatArg("7", ''), ["7"], "arguments array 7");
    assert.deepEqual(concatArg("8", ' '), ["8"], "arguments array 8");
    assert.deepEqual(concatArg("9", '\t'), ["9"], "arguments array 9");
    assert.deepEqual(concatArg("10", '\t'), ["10"], "arguments array 10");
    assert.deepEqual(concatArg("11", 'a"b c d"e'), ["11", 'ab c de'], "arguments array 11");
    assert.deepEqual(concatArg("12", 'a\\ b"c d"\\ e f'), ["12", 'a bc d e', 'f'], "arguments array 12");
    assert.deepEqual(concatArg("13", 'a\\ b"c d"\\ e\'f g\' h'), ["13", 'a bc d ef g', 'h'], "arguments array 13");
    assert.deepEqual(concatArg("14", "x \"bl'a\"'h'"), ["14", 'x', "bl'ah"], "arguments array 14");
  }
};

exports["test main async"] = function(assert, done) {
  assert.pass("async Unit test running!");
  done();
};

require("sdk/test").run(exports);
