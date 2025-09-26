/**
 *
 * @namespace faker.time
 */
var _Time = function(faker) {
  var self = this;

  /**
   * recent
   *
   * @method faker.time.recent
   * @param {string} outputType - 'abbr' || 'wide' || 'unix' (default choice)
   */
  self.recent = function(outputType) {
    if (typeof outputType === "undefined") {
      outputType = 'unix';
    }

    var date = new Date();
    switch (outputType) {
      case "abbr":
        date = date.toLocaleTimeString();
        break;
      case "wide":
        date = date.toTimeString();
        break;
      case "unix":
        date = date.getTime();
        break;
    }
    return date;
  };

  return self;
};

module["exports"] = _Time;
