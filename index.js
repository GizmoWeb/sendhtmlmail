'use strict';
// const path = require('path');
const deepExtend = require('deep-extend');
const nodemailer = require('nodemailer');
const fs = require('fs');
const prompt = require('prompt');
const colors = require('colors/safe');
const uuid = require('node-uuid');
const pkg = require(__dirname + '/package.json');
let _appRoot = process.cwd(); // path.resolve(__dirname)
let _confFile;
let _configuration;
let _pageHTML;
let _pageHTMLFolder;
let _cmdParams;
let _callback;
let _attachments = [];
let _promptSchema = {
        properties: {
            useImages: {
                name: 'useImages',
                pattern: /[Y|n|y|N]/,
                description: 'Send with images? [Y|n]',
                message: 'Answer "Y" or "n"',
                required: true,
            },
            embedImages: {
                name: 'embedImages',
                pattern: /[Y|n|y|N]/,
                description: 'Use attached images? [Y|n]',
                message: 'Answer "Y" or "n"',
                required: true,
            },
        },
    };
/**
 * Trace console messages
 * @private
 * @param {*}   el
 * @param {string}   message
 * @param {string}     type
 */
let _trace = (el, message, type) => {
    if (type === 'err') {
        console.error(
            '##### ' + el + ' ####\n',
            message,
            '\n######################################');
    } else {
        console.warn(el);
    }
};
/**
 * Uncaught Exception Handler
 * @param  {object} err
 */
let _uncaughtExceptionHandler = (err) => {
    _trace('ERRORE INATTESO', err.message, 'err');
};
/**
 * Send mail use nodemailer
 * @private
 * @return {void}
 */
let _sendMails = () => {
    let mailOptions = {
            from: _configuration.from, // sender address
            // to: _configuration.to.join(','), // list of receivers
            bcc: _configuration.to.join(','), // list of receivers
            subject: _pageHTML.match(/<title>(.*?)<\/title>/i)[1], // Subject line
            html: _pageHTML,
            attachments: _attachments,
        };
    let transporter = nodemailer.createTransport(_configuration.smtpConfig); // create reusable transporter object using the default SMTP transport

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            _trace('ERROR SENDING MAIL', error.message, 'err');
            return;
        }
        console.warn('Message sent: ' + info.response);
        if(
            _callback !== null
            &&
            _callback !== undefined
            &&
            typeof _callback === 'function'
        ) {
            _callback(info);
        }
    });
};
/**
 * Integrate configuration image base URL with matched RegExp part
 * @param  {string} match
 * @return {string}
 */
let _replaceAndSetURL = (match) => {
    return _configuration.imageBaseURL + match;
};
/**
 * Replace img url with CID and add related element to attacchments array
 * @private
 * @param   {string} match
 * @param   {string} p1
 * @param   {string} p2
 * @return  {string} calculated unique id for cid
 */
let _replaceAndSetAttachments = (match, p1, p2) => {
    let imgCID = null;
    let el;
    let fname;
    let rg = new RegExp('([^\\\\|^/].*[\\\\|/])(.+\\..+)$', 'gi');
    for (el in _attachments) {
        if (_attachments[el].path === _pageHTMLFolder + match) {
            imgCID = _attachments[el].cid;
            break;
        }
    }
    if (imgCID === null) {
        imgCID = uuid.v4() + (
            _configuration.embedCIDDomain !== undefined
            &&
            _configuration.embedCIDDomain !== null
            &&
            _configuration.embedCIDDomain !== '' ? '@'
            + _configuration.embedCIDDomain : ''
        );
        fname = p2.match(rg) === null ? p2 : rg.exec(p2)[2];
        _attachments.push({
            filename: fname,
            path: _pageHTMLFolder + match,
            cid: imgCID,
        });
    }
    return 'cid:' + imgCID;
};
/**
 * Start and manage user interaction
 * @private
 */
