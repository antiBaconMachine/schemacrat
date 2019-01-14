'use strict';

function getAjv() {
    const ajv =  (new require('ajv')());
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
    require('ajv-merge-patch')(ajv);
    return ajv;
}

function buildValidate(schemas) {
    const ajv = getAjv();
    Object.keys(schemas)
        .filter(id => id !== 'default')
        .forEach(id => ajv.addSchema(schemas[id], id));

    return function validate(input) {
        const schema = schemas[input.describedBy] || schemas['default'];
        const isValid = ajv.validate(schema, input);
        return {
            result: isValid,
            errors: [].concat(ajv.errors)
        };
    }
}

module.exports = buildValidate;
