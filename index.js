#! /usr/bin/env node
const { join } = require('path');
const schemas = process.env.SCHEMA_SOURCE ? require(process.env.SCHEMA_SOURCE) : require(join(process.cwd(), 'schema'));
const validate = (require('./lib/validate')(schemas));

let failures = 0;

function validateInput(input, path) {
    const result = validate(input);
    console.log(`${path} is ${result.result ? 'valid' : 'invalid'}`);
    if (!result.result) {
        console.error(result.errors);
        failures++;
    }
}

function done(total) {
    console.log('done %i with %i failures', total, failures);
    process.send && process.send({total, failures});
    process.exit(failures && 1);
}

const args = process.argv.slice(2);

if (args.length) {
    args.forEach(function (file) {
        try {
            validateInput(require(file), file);
        } catch (e) {
            failures++;
            console.error(e);
        }
    });
    done(args.length);
} else {
    const chunks = [];
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        chunks.push(chunk.toString('utf8'));
      }
    });

    process.stdin.on('end', () => {
        try {
            const input = JSON.parse(chunks.join(''));
            validateInput(input, 'stdin');
        } catch (e) {
            failures++;
            console.error(e);
        }
        done(1);
    });
}