let _prompt = () => {
    prompt.message = colors.red('\n --- ');
    prompt.delimiter = '';
    prompt.start();

    let useImages = 'Y';
    let embedImages = 'Y';

    prompt.get(_promptSchema.properties.useImages, (err, result) => {
        if (err) {
            console.error('\n');
            return;
        }
        useImages = result.useImages;
        if (useImages.toUpperCase() === 'Y') {
            prompt.get(
                _promptSchema.properties.embedImages,
                (err, result) => {
                    if (err) {
                        console.error('\n');
                        return;
                    }
                    embedImages = result.embedImages;
                    if (embedImages.toUpperCase() === 'Y') {
                        let path = new RegExp(
                            '('
                            + _configuration.imageFolder
                            + ')(.+\\.[png|gif|jpg|svg]*)', 'igm'
                        );
                        _pageHTML = _pageHTML.replace(
                            path,
                            _replaceAndSetAttachments
                        );
                    } else {
                        _pageHTML = _pageHTML.replace(/(\/assets\/img\/)([a-z\.A_Z0-9-]*)(?:\/|)([a-z\.A_Z0-9-]*)/gi, _replaceAndSetURL);
                    }
                    _sendMails();
                }
            );
        } else {
            _pageHTML = _pageHTML.replace(/<img([^>]*[^/])>/gi, '');
            _pageHTML = _pageHTML.replace(/url\(.*\)/gi, '');
            _sendMails();
        }
    });
};
/**
 * Handler for HTML email file read
 * @private
 * @param {Error} err
 * @param {Buffer} data
 */
let _readPageHandler = (err, data) => {
    if (err) {
        _trace('ERROR LOADING HTML PAGE TO SEND', err.message, 'err');
    }
    if (data) {
        _pageHTMLFolder = _configuration.file.match(/[a-z:]*[\\|/]*[^\\|^/].*[\\|/]/i);
        _pageHTML = data;
        _prompt();
    }
};
/**
 * Get page to send
 * @private
 * @return {Buffer} file descriptor
 */
let _getPage = () => {
    _trace('*** loading : ' + _configuration.file);
    return fs.readFile(_configuration.file, 'utf8', _readPageHandler);
};
/**
 * Handler for config file read
 * @private
 * @param {Error} err
 * @param {Buffer} data
 */
let _readConfigHandler = (err, data) => {
    if (err) {
        _trace('ERROR LOADING CONFIGURATION', err.message, 'err');
    }
    if (data) {
        _confFile = data;
        _configuration = JSON.parse(_confFile);
        deepExtend(_configuration, _cmdParams);
        if (
            _configuration.commandLine === undefined
            ||
            _configuration.commandLine === null ||
            _configuration.commandLine === false
        ) {
            prompt.override = {
                useImages:
                    _configuration.useImages !== undefined
                    && _configuration.useImages !== null
                        ? _configuration.useImages
                        : 'Y',
                embedImages:
                    _configuration.embedImages !== undefined
                    && _configuration.embedImages !== null
                        ? _configuration.embedImages
                        : 'Y',
            };
        }
        if(
            _configuration.imageBaseURL !== undefined
            &&
            _configuration.imageBaseURL !== null
            && _configuration.imageBaseURL !== ''
        ) {
            _promptSchema.properties.embedImages.description =
                colors.italic.underline(
                    'Image base URL : ' +
                    _configuration.imageBaseURL
                ) + colors.red('\n --- ')
                + _promptSchema.properties.embedImages.description;
        }
        _trace('\n');
        _trace(_configuration);
        _trace('\n');
        _getPage();
    }
};
/**
 * Get _configuration from file
 * @private
 */
let _getConfig = () => {
    let configFilePath = _cmdParams.conf !== undefined
        ? _cmdParams.conf
        : _appRoot + '/conf/' + pkg.name + '_conf.json';
    _trace('*** loading : ' + configFilePath);
    fs.readFile(
        configFilePath,
        'utf8',
        _readConfigHandler
    );
};
/**
 * Send HTML mail using config file and specified HTML
 * @param  {object} params
 * @param  {object} callback
 * @return {void}
 */
let sendhtmlmail = (params, callback) => {
    process.on('uncaughtException', _uncaughtExceptionHandler);
    _cmdParams = params;
    _callback = callback;
    _getConfig();
};

module.exports = sendhtmlmail;
