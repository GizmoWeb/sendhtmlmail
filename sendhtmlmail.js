#! /usr/bin/env node
/*jslint devel: true, node: true*/
var sendhtmlmail = require('./index.js'),
	path = require('path');

var argOff = -1, args = [];
if ((process.argv0 !== undefined && process.argv0 !== null && process.argv0 === "node") || process.argv[0] === "node" || path.parse(process.argv[0]).name === "node") {
	argOff = 0;
    args = process.argv.slice(2 - argOff);
}
args.forEach(function (element) {
	"use strict";
    console.log(element);
});
var params = {
	file : args[args.length - 1]
};
//console.log(params);
sendhtmlmail(params);
