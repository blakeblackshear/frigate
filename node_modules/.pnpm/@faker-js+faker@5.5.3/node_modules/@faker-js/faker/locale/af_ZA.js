var Faker = require('../lib');
var faker = new Faker({ locale: 'af_ZA', localeFallback: 'en' });
faker.locales['af_ZA'] = require('../lib/locales/af_ZA');
faker.locales['en'] = require('../lib/locales/en');
module['exports'] = faker;
