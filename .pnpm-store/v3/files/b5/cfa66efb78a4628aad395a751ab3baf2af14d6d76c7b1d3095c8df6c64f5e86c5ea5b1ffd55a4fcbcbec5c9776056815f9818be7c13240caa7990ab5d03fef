// generates fake data for many computer systems properties

var commonFileTypes = [
  "video",
  "audio",
  "image",
  "text",
  "application"
];

var commonMimeTypes = [
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
  "image/png",
  "image/jpeg",
  "image/gif",
  "video/mp4",
  "video/mpeg",
  "text/html"
];

function setToArray(set) {
  // shortcut if Array.from is available
  if (Array.from) { return Array.from(set); }

  var array = [];
  set.forEach(function (item) {
    array.push(item);
  });
  return array;
}

/**
 *
 * @namespace faker.system
 */
function System(faker) {

  /**
   * generates a file name
   *
   * @method faker.system.fileName
   */
  this.fileName = function () {
    var str = faker.random.words(); 
    str = str
          .toLowerCase()
          .replace(/\W/g, "_") + "." + faker.system.fileExt();;
    return str;
  };

  /**
   * commonFileName
   *
   * @method faker.system.commonFileName
   * @param {string} ext
   */
  this.commonFileName = function (ext) {
    var str = faker.random.words();
    str = str
          .toLowerCase()
          .replace(/\W/g, "_");
    str += "." + (ext || faker.system.commonFileExt());
    return str;
  };

  /**
   * mimeType
   *
   * @method faker.system.mimeType
   */
  this.mimeType = function () {
    var typeSet = new Set();
    var extensionSet = new Set();
    var mimeTypes = faker.definitions.system.mimeTypes;

    Object.keys(mimeTypes).forEach(function (m) {
      var type = m.split("/")[0];

      typeSet.add(type);

      if (mimeTypes[m].extensions instanceof Array) {
        mimeTypes[m].extensions.forEach(function (ext) {
          extensionSet.add(ext);
        });
      }
    });

    var types = setToArray(typeSet);
    var extensions = setToArray(extensionSet);
    var mimeTypeKeys = Object.keys(faker.definitions.system.mimeTypes);

    return faker.random.arrayElement(mimeTypeKeys);
  };

  /**
   * returns a commonly used file type
   *
   * @method faker.system.commonFileType
   */
  this.commonFileType = function () {
    return faker.random.arrayElement(commonFileTypes);
  };

  /**
   * returns a commonly used file extension
   *
   * @method faker.system.commonFileExt
   */
  this.commonFileExt = function () {
    return faker.system.fileExt(faker.random.arrayElement(commonMimeTypes));
  };


  /**
   * returns any file type available as mime-type
   *
   * @method faker.system.fileType
   */
  this.fileType = function () {
    var typeSet = new Set();
    var extensionSet = new Set();
    var mimeTypes = faker.definitions.system.mimeTypes;

    Object.keys(mimeTypes).forEach(function (m) {
      var type = m.split("/")[0];

      typeSet.add(type);

      if (mimeTypes[m].extensions instanceof Array) {
        mimeTypes[m].extensions.forEach(function (ext) {
          extensionSet.add(ext);
        });
      }
    });

    var types = setToArray(typeSet);
    var extensions = setToArray(extensionSet);
    var mimeTypeKeys = Object.keys(faker.definitions.system.mimeTypes);
    return faker.random.arrayElement(types);

  };

  /**
   * fileExt
   *
   * @method faker.system.fileExt
   * @param {string} mimeType
   */
  this.fileExt = function (mimeType) {
    var typeSet = new Set();
    var extensionSet = new Set();
    var mimeTypes = faker.definitions.system.mimeTypes;

    Object.keys(mimeTypes).forEach(function (m) {
      var type = m.split("/")[0];

      typeSet.add(type);

      if (mimeTypes[m].extensions instanceof Array) {
        mimeTypes[m].extensions.forEach(function (ext) {
          extensionSet.add(ext);
        });
      }
    });

    var types = setToArray(typeSet);
    var extensions = setToArray(extensionSet);
    var mimeTypeKeys = Object.keys(faker.definitions.system.mimeTypes);

    if (mimeType) {
      var mimes = faker.definitions.system.mimeTypes;
      return faker.random.arrayElement(mimes[mimeType].extensions);
    }

    return faker.random.arrayElement(extensions);
  };

  /**
   * returns directory path
   *
   * @method faker.system.directoryPath
   */
  this.directoryPath = function () {
    var paths = faker.definitions.system.directoryPaths
    return faker.random.arrayElement(paths);
  };

  /**
   * returns file path
   *
   * @method faker.system.filePath
   */
  this.filePath = function () {
    return faker.fake("{{system.directoryPath}}/{{system.fileName}}.{{system.fileExt}}");
  };

  /**
   * semver
   *
   * @method faker.system.semver
   */
  this.semver = function () {
    return [faker.datatype.number(9),
      faker.datatype.number(9),
      faker.datatype.number(9)].join('.');
  }

}

module['exports'] = System;
