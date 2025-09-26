var expect = require('chai').expect,
  path = require('path'),

  package = require(path.resolve('.', 'package.json'));


describe('package.json', function () {
  it('should have com_postman_plugin object with valid properties', function () {
    expect(package).to.have.property('com_postman_plugin');

    expect(package.com_postman_plugin.type).to.equal('code_generator');
    expect(package.com_postman_plugin.lang).to.be.a('string');
    expect(package.com_postman_plugin.variant).to.be.a('string');
    expect(package.com_postman_plugin.syntax_mode).to.be.equal('javascript');
  });
  it('should have main property with relative path to object with convert property', function () {
    var languageModule;

    expect(package.main).to.be.a('string');

    try {
      languageModule = require(path.resolve('.', package.main));
    }
    catch (error) {
      console.error(error);
    }
    expect(languageModule).to.be.a('object');
    expect(languageModule.convert).to.be.a('function');
  });
});
