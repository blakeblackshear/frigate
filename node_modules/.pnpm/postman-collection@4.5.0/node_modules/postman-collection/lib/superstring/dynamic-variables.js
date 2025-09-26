var faker = require('@faker-js/faker/locale/en'),
    uuid = require('uuid'),

    // locale list generated from: https://github.com/chromium/chromium/blob/master/ui/base/l10n/l10n_util.cc
    LOCALES = ['af', 'am', 'an', 'ar', 'ast', 'az', 'be', 'bg', 'bh', 'bn', 'br', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs',
        'cy', 'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fo', 'fr', 'fy', 'ga', 'gd', 'gl',
        'gn', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'ia', 'id', 'ig', 'is', 'it', 'ja', 'jv',
        'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn',
        'mo', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'ny', 'oc', 'om', 'or', 'pa', 'pl', 'ps', 'pt',
        'qu', 'rm', 'ro', 'ru', 'sd', 'sh', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw',
        'ta', 'te', 'tg', 'th', 'ti', 'tk', 'to', 'tr', 'tt', 'tw', 'ug', 'uk', 'ur', 'uz', 'vi', 'wa', 'xh', 'yi',
        'yo', 'zh', 'zu'],

    // paths for directories
    DIRECTORY_PATHS = [
        '/Applications',
        '/bin',
        '/boot',
        '/boot/defaults',
        '/dev',
        '/etc',
        '/etc/defaults',
        '/etc/mail',
        '/etc/namedb',
        '/etc/periodic',
        '/etc/ppp',
        '/home',
        '/home/user',
        '/home/user/dir',
        '/lib',
        '/Library',
        '/lost+found',
        '/media',
        '/mnt',
        '/net',
        '/Network',
        '/opt',
        '/opt/bin',
        '/opt/include',
        '/opt/lib',
        '/opt/sbin',
        '/opt/share',
        '/private',
        '/private/tmp',
        '/private/var',
        '/proc',
        '/rescue',
        '/root',
        '/sbin',
        '/selinux',
        '/srv',
        '/sys',
        '/System',
        '/tmp',
        '/Users',
        '/usr',
        '/usr/X11R6',
        '/usr/bin',
        '/usr/include',
        '/usr/lib',
        '/usr/libdata',
        '/usr/libexec',
        '/usr/local/bin',
        '/usr/local/src',
        '/usr/obj',
        '/usr/ports',
        '/usr/sbin',
        '/usr/share',
        '/usr/src',
        '/var',
        '/var/log',
        '/var/mail',
        '/var/spool',
        '/var/tmp',
        '/var/yp'
    ],

    // generators for $random* variables
    dynamicGenerators = {
        $guid: {
            description: 'A v4 style guid',
            generator: function () {
                return uuid.v4();
            }
        },

        $timestamp: {
            description: 'The current timestamp',
            generator: function () {
                return Math.round(Date.now() / 1000);
            }
        },

        $isoTimestamp: {
            description: 'The current ISO timestamp at zero UTC',
            generator: function () {
                return new Date().toISOString();
            }
        },

        $randomInt: {
            description: 'A random integer between 0 and 1000',
            generator: function () {
                return ~~(Math.random() * (1000 + 1));
            }
        },

        // faker.phone.phoneNumber returns phone number with or without
        // extension randomly. this only returns a phone number without extension.
        $randomPhoneNumber: {
            description: 'A random 10-digit phone number',
            generator: function () {
                return faker.phone.phoneNumberFormat(0);
            }
        },

        // faker.phone.phoneNumber returns phone number with or without
        // extension randomly. this only returns a phone number with extension.
        $randomPhoneNumberExt: {
            description: 'A random phone number with extension (12 digits)',
            generator: function () {
                return faker.datatype.number({ min: 1, max: 99 }) + '-' + faker.phone.phoneNumberFormat(0);
            }
        },

        // faker's random.locale only returns 'en'. this returns from a list of
        // random locales
        $randomLocale: {
            description: 'A random two-letter language code (ISO 639-1)',
            generator: function () {
                return faker.random.arrayElement(LOCALES);
            }
        },

        // fakers' random.words returns random number of words between 1, 3.
        // this returns number of words between 2, 5.
        $randomWords: {
            description: 'Some random words',
            generator: function () {
                var words = [],
                    count = faker.datatype.number({ min: 2, max: 5 }),
                    i;

                for (i = 0; i < count; i++) {
                    words.push(faker.random.word());
                }

                return words.join(' ');
            }
        },

        // faker's system.filePath retuns nothing. this returns a path for a file.
        $randomFilePath: {
            description: 'A random file path',
            generator: function () {
                return dynamicGenerators.$randomDirectoryPath.generator() + '/' + faker.system.fileName();
            }
        },

        // faker's system.directoryPath retuns nothing. this returns a path for
        // a directory.
        $randomDirectoryPath: {
            description: 'A random directory path',
            generator: function () {
                return faker.random.arrayElement(DIRECTORY_PATHS);
            }
        },

        $randomCity: {
            description: 'A random city name',
            generator: faker.address.city
        },
        $randomStreetName: {
            description: 'A random street name',
            generator: faker.address.streetName
        },
        $randomStreetAddress: {
            description: 'A random street address (e.g. 1234 Main Street)',
            generator: faker.address.streetAddress
        },
        $randomCountry: {
            description: 'A random country',
            generator: faker.address.country
        },
        $randomCountryCode: {
            description: 'A random 2-letter country code (ISO 3166-1 alpha-2)',
            generator: faker.address.countryCode
        },
        $randomLatitude: {
            description: 'A random latitude coordinate',
            generator: faker.address.latitude
        },
        $randomLongitude: {
            description: 'A random longitude coordinate',
            generator: faker.address.longitude
        },

        $randomColor: {
            description: 'A random color',
            generator: faker.commerce.color
        },
        $randomDepartment: {
            description: 'A random commerce category (e.g. electronics, clothing)',
            generator: faker.commerce.department
        },
        $randomProductName: {
            description: 'A random product name (e.g. handmade concrete tuna)',
            generator: faker.commerce.productName
        },
        $randomProductAdjective: {
            description: 'A random product adjective (e.g. tasty, eco-friendly)',
            generator: faker.commerce.productAdjective
        },
        $randomProductMaterial: {
            description: 'A random product material (e.g. steel, plastic, leather)',
            generator: faker.commerce.productMaterial
        },
        $randomProduct: {
            description: 'A random product (e.g. shoes, table, chair)',
            generator: faker.commerce.product
        },

        $randomCompanyName: {
            description: 'A random company name',
            generator: faker.company.companyName
        },
        $randomCompanySuffix: {
            description: 'A random company suffix (e.g. Inc, LLC, Group)',
            generator: faker.company.companySuffix
        },
        $randomCatchPhrase: {
            description: 'A random catchphrase',
            generator: faker.company.catchPhrase
        },
        $randomBs: {
            description: 'A random phrase of business speak',
            generator: faker.company.bs
        },
        $randomCatchPhraseAdjective: {
            description: 'A random catchphrase adjective',
            generator: faker.company.catchPhraseAdjective
        },
        $randomCatchPhraseDescriptor: {
            description: 'A random catchphrase descriptor',
            generator: faker.company.catchPhraseDescriptor
        },
        $randomCatchPhraseNoun: {
            description: 'Randomly generates a catchphrase noun',
            generator: faker.company.catchPhraseNoun
        },
        $randomBsAdjective: {
            description: 'A random business speak adjective',
            generator: faker.company.bsAdjective
        },
        $randomBsBuzz: {
            description: 'A random business speak buzzword',
            generator: faker.company.bsBuzz
        },
        $randomBsNoun: {
            description: 'A random business speak noun',
            generator: faker.company.bsNoun
        },

        $randomDatabaseColumn: {
            description: 'A random database column name (e.g. updatedAt, token, group)',
            generator: faker.database.column
        },
        $randomDatabaseType: {
            description: 'A random database type (e.g. tiny int, double, point)',
            generator: faker.database.type
        },
        $randomDatabaseCollation: {
            description: 'A random database collation (e.g. cp1250_bin)',
            generator: faker.database.collation
        },
        $randomDatabaseEngine: {
            description: 'A random database engine (e.g. Memory, Archive, InnoDB)',
            generator: faker.database.engine
        },

        $randomDatePast: {
            description: 'A random past datetime',
            generator: faker.date.past
        },
        $randomDateFuture: {
            description: 'A random future datetime',
            generator: faker.date.future
        },
        $randomDateRecent: {
            description: 'A random recent datetime',
            generator: faker.date.recent
        },
        $randomMonth: {
            description: 'A random month',
            generator: faker.date.month
        },
        $randomWeekday: {
            description: 'A random weekday',
            generator: faker.date.weekday
        },

        $randomBankAccount: {
            description: 'A random 8-digit bank account number',
            generator: faker.finance.account
        },
        $randomBankAccountName: {
            description: 'A random bank account name (e.g. savings account, checking account)',
            generator: faker.finance.accountName
        },
        $randomCreditCardMask: {
            description: 'A random masked credit card number',
            generator: faker.finance.mask
        },
        $randomPrice: {
            description: 'A random price between 0.00 and 1000.00',
            generator: faker.finance.amount
        },
        $randomTransactionType: {
            description: 'A random transaction type (e.g. invoice, payment, deposit)',
            generator: faker.finance.transactionType
        },
        $randomCurrencyCode: {
            description: 'A random 3-letter currency code (ISO-4217)',
            generator: faker.finance.currencyCode
        },
        $randomCurrencyName: {
            description: 'A random currency name',
            generator: faker.finance.currencyName
        },
        $randomCurrencySymbol: {
            description: 'A random currency symbol',
            generator: faker.finance.currencySymbol
        },
        $randomBitcoin: {
            description: 'A random bitcoin address',
            generator: faker.finance.bitcoinAddress
        },
        $randomBankAccountIban: {
            description: 'A random 15-31 character IBAN (International Bank Account Number)',
            generator: faker.finance.iban
        },
        $randomBankAccountBic: {
            description: 'A random BIC (Bank Identifier Code)',
            generator: faker.finance.bic
        },

        $randomAbbreviation: {
            description: 'A random abbreviation',
            generator: faker.hacker.abbreviation
        },
        $randomAdjective: {
            description: 'A random adjective',
            generator: faker.hacker.adjective
        },
        $randomNoun: {
            description: 'A random noun',
            generator: faker.hacker.noun
        },
        $randomVerb: {
            description: 'A random verb',
            generator: faker.hacker.verb
        },
        $randomIngverb: {
            description: 'A random verb ending in “-ing”',
            generator: faker.hacker.ingverb
        },
        $randomPhrase: {
            description: 'A random phrase',
            generator: faker.hacker.phrase
        },

        $randomAvatarImage: {
            description: 'A random avatar image',
            generator: () => {
                // ref: https://github.com/faker-js/faker/blob/v8.4.1/src/modules/image/index.ts#L61
                return faker.random.arrayElement([
                    // eslint-disable-next-line max-len
                    `https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/${faker.datatype.number(1249)}.jpg`,
                    `https://avatars.githubusercontent.com/u/${faker.datatype.number(100000000)}`
                ]);
            }
        },
        $randomImageUrl: {
            description: 'A URL for a random image',
            generator: faker.image.imageUrl
        },
        $randomAbstractImage: {
            description: 'A URL for a random abstract image',
            generator: faker.image.abstract
        },
        $randomAnimalsImage: {
            description: 'A URL for a random animal image',
            generator: faker.image.animals
        },
        $randomBusinessImage: {
            description: 'A URL for a random stock business image',
            generator: faker.image.business
        },
        $randomCatsImage: {
            description: 'A URL for a random cat image',
            generator: faker.image.cats
        },
        $randomCityImage: {
            description: 'A URL for a random city image',
            generator: faker.image.city
        },
        $randomFoodImage: {
            description: 'A URL for a random food image',
            generator: faker.image.food
        },
        $randomNightlifeImage: {
            description: 'A URL for a random nightlife image',
            generator: faker.image.nightlife
        },
        $randomFashionImage: {
            description: 'A URL for a random fashion image',
            generator: faker.image.fashion
        },
        $randomPeopleImage: {
            description: 'A URL for a random image of a person',
            generator: faker.image.people
        },
        $randomNatureImage: {
            description: 'A URL for a random nature image',
            generator: faker.image.nature
        },
        $randomSportsImage: {
            description: 'A URL for a random sports image',
            generator: faker.image.sports
        },
        $randomTransportImage: {
            description: 'A URL for a random transportation image',
            generator: faker.image.transport
        },
        $randomImageDataUri: {
            description: 'A random image data URI',
            generator: faker.image.dataUri
        },

        $randomEmail: {
            description: 'A random email address',
            generator: faker.internet.email
        },
        $randomExampleEmail: {
            description: 'A random email address from an “example” domain (e.g. ben@example.com)',
            generator: faker.internet.exampleEmail
        },
        $randomUserName: {
            description: 'A random username',
            generator: faker.internet.userName
        },
        $randomProtocol: {
            description: 'A random internet protocol',
            generator: faker.internet.protocol
        },
        $randomUrl: {
            description: 'A random URL',
            generator: faker.internet.url
        },
        $randomDomainName: {
            description: 'A random domain name (e.g. gracie.biz, trevor.info)',
            generator: faker.internet.domainName
        },
        $randomDomainSuffix: {
            description: 'A random domain suffix (e.g. .com, .net, .org)',
            generator: faker.internet.domainSuffix
        },
        $randomDomainWord: {
            description: 'A random unqualified domain name (a name with no dots)',
            generator: faker.internet.domainWord
        },
        $randomIP: {
            description: 'A random IPv4 address',
            generator: faker.internet.ip
        },
        $randomIPV6: {
            description: 'A random IPv6 address',
            generator: faker.internet.ipv6
        },
        $randomUserAgent: {
            description: 'A random user agent',
            generator: faker.internet.userAgent
        },
        $randomHexColor: {
            description: 'A random hex value',
            generator: faker.internet.color
        },
        $randomMACAddress: {
            description: 'A random MAC address',
            generator: faker.internet.mac
        },
        $randomPassword: {
            description: 'A random 15-character alpha-numeric password',
            generator: faker.internet.password
        },

        $randomLoremWord: {
            description: 'A random word of lorem ipsum text',
            generator: faker.lorem.word
        },
        $randomLoremWords: {
            description: 'Some random words of lorem ipsum text',
            generator: faker.lorem.words
        },
        $randomLoremSentence: {
            description: 'A random sentence of lorem ipsum text',
            generator: faker.lorem.sentence
        },
        $randomLoremSlug: {
            description: 'A random lorem ipsum URL slug',
            generator: faker.lorem.slug
        },
        $randomLoremSentences: {
            description: 'A random 2-6 sentences of lorem ipsum text',
            generator: faker.lorem.sentences
        },
        $randomLoremParagraph: {
            description: 'A random paragraph of lorem ipsum text',
            generator: faker.lorem.paragraph
        },
        $randomLoremParagraphs: {
            description: '3 random paragraphs of lorem ipsum text',
            generator: faker.lorem.paragraphs
        },
        $randomLoremText: {
            description: 'A random amount of lorem ipsum text',
            generator: faker.lorem.text
        },
        $randomLoremLines: {
            description: '1-5 random lines of lorem ipsum',
            generator: faker.lorem.lines
        },

        $randomFirstName: {
            description: 'A random first name',
            generator: faker.name.firstName
        },
        $randomLastName: {
            description: 'A random last name',
            generator: faker.name.lastName
        },
        $randomFullName: {
            description: 'A random first and last name',
            generator: faker.name.findName
        },
        $randomJobTitle: {
            description: 'A random job title (e.g. senior software developer)',
            generator: faker.name.jobTitle
        },
        $randomNamePrefix: {
            description: 'A random name prefix (e.g. Mr., Mrs., Dr.)',
            generator: faker.name.prefix
        },
        $randomNameSuffix: {
            description: 'A random name suffix (e.g. Jr., MD, PhD)',
            generator: faker.name.suffix
        },
        $randomJobDescriptor: {
            description: 'A random job descriptor (e.g., senior, chief, corporate, etc.)',
            generator: faker.name.jobDescriptor
        },
        $randomJobArea: {
            description: 'A random job area (e.g. branding, functionality, usability)',
            generator: faker.name.jobArea
        },
        $randomJobType: {
            description: 'A random job type (e.g. supervisor, manager, coordinator, etc.)',
            generator: faker.name.jobType
        },

        $randomUUID: {
            description: 'A random 36-character UUID',
            generator: faker.datatype.uuid
        },
        $randomBoolean: {
            description: 'A random boolean value (true/false)',
            generator: faker.datatype.boolean
        },
        $randomWord: {
            description: 'A random word',
            generator: faker.random.word
        },
        $randomAlphaNumeric: {
            description: 'A random alpha-numeric character',
            generator: faker.random.alphaNumeric
        },

        $randomFileName: {
            description: 'A random file name (includes uncommon extensions)',
            generator: faker.system.fileName
        },
        $randomCommonFileName: {
            description: 'A random file name',
            generator: faker.system.commonFileName
        },
        $randomMimeType: {
            description: 'A random MIME type',
            generator: faker.system.mimeType
        },
        $randomCommonFileType: {
            description: 'A random, common file type (e.g., video, text, image, etc.)',
            generator: faker.system.commonFileType
        },
        $randomCommonFileExt: {
            description: 'A random, common file extension (.doc, .jpg, etc.)',
            generator: faker.system.commonFileExt
        },
        $randomFileType: {
            description: 'A random file type (includes uncommon file types)',
            generator: faker.system.fileType
        },
        $randomFileExt: {
            description: 'A random file extension (includes uncommon extensions)',
            generator: faker.system.fileExt
        },
        $randomSemver: {
            description: 'A random semantic version number',
            generator: faker.system.semver
        }
    };

module.exports = dynamicGenerators;
