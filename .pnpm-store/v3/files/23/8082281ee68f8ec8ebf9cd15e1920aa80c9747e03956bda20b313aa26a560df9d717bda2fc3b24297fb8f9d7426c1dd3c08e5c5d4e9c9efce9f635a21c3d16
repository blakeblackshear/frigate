/*

   this index.js file is used for including the faker library as a CommonJS module, instead of a bundle

   you can include the faker library into your existing node.js application by requiring the entire /faker directory

    var faker = require(./faker);
    var randomName = faker.name.findName();

   you can also simply include the "faker.js" file which is the auto-generated bundled version of the faker library

    var faker = require(./customAppPath/faker);
    var randomName = faker.name.findName();


  if you plan on modifying the faker library you should be performing your changes in the /lib/ directory

*/

/**
 *
 * @namespace faker
 */
function Faker (opts) {

  var self = this;

  opts = opts || {};

  // assign options
  var locales = self.locales || opts.locales || {};
  var locale = self.locale || opts.locale || "en";
  var localeFallback = self.localeFallback || opts.localeFallback || "en";

  self.locales = locales;
  self.locale = locale;
  self.localeFallback = localeFallback;

  self.definitions = {};

  var _definitions = {
    "name": ["first_name", "last_name", "prefix", "suffix", "binary_gender", "gender", "title", "male_prefix", "female_prefix", "male_first_name", "female_first_name", "male_middle_name", "female_middle_name", "male_last_name", "female_last_name"],
    "address": ["city_name", "city_prefix", "city_suffix", "street_suffix", "county", "country", "country_code", "country_code_alpha_3", "state", "state_abbr", "street_prefix", "postcode", "postcode_by_state", "direction", "direction_abbr", "time_zone"],
    "animal": ["dog", "cat", "snake", "bear", "lion", "cetacean", "insect", "crocodilia", "cow", "bird", "fish", "rabbit", "horse", "type"],
    "company": ["adjective", "noun", "descriptor", "bs_adjective", "bs_noun", "bs_verb", "suffix"],
    "lorem": ["words"],
    "hacker": ["abbreviation", "adjective", "noun", "verb", "ingverb", "phrase"],
    "phone_number": ["formats"],
    "finance": ["account_type", "transaction_type", "currency", "iban", "credit_card"],
    "internet": ["avatar_uri", "domain_suffix", "free_email", "example_email", "password"],
    "commerce": ["color", "department", "product_name", "price", "categories", "product_description"],
    "database": ["collation", "column", "engine", "type"],
    "system": ["mimeTypes", "directoryPaths"],
    "date": ["month", "weekday"],
    "vehicle": ["vehicle", "manufacturer", "model", "type", "fuel", "vin", "color"],
    "music": ["genre"],
    "title": "",
    "separator": ""
  };

  // Create a Getter for all definitions.foo.bar properties
  Object.keys(_definitions).forEach(function(d){
    if (typeof self.definitions[d] === "undefined") {
      self.definitions[d] = {};
    }

    if (typeof _definitions[d] === "string") {
      self.definitions[d] = _definitions[d];
      return;
    }

    _definitions[d].forEach(function(p){
      Object.defineProperty(self.definitions[d], p, {
        get: function () {
          if (typeof self.locales[self.locale][d] === "undefined" || typeof self.locales[self.locale][d][p] === "undefined") {
            // certain localization sets contain less data then others.
            // in the case of a missing definition, use the default localeFallback to substitute the missing set data
            // throw new Error('unknown property ' + d + p)
            return self.locales[localeFallback][d][p];
          } else {
            // return localized data
            return self.locales[self.locale][d][p];
          }
        }
      });
    });
  });

  var Fake = require('./fake');
  self.fake = new Fake(self).fake;

  var Unique = require('./unique');
  self.unique = new Unique(self).unique;

  var Mersenne = require('./mersenne');
  self.mersenne = new Mersenne();

  var Random = require('./random');
  self.random = new Random(self);

  var Helpers = require('./helpers');
  self.helpers = new Helpers(self);

  var Name = require('./name');
  self.name = new Name(self);

  var Address = require('./address');
  self.address = new Address(self);

  var Animal = require('./animal');
  self.animal = new Animal(self);

  var Company = require('./company');
  self.company = new Company(self);

  var Finance = require('./finance');
  self.finance = new Finance(self);

  var Image = require('./image');
  self.image = new Image(self);

  var Lorem = require('./lorem');
  self.lorem = new Lorem(self);

  var Hacker = require('./hacker');
  self.hacker = new Hacker(self);

  var Internet = require('./internet');
  self.internet = new Internet(self);

  var Database = require('./database');
  self.database = new Database(self);

  var Phone = require('./phone_number');
  self.phone = new Phone(self);

  var _Date = require('./date');
  self.date = new _Date(self);

  var _Time = require('./time');
  self.time = new _Time(self);

  var Commerce = require('./commerce');
  self.commerce = new Commerce(self);

  var System = require('./system');
  self.system = new System(self);

  var Git = require('./git');
  self.git = new Git(self);

  var Vehicle = require('./vehicle');
  self.vehicle = new Vehicle(self);

  var Music = require('./music');
  self.music = new Music(self);

  var Datatype = require('./datatype');
  self.datatype = new Datatype(self);
};

Faker.prototype.setLocale = function (locale) {
  this.locale = locale;
}

Faker.prototype.seed = function(value) {
  var Random = require('./random');
  var Datatype = require('./datatype');
  this.seedValue = value;
  this.random = new Random(this, this.seedValue);
  this.datatype = new Datatype(this, this.seedValue);
}
module['exports'] = Faker;
