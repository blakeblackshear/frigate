const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const sinon = require('sinon');
const expect = chai.expect;
chai.use(chaiAsPromised);

// test files
const {
  isWin,
  isCriticalPSError,
  logger,
  ShellStreamBuffer,
  shellSafeWrite,
  convertToPSParam,
  convertToPSOption,
} = require('../lib/utils');
const {
  PS_PROC_ERROR,
  PS_ARG_MISS_ERROR,
  PS_ARG_TYPE_ERROR,
  PS_CMD_FAIL_ERROR,
} = require('../lib/errors');


describe('Utils', () => {
  describe('logger', () => {
    it('should log message', () => {
      const consoleSpy = sinon.spy(console, 'log');

      logger.info('nps');
      logger.debug('nps');
      logger.ok('nps');
      logger.warn('nps');
      logger.error('nps');
      
      expect(consoleSpy.callCount).to.equal(5);
      consoleSpy.restore();
    });
  });

  describe('ShellStreamBuffer + shellSafeWrite', () => {
    it('should aggregate data');
    it('should emit EOI');
  });

  describe('convert', () => {
    it('convert a JS param to a PS param');
    it('convert a JS option to a PS option');
  });
});

describe('Errors', () => {
  describe('PS_PROC_ERROR', () => {
    it('should throw default message', () => {
      try {
        throw new PS_PROC_ERROR();
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_PROC_ERROR);
        expect(error.message).to.contain('Node-PowerShell was unable to start PowerShell.');
      }
    });
    it('should override message', () => {
      try {
        throw new PS_PROC_ERROR('other message');
      } catch (error) {
        expect(error).to.be.an.instanceof(PS_PROC_ERROR);
        expect(error.message).to.contain('other message');
      }
    });
  });
});

