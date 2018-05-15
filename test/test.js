#! /usr/bin/env node

const { fork } = require('child_process');
const { readdirSync, createReadStream, realpathSync } = require('fs');
const test = require('tape');
const { join, resolve } = require('path');
const { PassThrough } = require('stream');

const STDIO_OPTIONS = Object.freeze({
    stdio: ['pipe', 1, 2, 'ipc']
});
const CWD_OPTIONS = Object.freeze({
    cwd: __dirname
});
const TEST_SCHEMA_OPTIONS = Object.freeze({
    env: {
        SCHEMA_SOURCE: join(__dirname, 'alternateSchema')
    }
});
const ROOT = resolve(__dirname, '..');

function formatResult(child) {
    return Promise.all([
        new Promise((resolve) => {
            child.once('exit', exit => resolve({exit}));
        }),
        new Promise((resolve) => {
            child.once('message', message => resolve(message));
        })
    ]).then(results => results.reduce((memo, result) => Object.assign({}, memo, result), {}));
}

function testAll(path, options = {}) {
    const files = readdirSync(path);
    return formatResult(fork(ROOT, files.map(f => realpathSync(join(path, f))), Object.assign({}, STDIO_OPTIONS, CWD_OPTIONS, options)));
}

function testStdin(filenameOrStream, options = {}) {
    const child = fork(ROOT, Object.assign({}, STDIO_OPTIONS, CWD_OPTIONS, options));
    const inputStream = typeof filenameOrStream === "string" ? createReadStream(filenameOrStream) : filenameOrStream;
    inputStream.pipe(child.stdin);
    return formatResult(child);
}

test('invalid manifests', assert => {
    testAll('./test/fixture/invalid').then(({exit, total, failures}) => {
        assert.plan(2);
        assert.equal(exit, 1, 'exits with non zero code');
        assert.equal(total, failures, 'all tests fail');
    });
});

test('valid manifests', assert => {
    testAll('./test/fixture/valid').then(({exit, failures}) => {
        assert.plan(2);
        assert.equal(exit, 0, 'exits with zero code');
        assert.equal(failures, 0, 'no tests fail');
    });
});

test('valid stdin', assert => {
    testStdin('./test/fixture/valid/empty.json').then(({exit, total, failures}) => {
        assert.plan(3);
        assert.equal(exit, 0, 'exits with zero code');
        assert.equal(failures, 0, 'no tests fail');
        assert.equal(total, 1, "one test run");
    });
});

test('invalid stdin', assert => {
    testStdin('./test/fixture/invalid/missingProperty.json').then(({exit, total, failures}) => {
        assert.plan(3);
        assert.equal(exit, 1, 'exits with non zero code');
        assert.equal(total, failures, 'all tests fail');
        assert.equal(total, 1, "one test run");
    });
});

test('malformed stdin', assert => {
    testStdin('./test/fixture/invalid/malformed.json').then(({exit, total, failures}) => {
        assert.plan(3);
        assert.equal(exit, 1, 'exits with non zero code');
        assert.equal(total, failures, 'all tests fail');
        assert.equal(total, 1, "one test run");
    });
});

test('custom schema dir', assert => {
    testStdin('./test/fixture/invalid/missingProperty.json', TEST_SCHEMA_OPTIONS).then(({exit, total, failures}) => {
        assert.plan(3);
        assert.equal(exit, 0, 'exits with zero code');
        assert.equal(failures, 0, 'all tests pass');
        assert.equal(total, 1, "one test run");
    });
});

test('reading schema from describedBy', assert => {
    assert.plan(6);

    const invalid = {describedBy: 'v2'} // v2 requires property 'foobar'
    const invalidStream = new PassThrough();
    testStdin(invalidStream).then(({exit, total, failures}) => {
        assert.equal(exit, 1, 'exits with non zero code');
        assert.equal(total, failures, 'all tests fail');
        assert.equal(total, 1, "one test run");
    });
    invalidStream.write(JSON.stringify(invalid));
    invalidStream.end();

    const valid = Object.assign({foobar: 'foo'}, invalid);
    const validStream = new PassThrough();
    testStdin(validStream).then(({exit, total, failures}) => {
        assert.equal(exit, 0, 'exits with zero code');
        assert.equal(failures, 0, 'all tests pass');
        assert.equal(total, 1, "one test run");
    });
    validStream.write(JSON.stringify(valid));
    validStream.end();
});
