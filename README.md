# sendhtmlmail Node module

Small script with configuration to send mail using [Nodemailer](https://nodemailer.com/)

## Usage

Install with npm

    npm install sendhtmlmail

Command line

	node sendhtmlmail --file /path/to/file.html
	
Require in your script

	var sendmail = require('sendhtmlmail');
	sendmail({file:'/path/to/file.html'});
	
## Configurations

The script look for `sendhtmlmail.conf` file at `/executionpath/conf` folder. Look for sample conf in `node_modules/sendhtmlmail/conf/sendhtmlmail_conf.sample.json`.

* __from__ - The e-mail address of the sender. All e-mail addresses can be plain `'sender@server.com'` or formatted `'"Sender Name" <sender@server.com>'`, see [Nodemailer documentations](https://github.com/nodemailer/nodemailer#e-mail-message-fields) for details
* __to__ - Comma separated list or an array of recipients e-mail addresses. For now hardcoded for the *Bcc:* field
* __smtpConfig__ - [Nodemailer SMTP trasport settiings](https://github.com/nodemailer/nodemailer#set-up-smtp)
* __imageBaseURL__ - Base URL for not embedded images
* __embedCIDDomain__ - Domain used creating CID path for emebedded images
* __imageFolder__ - Base path for images inside html. Final path to image file on disk is calculated starting from `file` property.
* __useImages__ - In script use override `prompt` value. If `"N"` images and CSS `url()` are stripped from the code. If not specified default value is `"Y"`.
* __embedImages__ : In script use override `prompt` value. If `"N"` images and CSS `url()` are prefixed with __imageBaseURL__ configuration property. If not specified default value is `"Y"`.