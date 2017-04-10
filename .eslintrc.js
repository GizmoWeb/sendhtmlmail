module.exports = {
    "extends": [
        "eslint:recommended", "google"
    ],
    "rules": {
        "no-console": [
            2, {
                allow: ["warn", "error"]
            }
        ],
        'max-len': [
            2, {
                "ignoreTrailingComments": true,
                "ignoreRegExpLiterals": true
            }
        ],
        'require-jsdoc': [
            2, {
                require: {
                    ArrowFunctionExpression: true
                }
            }
        ]
    },
    "env": {
        "es6": true,
        "node": true
    }
};
