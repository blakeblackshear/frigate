var Faker = require('../lib');
var faker = new Faker({ locale: 'ar', localeFallback: 'en' });
faker.locales['ar'] = require('../lib/locales/ar');
faker.locales['en'] = require('../lib/locales/en');
module['exports'] = faker;
