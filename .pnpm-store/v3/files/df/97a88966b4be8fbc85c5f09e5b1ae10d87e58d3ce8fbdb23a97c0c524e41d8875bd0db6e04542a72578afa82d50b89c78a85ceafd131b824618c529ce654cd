'use strict';

var _utils = require('../utils');

var files = [{
  name: 'file1.pdf',
  size: 1111,
  type: 'application/pdf'
}, {
  name: 'cats.gif',
  size: 1234,
  type: 'image/gif'
}, {
  name: 'dogs.jpg',
  size: 2345,
  type: 'image/jpeg'
}];

describe('getDataTransferItems', function () {
  it('should return an array', function () {
    var res = (0, _utils.getDataTransferItems)({});
    expect(res).toBeInstanceOf(Array);
    expect(res).toHaveLength(0);
  });

  it('should get dataTransfer before using target', function () {
    var event = {
      target: {
        files: files
      },
      dataTransfer: {
        files: files
      }
    };
    var res = (0, _utils.getDataTransferItems)(event);
    expect(res).toBeInstanceOf(Array);
    expect(res).toHaveLength(3);
  });

  it('should use dataTransfer.items if files is not defined', function () {
    var event = {
      target: {
        files: [{}]
      },
      dataTransfer: {
        items: [{
          kind: 'file',
          name: 'file1.pdf',
          size: 1111,
          type: 'application/pdf'
        }, {
          kind: 'file',
          name: 'cats.gif',
          size: 1234,
          type: 'image/gif'
        }, {
          kind: 'file',
          name: 'dogs.jpg',
          size: 2345,
          type: 'image/jpeg'
        }]
      }
    };
    var res = (0, _utils.getDataTransferItems)(event);
    expect(res).toBeInstanceOf(Array);
    expect(res).toHaveLength(3);
  });

  it('should use event.target if dataTransfer is not defined', function () {
    var event = {
      target: {
        files: files
      }
    };
    var res = (0, _utils.getDataTransferItems)(event);
    expect(res).toBeInstanceOf(Array);
    expect(res).toHaveLength(3);
  });

  it('should prioritize dataTransfer.files over .files', function () {
    var event = {
      dataTransfer: {
        files: [{}, {}],
        items: [{}, {}, {}]
      }
    };
    var res = (0, _utils.getDataTransferItems)(event);
    expect(res).toBeInstanceOf(Array);
    expect(res).toHaveLength(2);
  });

  it('should not mutate data', function () {
    var event = {
      dataTransfer: {
        files: files
      }
    };
    expect(Object.keys(files[2])).toHaveLength(3);
    (0, _utils.getDataTransferItems)(event, true);
    expect(Object.keys(files[2])).toHaveLength(3);
  });
});