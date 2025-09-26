'use strict';

const chai = require('chai');
const path = require('path');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
chai.use(chaiAsPromised);

// test files
const Shell = require('../lib/Shell');
const PSCommand = require('../lib/PSCommand');
const {
  PS_PROC_ERROR,
  PS_ARG_MISS_ERROR,
  PS_ARG_TYPE_ERROR,
  PS_CMD_FAIL_ERROR,
} = require('../lib/errors');


describe('Shell', () => {
  const COMMAND = 'Write-Host';
  let ps;

  afterEach(() => {
    return ps.clear();
  });

  describe('#constructor', () => {
    it('should create a new PS Shell', () => {
      ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true,
        verbose: false,
      });
      expect(ps).to.be.an.instanceof(Shell);
      [
        'pid', 
        'streams', 
        'commands', 
        'history', 
        'hadErrors', 
        'invocationStateInfo', 
        'verbose',
      ].forEach(property => {
        expect(ps).to.have.deep.property(property);
      });
      [
        'addCommand', 
        'addArgument', 
        'addParameter',
        'addParameters',
        'invoke',
        'stop',
        'dispose',
      ].forEach(method => {
        expect(ps).to.respondTo(method);
      });
    });
  
    it('should fail creating a new PS Shell');
  });

  describe('#addCommand()', () => {
    it('should add command to the Shell', () => {
      const psCommand = new PSCommand(COMMAND);
      expect(ps.addCommand(COMMAND)).to.eventually.be.an('array')
        .that.include(psCommand);
      expect(ps.addCommand(psCommand)).to.eventually.be.an('array')
        .that.have.lengthOf(2);
    });

    it('should fail adding command to the Shell', () => {
      expect(ps.addCommand('')).be.eventually.rejectedWith(PS_ARG_MISS_ERROR);
      expect(ps.addCommand({})).be.eventually.rejectedWith(PS_ARG_TYPE_ERROR);
    });
  });

  describe('#addArgument()', () => {
    const ARGUMENT = 'PSCommand';

    it('should add argument to the Shell', () => {
      const test = ps.addCommand(COMMAND)
        .then(() => ps.addArgument(ARGUMENT));
      expect(test).to.eventually.be.an('array')
        .that.have.nested.property('[0].command', `${COMMAND} ${ARGUMENT}`);
    });

    it('should fail adding argument to the Shell', () => {
      expect(ps.addArgument(ARGUMENT)).be.eventually.rejectedWith(PS_ARG_MISS_ERROR);
    });
  });

  describe('#addParameter/s()', () => {
    const PARAMETER1 = {ForegroundColor: 'red'};
    const PARAMETER2 = {name: 'BackgroundColor', value: 'white'};

    it('should add parameter to the Shell', () => {
      const test = ps.addCommand(COMMAND)
        .then(() => ps.addParameter(PARAMETER1))
        .then(() => ps.addParameter(PARAMETER2));
      expect(test).to.eventually.be.an('array')
        .that.have.nested.property(
          '[0].command', 
          `${COMMAND} -ForegroundColor red -BackgroundColor white`
        );
    });

    it('should add parameters to the Shell', () => {
      const test = ps.addCommand(COMMAND)
        .then(() => ps.addParameters([PARAMETER1, PARAMETER2]))
      expect(test).to.eventually.be.an('array')
        .that.have.nested.property(
          '[0].command', 
          `${COMMAND} -ForegroundColor red -BackgroundColor white`
        );
    });

    it('should fail adding parameter to the Shell', () => {
      expect(ps.addParameter(PARAMETER1)).be.eventually.rejectedWith(PS_ARG_MISS_ERROR);
      expect(ps.addParameter(PARAMETER2)).be.eventually.rejectedWith(PS_ARG_MISS_ERROR);
    });
  });

  describe('#invoke()', () => {
    it('should invoke command in the Shell', function() {
      this.timeout(0);
      return ps.addCommand(`& "${path.resolve(__dirname, 'script-dataTypes.ps1')}"`)
        .then(() => ps.addParameters([
          {string: 'abc'},
          {char: 'a'},
          {byte: '0x26'},
          {int: 1},
          {long: 10000000000},
          {bool: true},
          {decimal: '1d'},
          // single
          {double: 1.1},
          {DateTime: new Date().toLocaleString()},
          {xml: '<a></a>'},
          {array: [1,2]},
          {hashtable: {A:1, B:2}},
          {switch: null}
        ]))
        .then(() => ps.invoke())
        .then(output => {
          expect(JSON.parse(output).every(e => e.test)).to.be.true;
          expect(ps.history[0].hadErrors).to.be.false;
          return Promise.resolve();
        })
        .catch(error => {
          console.log(error);
          return Promise.resolve();
        });
    });

    it('should fail invoking command in the Shell', function() {
      this.timeout(0);
      return ps.addCommand('throw "error"')
        .then(() => ps.invoke())
        .catch(error => {
          expect(error).to.be.an.instanceof(PS_CMD_FAIL_ERROR);
          expect(ps.history[1].hadErrors).to.be.true;
          return Promise.resolve();
        });
    });
  });

  describe('#stop()', () => {
    it('should stop command invocation in the Shell');
    it('should fail stopping command invocation in the Shell');
  });

  describe('#events', () => {
    it('listen to output event', function(done) {
      this.timeout(0);
      ps.on('output', data => {
        ps.removeAllListeners();
        expect(data).to.equal('test');
        done();
      });
      ps.addCommand(new PSCommand(COMMAND).addArgument('test').addParameter({nonewline: undefined}))
        .then(() => ps.invoke());
    });

    it('listen to err event', function(done) {
      this.timeout(0);
      ps.on('err', error => {
        ps.removeAllListeners();
        expect(error).to.be.an.instanceof(PS_CMD_FAIL_ERROR);
        done();
      });
      ps.addCommand('throw "error"')
        .then(() => expect(ps.invoke()).to.eventually.be.rejected);
    });
  });

  describe('#dispose', () => {
    it('should dispose the shell', function(done) {
      this.timeout(0);
      ps.on('end', data => {
        ps.removeAllListeners();
        expect(data).to.equal(0);
        done();
      });
      ps.dispose();
    });
  });
});
