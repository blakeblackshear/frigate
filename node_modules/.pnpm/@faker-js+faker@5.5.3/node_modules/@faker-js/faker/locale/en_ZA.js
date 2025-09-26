var Faker = require('../lib');
var faker = new Faker({ locale: 'en_ZA', localeFallback: 'en' });
faker.locales['en_ZA'] = require('../lib/locales/en_ZA');
faker.locales['en'] = require('../lib/locales/en');
module['exports'] = faker;
