# schemacrat

Validate 1 or more json documents against one of many schemas based on the `describedBy` field in the document

returns exit code of 1 if any of the passed json files fail and prints errors to stderr

## Schema index

We need an index of schemas to validate against. By default we will try to read this from `cwd/schema`. The expected format is

```
{
    default: {"A valid": "json schema"},
    someIdentifier: {"Another valid": "json schema"}
}
```

Only the `default` schema is required.

An alternate location for the schema can be specified using the environment var `SCHEMA_SOURCE`. We suggest passing this as an absolute path.

A document with a top level `describedBy` is validated against the matching schema from the index or the `default` schema if it is not found.

## CLI

`npx schemacrat [jsonFile1] [jsonFile2] ...`

Validate all manifests under a directory

`find [dir] -name "*.json" -exec realpath {} \; | xargs npx schemacrat`

From stdin

`cat document.json | npx schemacrat`

### JavaScript

```js
const validate = require('schemacrat/lib/validate')(MY_INDEX);
const document = require('document.json');

const result = validate(document);

// {result: true, errors: []}
```
