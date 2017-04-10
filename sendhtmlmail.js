#! /usr/bin/env node
const sendhtmlmail = require('./index.js');
const path = require('path');
const parseArgs = require('minimist');

let usage = [
    'Usage: sendhtmlmail [options]',
    '',
    '-f <path>, --file=<path>        File to send as mail.',
    '-c <path>, --conf=<path>        Optional configuration file',
    '                                default is \'sendhtmlmail.conf\'',
    '                                at \'/executionpath/conf\' folder',
].join('\n');

let argv = [];
if (
    (
        process.argv0 !== undefined
        && process.argv0 !== null
        && process.argv0 === 'node'
    )
    ||
    process.argv[0] === 'node'
    ||
    path.parse(process.argv[0]).name === 'node'
) {
    argv = parseArgs(process.argv.slice(2));
}

if (
    argv.f === undefined && argv.file === undefined
    || (argv.f !== undefined
        &&
        (typeof argv.f !== 'string' || argv.f === ''))
    || (argv.file !== undefined
        &&
        (typeof argv.file !== 'string' || argv.file === ''))
) {
    console.error(usage);
    return;
}
let params = {
    file: argv.f !== undefined && typeof argv.f === 'string' && argv.f !== ''
        ? argv.f
        : (
            argv.file !== undefined
            && typeof argv.file === 'string'
            && argv.file !== ''
                ? argv.file
                : undefined
            ),
    conf: argv.c !== undefined && typeof argv.c === 'string' && argv.c !== ''
        ? argv.c
        : (
            argv.conf !== undefined
            && typeof argv.conf === 'string'
            && argv.conf !== ''
                ? argv.conf
                : undefined
            ),
    commandLine: true,
};

sendhtmlmail(params);
