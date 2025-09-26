module.exports = {
    extends: 'standard',
    rules: {
        'space-before-function-paren': ['error', {
            anonymous: 'ignore',
            named: 'ignore',
            asyncArrow: 'ignore'
        }]
    }
}
