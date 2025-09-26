/**
 * @namespace faker.git
 */

var Git = function(faker) {
  var self = this;
  var f = faker.fake;

  var hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

  /**
   * branch
   *
   * @method faker.git.branch
   */
  self.branch = function() {
    var noun = faker.hacker.noun().replace(' ', '-');
    var verb = faker.hacker.verb().replace(' ', '-');
    return noun + '-' + verb;
  }

  /**
   * commitEntry
   *
   * @method faker.git.commitEntry
   * @param {object} options
   */
  self.commitEntry = function(options) {
    options = options || {};

    var entry = 'commit {{git.commitSha}}\r\n';

    if (options.merge || (faker.datatype.number({ min: 0, max: 4 }) === 0)) {
      entry += 'Merge: {{git.shortSha}} {{git.shortSha}}\r\n';
    }

    entry += 'Author: {{name.firstName}} {{name.lastName}} <{{internet.email}}>\r\n';
    entry += 'Date: ' + faker.date.recent().toString() + '\r\n';
    entry += '\r\n\xa0\xa0\xa0\xa0{{git.commitMessage}}\r\n';

    return f(entry);
  };

  /**
   * commitMessage
   *
   * @method faker.git.commitMessage
   */
  self.commitMessage = function() {
    var format = '{{hacker.verb}} {{hacker.adjective}} {{hacker.noun}}';
    return f(format);
  };

  /**
   * commitSha
   *
   * @method faker.git.commitSha
   */
  self.commitSha = function() {
    var commit = "";

    for (var i = 0; i < 40; i++) {
      commit += faker.random.arrayElement(hexChars);
    }

    return commit;
  };

  /**
   * shortSha
   *
   * @method faker.git.shortSha
   */
  self.shortSha = function() {
    var shortSha = "";

    for (var i = 0; i < 7; i++) {
      shortSha += faker.random.arrayElement(hexChars);
    }

    return shortSha;
  };

  return self;
}

module['exports'] = Git;
