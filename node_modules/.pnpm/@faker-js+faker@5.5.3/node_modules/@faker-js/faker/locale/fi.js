var Faker = require('../lib');
var faker = new Faker({ locale: 'fi', localeFallback: 'en' });
faker.locales['fi'] = require('../lib/locales/fi');
faker.locales['en'] = require('../lib/locales/en');
module['exports'] = faker;