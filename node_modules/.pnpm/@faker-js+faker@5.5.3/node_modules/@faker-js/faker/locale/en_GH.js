var Faker = require('../lib');
var faker = new Faker({ locale: 'en_GH', localeFallback: 'en' });
faker.locales['en_GH'] = require('../lib/locales/en_GH');
faker.locales['en'] = require('../lib/locales/en');
module['exports'] = faker;
