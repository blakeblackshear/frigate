/**
 * Method to reduce array of characters
 * @param arr existing array of characters
 * @param values array of characters which should be removed
 * @return {*} new array without banned characters
 */
var arrayRemove = function (arr, values) {
  values.forEach(function(value){
    arr = arr.filter(function(ele){
      return ele !== value;
    });
  });
  return arr;
};

/**
 *
 * @namespace faker.random
 */
function Random (faker, seed) {
  // Use a user provided seed if it is an array or number
  if (Array.isArray(seed) && seed.length) {
    faker.mersenne.seed_array(seed);
  }
  else if(!isNaN(seed)) {
    faker.mersenne.seed(seed);
  }

  /**
   * @Deprecated
   * returns a single random number based on a max number or range
   *
   * @method faker.random.number
   * @param {mixed} options {min, max, precision}
   */
  this.number = function (options) {
    console.log("Deprecation Warning: faker.random.number is now located in faker.datatype.number");
    return faker.datatype.number(options);
  };

  /**
   * @Deprecated
   * returns a single random floating-point number based on a max number or range
   *
   * @method faker.random.float
   * @param {mixed} options
   */
  this.float = function (options) {
    console.log("Deprecation Warning: faker.random.float is now located in faker.datatype.float");
    return faker.datatype.float(options);
  };

  /**
   * takes an array and returns a random element of the array
   *
   * @method faker.random.arrayElement
   * @param {array} array
   */
  this.arrayElement = function (array) {
    array = array || ["a", "b", "c"];
    var r = faker.datatype.number({ max: array.length - 1 });
    return array[r];
  };

  /**
   * takes an array and returns a subset with random elements of the array
   *
   * @method faker.random.arrayElements
   * @param {array} array
   * @param {number} count number of elements to pick
   */
  this.arrayElements = function (array, count) {
    array = array || ["a", "b", "c"];

    if (typeof count !== 'number') {
      count = faker.datatype.number({ min: 1, max: array.length });
    } else if (count > array.length) {
      count = array.length;
    } else if (count < 0) {
      count = 0;
    }

    var arrayCopy = array.slice(0);
    var i = array.length;
    var min = i - count;
    var temp;
    var index;

    while (i-- > min) {
      index = Math.floor((i + 1) * faker.datatype.float({ min: 0, max: 0.99 }));
      temp = arrayCopy[index];
      arrayCopy[index] = arrayCopy[i];
      arrayCopy[i] = temp;
    }

    return arrayCopy.slice(min);
  };

  /**
   * takes an object and returns a random key or value
   *
   * @method faker.random.objectElement
   * @param {object} object
   * @param {mixed} field
   */
  this.objectElement = function (object, field) {
    object = object || { "foo": "bar", "too": "car" };
    var array = Object.keys(object);
    var key = faker.random.arrayElement(array);

    return field === "key" ? key : object[key];
  };

  /**
   * @Deprecated
   * uuid
   *
   * @method faker.random.uuid
   */
  this.uuid = function () {
    console.log("Deprecation Warning: faker.random.uuid is now located in faker.datatype.uuid");
    return faker.datatype.uuid();
  };

  /**
   * boolean
   *
   * @method faker.random.boolean
   */
  this.boolean = function () {
    console.log("Deprecation Warning: faker.random.boolean is now located in faker.datatype.boolean");
    return faker.datatype.boolean();
  };

  // TODO: have ability to return specific type of word? As in: noun, adjective, verb, etc
  /**
   * word
   *
   * @method faker.random.word
   * @param {string} type
   */
  this.word = function randomWord (type) {

    var wordMethods = [
      'commerce.department',
      'commerce.productName',
      'commerce.productAdjective',
      'commerce.productMaterial',
      'commerce.product',
      'commerce.color',

      'company.catchPhraseAdjective',
      'company.catchPhraseDescriptor',
      'company.catchPhraseNoun',
      'company.bsAdjective',
      'company.bsBuzz',
      'company.bsNoun',
      'address.streetSuffix',
      'address.county',
      'address.country',
      'address.state',

      'finance.accountName',
      'finance.transactionType',
      'finance.currencyName',

      'hacker.noun',
      'hacker.verb',
      'hacker.adjective',
      'hacker.ingverb',
      'hacker.abbreviation',

      'name.jobDescriptor',
      'name.jobArea',
      'name.jobType'];

    // randomly pick from the many faker methods that can generate words
    var randomWordMethod = faker.random.arrayElement(wordMethods);
    var result = faker.fake('{{' + randomWordMethod + '}}');
    return faker.random.arrayElement(result.split(' '));
  };

  /**
   * randomWords
   *
   * @method faker.random.words
   * @param {number} count defaults to a random value between 1 and 3
   */
  this.words = function randomWords (count) {
    var words = [];
    if (typeof count === "undefined") {
      count = faker.datatype.number({min:1, max: 3});
    }
    for (var i = 0; i<count; i++) {
      words.push(faker.random.word());
    }
    return words.join(' ');
  };

  /**
   * locale
   *
   * @method faker.random.image
   */
  this.image = function randomImage () {
    return faker.image.image();
  };

  /**
   * locale
   *
   * @method faker.random.locale
   */
  this.locale = function randomLocale () {
    return faker.random.arrayElement(Object.keys(faker.locales));
  };

  /**
   * alpha. returns lower/upper alpha characters based count and upcase options
   *
   * @method faker.random.alpha
   * @param {mixed} options // defaults to { count: 1, upcase: false, bannedChars: [] }
   */
  this.alpha = function alpha(options) {
    if (typeof options === "undefined") {
      options = {
        count: 1
      };
    } else if (typeof options === "number") {
      options = {
        count: options,
      };
    } else if (typeof options.count === "undefined") {
      options.count = 1;
    }

    if (typeof options.upcase === "undefined") {
      options.upcase = false;
    }
    if (typeof options.bannedChars ==="undefined"){
      options.bannedChars = [];
    }

    var wholeString = "";
    var charsArray = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    if(options.bannedChars){
      charsArray = arrayRemove(charsArray,options.bannedChars);
    }
    for(var i = 0; i < options.count; i++) {
      wholeString += faker.random.arrayElement(charsArray);
    }

    return options.upcase ? wholeString.toUpperCase() : wholeString;
  }

  /**
   * alphaNumeric
   *
   * @method faker.random.alphaNumeric
   * @param {number} count defaults to 1
   * {mixed} options // defaults to { bannedChars: [] }
   * options.bannedChars - array of characters which should be banned in new string
   */
  this.alphaNumeric = function alphaNumeric(count, options) {
    if (typeof count === "undefined") {
      count = 1;
    }
    if (typeof options ==="undefined"){
      options = {};
    }
    if (typeof options.bannedChars ==="undefined"){
      options.bannedChars = [];
    }

    var wholeString = "";
    var charsArray = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
    if(options) {
      if (options.bannedChars) {
        charsArray = arrayRemove(charsArray, options.bannedChars);
      }
    }
    for(var i = 0; i < count; i++) {
      wholeString += faker.random.arrayElement(charsArray);
    }

    return wholeString;
  };

  /**
   * @Deprecated
   * hexaDecimal
   *
   * @method faker.random.hexaDecimal
   * @param {number} count defaults to 1
   */
  this.hexaDecimal = function hexaDecimal(count) {
    console.log("Deprecation Warning: faker.random.hexaDecimal is now located in faker.datatype.hexaDecimal");
    return faker.datatype.hexaDecimal(count);
  };

  return this;

}

module['exports'] = Random;
