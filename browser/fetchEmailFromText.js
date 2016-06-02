const normalizeEmail = require('normalize-email');

const emailReg = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

function fetchEmailFromText(text) {
    const resp = text.match(emailReg);
    return resp && normalizeEmail(resp[0]);
}

module.exports = fetchEmailFromText;
