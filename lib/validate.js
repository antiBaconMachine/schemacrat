'use strict';
const ajv =  (new require('ajv')());

function buildValidate(schemas) {
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
