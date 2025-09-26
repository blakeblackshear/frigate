'use strict';

const chai = require('chai');
const expect = chai.expect;

// test files
const PSCommand = require('../lib/PSCommand');
const {
  PS_ARG_MISS_ERROR,
  PS_ARG_TYPE_ERROR,
} = require('../lib/errors');


describe('PSCommand', () => {
  const COMMAND = 'Write-Host';

  describe('#constructor', () => {
    it('should create a new PSCommand', () => {
      const psCommand = new PSCommand(COMMAND);
      expect(psCommand).to.be.an.instanceof(PSCommand);
      expect(psCommand).to.have.deep.property('command', COMMAND);
      [
        'addArgument',
        'addParameter', 
        'clone',
      ].forEach(method => {
        expect(psCommand).to.respondTo(method);
      });
    });
  
    it('should fail creating a new PSCommand', () => {
      try {
        new PSCommand();
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_MISS_ERROR);
      }
      try {
        new PSCommand({});
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_TYPE_ERROR);
      }
    });
  });

  describe('#addArgument()', () => {
    const ARGUMENT = 'PSCommand';
    const psCommand = new PSCommand(COMMAND);

    it('should add argument to a PSCommand', () => {
      expect(psCommand.addArgument(ARGUMENT)).to.be.an.instanceof(PSCommand);
      expect(psCommand.addArgument(ARGUMENT).command).to.equal(`${COMMAND} ${ARGUMENT}`);
    });

    it('should fail adding argument to a PSCommand', () => {
      try {
        psCommand.addArgument();
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_MISS_ERROR);
      }
      try {
        psCommand.addArgument({});
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_TYPE_ERROR);
      }
    });
  });

  describe('#addParameter()', () => {
    const PARAMETER1 = {ForegroundColor: 'red'};
    const PARAMETER2 = {name: 'BackgroundColor', value: 'white'};
    const psCommand = new PSCommand(COMMAND);

    it('should add parameter to a PSCommand', () => {
      expect(psCommand.addParameter(PARAMETER1).addParameter(PARAMETER2)).to.be.an.instanceof(PSCommand);
      expect(psCommand.addParameter(PARAMETER1).addParameter(PARAMETER2).command).to.equal(`${COMMAND} -ForegroundColor red -BackgroundColor white`);
    });

    it('should fail adding parameter to a PSCommand', () => {
      try {
        psCommand.addParameter();
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_MISS_ERROR);
      }
      try {
        psCommand.addParameter('');
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_MISS_ERROR);
      }
      try {
        psCommand.addParameter(Object.assign({}, PARAMETER2, {test: true}));
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_ARG_TYPE_ERROR);
      }
    });
  });

  describe('#clone()', () => {
    const psCommand = new PSCommand(COMMAND);

    it('should clone a PSCommand', () => {
      expect(psCommand.clone()).to.be.an.instanceof(PSCommand);
      expect(psCommand.clone().command).to.equal(psCommand.command);
    });
  });
});
