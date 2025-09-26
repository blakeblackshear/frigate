var maleNames = require('./male_first_name');
var femaleNames = require('./female_first_name');
var allNames = [];
maleNames.forEach(function (v) { allNames.push(v); });
femaleNames.forEach( function (v) { allNames.push(v); });

module["exports"] = allNames.sort();
