/**
 *
 * @namespace faker.music
 */
var Music = function (faker) {
  var self = this;
  /**
     * genre
     *
     * @method faker.music.genre
     */
  self.genre = function () {
    return faker.random.arrayElement(faker.definitions.music.genre);
  };

  self.genre.schema = {
    "description": "Generates a genre.",
    "sampleResults": ["Rock", "Metal", "Pop"]
  };
};

module["exports"] = Music;
