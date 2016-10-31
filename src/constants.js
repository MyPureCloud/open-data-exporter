var constants = {};

constants.regex = {};
constants.regex.isoDateTime = /\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;
constants.regex.isoDuration = /(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;
constants.regex.expression = /\{\{\s*(.+?)\s*\}\}/g;
constants.regex.space = /(\s+)/g;

constants.strings = {};
constants.strings.isoDateFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZZ';

module.exports = constants;