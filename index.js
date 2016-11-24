/*jslint devel: true, node: true, nomen: true, regexp: true*/
'use strict';
var path = require('path'),
	deepExtend = require('deep-extend'),
	nodemailer = require('nodemailer'),
	fs = require('fs'),
	prompt = require('prompt'),
	uuid = require('node-uuid'),
	pkg = require(__dirname + '/package.json'),
	_appRoot = process.cwd(), //path.resolve(__dirname)
	_confFile,
	_configuration,
	_pageHTML,
	_pageHTMLFolder,
	_cmdParams,
	_attachments = [],
	_promptSchema = {
		properties: {
			use_images: {
				name: 'use_images',
				pattern: /[Y|n|y|N]/,
				description: 'Invio con immagini? [Y|n]',
				message: 'Inserire "Y" o "n"',
				required: true
			},
			embed_images: {
				name: 'embed_images',
				pattern: /[Y|n|y|N]/,
				description: 'Invio con immagini allegate? [Y|n]',
				message: 'Inserire "Y" o "n"',
				required: true
			}
		}
	};
/**
 * Trace console messages
 * @private
 * @param {*}   el
 * @param {string}   message
 * @param {string}	 type    
 */
function _trace(el, message, type) {
	if (type === "err") {
		console.error("##### " + el + " ####\n", message, "\n######################################");
	} else {
		console.log(el);
	}
}
function _uncaughtExceptionHandler(err) {
	_trace("ERRORE INATTESO", err.message, "err");
}
/**
 * Send mail use nodemailer
 * @private
 * @returns {void}
 */
function _sendMails() {
	var mailOptions = {
			from: _configuration.from, // sender address
			//to: _configuration.to.join(','), // list of receivers
			bcc: _configuration.to.join(','), // list of receivers
			subject: _pageHTML.match(/<title>([A-z \-]*)<\/title>/i)[1], // Subject line
			html: _pageHTML,
			attachments: _attachments
		},
		transporter = nodemailer.createTransport(_configuration.smtpConfig); // create reusable transporter object using the default SMTP transport
    
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
			_trace('ERROR SENDING MAIL', error.message, "err");
            return;
        }
        console.log('Message sent: ' + info.response);
    });
}
function _replaceAndSetURL(match) {
    return _configuration.imageBaseURL + match;
}
/**
 * Replace img url with CID and add related element to attacchments array
 * @private
 * @param   {string} match 
 * @param   {string} p1    
 * @param   {string} p2    
 * @returns {string} calculated unique id for cid
 */
function _replaceAndSetAttachments(match, p1, p2) {
    var img_cid = null,
		el,
		fname,
		rg = new RegExp('([^\\\\|^/].*[\\\\|/])(.+\\..+)$', 'gi');
	for (el in _attachments) {
        if (_attachments[el].path === _pageHTMLFolder + match) {
            img_cid = _attachments[el].cid;
            break;
        }
    }
    if (img_cid === null) {
        img_cid = uuid.v4() + (_configuration.embedCIDDomain !== undefined && _configuration.embedCIDDomain !== null && _configuration.embedCIDDomain !== "" ? '@' + _configuration.embedCIDDomain : '');
        fname = p2.match(rg) === null ? p2 : rg.exec(p2)[2];
        _attachments.push({
            filename: fname,
            path: _pageHTMLFolder + match,
            cid: img_cid
        });
    }
	return 'cid:' + img_cid;
}
/**
 * Start and manage user interaction
 * @private
 */
function _prompt() {
	prompt.start();
	var use_images = 'Y',
		embed_images = 'Y';
	prompt.get(_promptSchema.properties.use_images, function (err, result) {
		if (err) {
			console.log("\n");
			return;
		}
		use_images = result.use_images;
		if (use_images.toUpperCase() === 'Y') {
			prompt.get(_promptSchema.properties.embed_images, function (err, result) {
				if (err) {
					console.log("\n");
					return;
				}
				embed_images = result.embed_images;
				if (embed_images.toUpperCase() === 'Y') {
					//var path = new RegExp('(' + _configuration.imageFolder + ')(([a-z\\.A_Z0-9-]*)(?:\/|)([a-z\\.A_Z0-9-]*))*', 'gi');
					var path = new RegExp('(' + _configuration.imageFolder + ')(.+\\.[png|gif|jpg|svg]*)', 'igm');
					_pageHTML = _pageHTML.replace(path, _replaceAndSetAttachments);
				} else {
					_pageHTML = _pageHTML.replace(/(\/assets\/img\/)([a-z\.A_Z0-9-]*)(?:\/|)([a-z\.A_Z0-9-]*)/gi , _replaceAndSetURL);
				}
				_sendMails();
			});
		} else {
			_pageHTML = _pageHTML.replace(/<img([^>]*[^/])>/gi, '');
			_pageHTML = _pageHTML.replace(/url\(.*\)/gi, '');
			_sendMails();
		}
	});
}
/**
 * Handler for HTML email file read
 * @private
 * @param {Error} err
 * @param {Buffer} data
 */
function _readPageHandler(err, data) {
	if (err) {
		_trace('ERROR LOADING HTML PAGE TO SEND', err.message, "err");
	}
	if (data) {
		_pageHTMLFolder = _configuration.file.match(/[a-z:]*[\\|/]*[^\\|^/].*[\\|/]/i);
		_pageHTML = data;
		_prompt();
	}
}
/**
 * Get page to send
 * @private
 * @returns {Buffer} file descriptor
 */
function _getPage() {
	_trace("*** loading : " + _configuration.file);
	fs.readFile(_configuration.file, 'utf8', _readPageHandler);
}
/**
 * Handler for config file read
 * @private
 * @param {Error} err
 * @param {Buffer} data
 */
function _readConfigHandler(err, data) {
	if (err) {
		_trace('ERROR LOADING CONFIGURATION', err.message, "err");
	}
	if (data) {
		_confFile = data;
		_configuration = JSON.parse(_confFile);
		deepExtend(_configuration, _cmdParams);
		if (_configuration.commandLine === undefined || _configuration.commandLine === null || _configuration.commandLine === false) {
			prompt.override = {
				use_images : _configuration.useImages !== undefined && _configuration.useImages !== null ? _configuration.useImages :  'Y',
				embed_images : _configuration.embedImages !== undefined && _configuration.embedImages !== null ? _configuration.embedImages :  "Y"
			};
		}
		_trace(_configuration);
		_getPage();
	}
}
/**
 * Get _configuration from file
 * @private
 */
function _getConfig() {
	_trace("*** loading : " + _appRoot + '/conf/' + pkg.name + '_conf.json');
	fs.readFile(_appRoot + '/conf/' + pkg.name + '_conf.json', 'utf8', _readConfigHandler);
}

function sendhtmlmail(params) {
	//process.stdin.resume();
	//catches uncaught exceptions
	process.on('uncaughtException', _uncaughtExceptionHandler);
	_cmdParams = params;
	_getConfig();
}

module.exports = sendhtmlmail;