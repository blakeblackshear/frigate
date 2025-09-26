var Faker = require('../lib');
var faker = new Faker({ locale: 'zu_ZA', localeFallback: 'en' });
faker.locales['zu_ZA'] = require('../lib/locales/zu_ZA');
faker.locales['en'] = require('../lib/locales/en');
module['exports'] = faker;
