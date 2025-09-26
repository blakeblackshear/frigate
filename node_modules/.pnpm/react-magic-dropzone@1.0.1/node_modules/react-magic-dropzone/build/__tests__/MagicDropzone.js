'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _enzyme = require('enzyme');

var _sinon = require('sinon');

var _enzymeAdapterReact = require('enzyme-adapter-react-16');

var _enzymeAdapterReact2 = _interopRequireDefault(_enzymeAdapterReact);

var _MagicDropzone = require('../MagicDropzone');

var _MagicDropzone2 = _interopRequireDefault(_MagicDropzone);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

(0, _enzyme.configure)({ adapter: new _enzymeAdapterReact2.default() });

var DummyChildComponent = function DummyChildComponent() {
  return null;
};

global.window.URL = {
  createObjectURL: function createObjectURL(arg) {
    return 'data://' + arg.name;
  }
};

var files = void 0;
var images = void 0;
var testLinks = void 0;

describe('MagicDropzone', function () {
  beforeEach(function () {
    testLinks = {
      image1: 'https://image.jpg',
      json: 'http://test.json',
      html: '<img class="  --" sizes="50vw" srcset="https://images.fastcompany.net/image/upload/w_707,ar_16:9,c_limit,f_auto,q_auto:best,fl_lossy/wp-cms/uploads/2017/06/p-1-sonic-burger.jpg 707w" alt="The Newest Burger At Sonic Blends The Beef With Mushrooms So You Eat Less Meat">',
      html2: '<html><img src="https://fun.jpg"><div>tests are fun</div><img src="https://fun2.json"></html>'
    };

    files = [{
      name: 'file1.pdf',
      size: 1111,
      type: 'application/pdf'
    }];

    images = [{
      name: 'cats.gif',
      size: 1234,
      type: 'image/gif'
    }, {
      name: 'dogs.jpg',
      size: 2345,
      type: 'image/jpeg'
    }];
  });

  describe('basics', function () {
    it('should render children', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        _MagicDropzone2.default,
        null,
        _react2.default.createElement(
          'p',
          null,
          'some content'
        )
      ));
      expect(dropzone.html()).toMatchSnapshot();
    });

    it('should render an input HTML element', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        _MagicDropzone2.default,
        null,
        _react2.default.createElement(
          'p',
          null,
          'some content'
        )
      ));
      expect(dropzone.find('input').length).toEqual(1);
    });

    it('sets ref properly', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, null));
      expect(dropzone.instance().fileInputEl).not.toBeUndefined();
      expect(dropzone.instance().fileInputEl.tagName).toEqual('INPUT');
    });

    it('applies the accept prop to the child input', function () {
      var component = (0, _enzyme.render)(_react2.default.createElement(_MagicDropzone2.default, { accept: 'image/jpeg' }));
      expect(Object.keys(component.find('input').attr())).toContain('accept');
      expect(component.find('input').attr('accept')).toEqual('image/jpeg');
    });
  });

  describe('document drop protection', function () {
    var dropzone = void 0;
    var addEventCalls = void 0;
    var savedAddEventListener = void 0;
    var savedRemoveEventListener = void 0;

    beforeEach(function () {
      savedAddEventListener = document.addEventListener;
      savedRemoveEventListener = document.removeEventListener;
      document.addEventListener = (0, _sinon.spy)();
      document.removeEventListener = (0, _sinon.spy)();
    });

    afterEach(function () {
      document.addEventListener = savedAddEventListener;
      document.removeEventListener = savedRemoveEventListener;
    });

    // Collect the list of addEventListener/removeEventListener spy calls into an object keyed by event name.
    function collectEventListenerCalls(calls) {
      return calls.reduce(function (acc, _ref) {
        var _ref2 = _toArray(_ref),
            eventName = _ref2[0],
            rest = _ref2.slice(1);

        acc[eventName] = rest;
        return acc;
      }, {});
    }

    it('installs hooks to prevent stray drops from taking over the browser window', function () {
      dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        _MagicDropzone2.default,
        null,
        _react2.default.createElement(
          'p',
          null,
          'Content'
        )
      ));
      expect(dropzone.html()).toMatchSnapshot();
      expect(document.addEventListener.callCount).toEqual(2);
      addEventCalls = collectEventListenerCalls(document.addEventListener.args);
      Object.keys(addEventCalls).forEach(function (eventName) {
        expect(addEventCalls[eventName][0]).toBeDefined();
        expect(addEventCalls[eventName][1]).toBe(false);
      });
    });

    it('terminates drags and drops on elements outside our dropzone', function () {
      var div = document.createElement('div');
      var event = { preventDefault: (0, _sinon.spy)(), target: div };
      (0, _utils.onDocumentDragOver)(event);
      expect(event.preventDefault.callCount).toEqual(1);
      event.preventDefault.reset();

      dropzone.instance().onDocumentDrop(event);
      expect(event.preventDefault.callCount).toEqual(1);
    });

    it('terminates drags and drops on text input elements outside our dropzone', function () {
      var input = document.createElement('input');
      input.setAttribute('type', 'text');
      var event = { preventDefault: (0, _sinon.spy)(), target: input };
      (0, _utils.onDocumentDragOver)(event);
      expect(event.preventDefault.callCount).toEqual(1);
      event.preventDefault.reset();

      dropzone.instance().onDocumentDrop(event);
      expect(event.preventDefault.callCount).toEqual(1);
    });

    it('permits drags and drops on elements inside our dropzone', function () {
      var instanceEvent = {
        preventDefault: (0, _sinon.spy)(),
        target: dropzone.getDOMNode()
      };
      dropzone.instance().onDocumentDrop(instanceEvent);
      expect(instanceEvent.preventDefault.callCount).toEqual(0);
    });

    it('removes document hooks when unmounted', function () {
      dropzone.unmount();
      expect(document.removeEventListener.callCount).toEqual(2);
      var removeEventCalls = collectEventListenerCalls(document.removeEventListener.args);
      Object.keys(addEventCalls).forEach(function (eventName) {
        expect(removeEventCalls[eventName][0]).toEqual(addEventCalls[eventName][0]);
      });
    });

    it('does not prevent stray drops when preventDropOnDocument is false', function () {
      dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { preventDropOnDocument: false }));
      expect(dropzone.html()).toMatchSnapshot();
      expect(document.addEventListener.callCount).toEqual(0);

      dropzone.unmount();
      expect(document.removeEventListener.callCount).toEqual(0);
    });
  });

  describe('onClick', function () {
    it('should call `open` method', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, null));
      (0, _sinon.spy)(dropzone.instance(), 'open');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(1);
        done();
      }, 0);
    });

    it('should not call `open` if disableClick prop is true', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { disableClick: true }));
      (0, _sinon.spy)(dropzone.instance(), 'open');
      dropzone.simulate('click');
      expect(dropzone.instance().open.callCount).toEqual(0);
    });

    it('should call `onClick` callback if provided', function (done) {
      var clickSpy = (0, _sinon.spy)();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { onClick: clickSpy }));
      (0, _sinon.spy)(dropzone.instance(), 'open');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(1);
        expect(clickSpy.callCount).toEqual(1);
        done();
      }, 0);
    });

    it('should reset the value of input', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, null));
      expect(dropzone.render().find('input').attr('value')).toBeUndefined();
      expect(dropzone.render().find('input').attr('value', 10)).not.toBeUndefined();
      dropzone.simulate('click');
      expect(dropzone.render().find('input').attr('value')).toBeUndefined();
    });

    it('should trigger click even on the input', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, null));
      var clickSpy = (0, _sinon.spy)(dropzone.instance().fileInputEl, 'click');
      dropzone.simulate('click');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(clickSpy.callCount).toEqual(2);
        done();
      }, 0);
    });

    it('should not invoke onClick on the wrapper', function () {
      var onClickOuterSpy = (0, _sinon.spy)();
      var onClickInnerSpy = (0, _sinon.spy)();
      var component = (0, _enzyme.mount)(_react2.default.createElement(
        'div',
        { onClick: onClickOuterSpy },
        _react2.default.createElement(_MagicDropzone2.default, { onClick: onClickInnerSpy })
      ));

      component.simulate('click');
      expect(onClickOuterSpy.callCount).toEqual(1);
      expect(onClickInnerSpy.callCount).toEqual(0);

      onClickOuterSpy.reset();
      onClickInnerSpy.reset();

      component.find('MagicDropzone').simulate('click');
      expect(onClickOuterSpy.callCount).toEqual(0);
      expect(onClickInnerSpy.callCount).toEqual(1);
    });

    it('should invoke onClick on the wrapper if disableClick is set', function () {
      var onClickOuterSpy = (0, _sinon.spy)();
      var component = (0, _enzyme.mount)(_react2.default.createElement(
        'div',
        { onClick: onClickOuterSpy },
        _react2.default.createElement(_MagicDropzone2.default, { disableClick: true })
      ));

      component.find('MagicDropzone').simulate('click');
      expect(onClickOuterSpy.callCount).toEqual(1);
    });

    it('should invoke inputProps onClick if provided', function (done) {
      var inputPropsClickSpy = (0, _sinon.spy)();
      var component = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { inputProps: { onClick: inputPropsClickSpy } }));

      component.find('MagicDropzone').simulate('click');
      setTimeout(function () {
        expect(inputPropsClickSpy.callCount).toEqual(1);
        done();
      }, 0);
    });
  });

  describe('drag-n-drop', function () {
    it('should override onDrag* methods', function () {
      var dragStartSpy = (0, _sinon.spy)();
      var dragEnterSpy = (0, _sinon.spy)();
      var dragOverSpy = (0, _sinon.spy)();
      var dragLeaveSpy = (0, _sinon.spy)();
      var component = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDragStart: dragStartSpy,
        onDragEnter: dragEnterSpy,
        onDragOver: dragOverSpy,
        onDragLeave: dragLeaveSpy
      }));
      component.simulate('dragStart');
      component.simulate('dragEnter', { dataTransfer: { types: ['Files'], items: files } });
      component.simulate('dragOver', { dataTransfer: { types: ['Files'], items: files } });
      component.simulate('dragLeave', { dataTransfer: { types: ['Files'], items: files } });
      expect(dragStartSpy.callCount).toEqual(1);
      expect(dragEnterSpy.callCount).toEqual(1);
      expect(dragOverSpy.callCount).toEqual(1);
      expect(dragLeaveSpy.callCount).toEqual(1);
    });

    it('should guard dropEffect in onDragOver for IE', function () {
      var dragStartSpy = (0, _sinon.spy)();
      var dragEnterSpy = (0, _sinon.spy)();
      var dragLeaveSpy = (0, _sinon.spy)();
      var component = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDragStart: dragStartSpy,
        onDragEnter: dragEnterSpy,
        onDragLeave: dragLeaveSpy
      }));

      // Using Proxy we'll emulate IE throwing when setting dataTransfer.dropEffect
      var eventProxy = new Proxy({}, {
        get: function get(target, prop) {
          switch (prop) {
            case 'dataTransfer':
              throw new Error('IE does not support rrror');
            default:
              return function noop() {};
          }
        }
      });

      // And using then we'll call the onDragOver with the proxy instead of event
      var dragOverSpy = (0, _sinon.stub)(component.instance(), 'onDragOver').callsFake(component.instance().onDragOver(eventProxy));

      component.simulate('dragStart', { dataTransfer: { types: ['Files'], items: files } });
      component.simulate('dragEnter', { dataTransfer: { types: ['Files'], items: files } });
      component.simulate('dragOver', { dataTransfer: { types: ['Files'], items: files } });
      component.simulate('dragLeave', { dataTransfer: { types: ['Files'], items: files } });
      expect(dragStartSpy.callCount).toEqual(1);
      expect(dragEnterSpy.callCount).toEqual(1);
      expect(dragLeaveSpy.callCount).toEqual(1);
      // It should not throw the error
      expect(dragOverSpy).not.toThrow();
      dragOverSpy.restore();
    });
  });

  describe('onDrop', function () {
    var dropSpy = void 0;
    var dropAcceptedSpy = void 0;
    var dropRejectedSpy = void 0;

    beforeEach(function () {
      dropSpy = (0, _sinon.spy)();
      dropAcceptedSpy = (0, _sinon.spy)();
      dropRejectedSpy = (0, _sinon.spy)();
    });

    afterEach(function () {
      dropSpy.reset();
      dropAcceptedSpy.reset();
      dropRejectedSpy.reset();
    });

    it('should add valid files to rejected files on a multple drop when multiple false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { accept: 'image/*', onDrop: dropSpy, multiple: false }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      var rejected = dropSpy.firstCall.args[0];
      expect(rejected.length).toEqual(1);
    });

    it('should add invalid files to rejected when multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { accept: 'image/*', onDrop: dropSpy, multiple: false }));
      dropzone.simulate('drop', {
        dataTransfer: { types: ['Files'], files: images.concat(files) }
      });
      var rejected = dropSpy.firstCall.args[1];
      expect(rejected.length).toEqual(2);
    });

    it('should allow single files to be dropped if multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { accept: 'image/*', onDrop: dropSpy, multiple: false }));

      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: [images[0]] } });

      var _dropSpy$firstCall$ar = _slicedToArray(dropSpy.firstCall.args, 2),
          accepted = _dropSpy$firstCall$ar[0],
          rejected = _dropSpy$firstCall$ar[1];

      expect(accepted.length).toEqual(1);
      expect(rejected.length).toEqual(0);
    });

    it('should take all dropped files if multiple is true', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { onDrop: dropSpy, multiple: true }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropSpy.firstCall.args[0][0].name).toEqual(images[0].name);
      expect(dropSpy.firstCall.args[0][1].name).toEqual(images[1].name);
    });

    it('should set this.isFileDialogActive to false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, null));
      dropzone.instance().isFileDialogActive = true;
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropzone.instance().isFileDialogActive).toEqual(false);
    });

    it('should always call onDrop callback with accepted and rejected arguments', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toEqual([], [].concat(_toConsumableArray(files)));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropSpy.callCount).toEqual(2);
      expect(dropSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)), []);
      dropzone.simulate('drop', {
        dataTransfer: { types: ['Files'], files: files.concat(images) }
      });
      expect(dropSpy.callCount).toEqual(3);
      expect(dropSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)), [].concat(_toConsumableArray(files)));
    });

    it('should call onDropAccepted callback if some files were accepted', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropAcceptedSpy.callCount).toEqual(0);
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)));
      dropzone.simulate('drop', {
        dataTransfer: { types: ['Files'], files: files.concat(images) }
      });
      expect(dropAcceptedSpy.callCount).toEqual(2);
      expect(dropAcceptedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)));
    });

    it('should call onDropRejected callback if some files were rejected', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(files)));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropRejectedSpy.callCount).toEqual(1);
      dropzone.simulate('drop', {
        dataTransfer: { types: ['Files'], files: files.concat(images) }
      });
      expect(dropRejectedSpy.callCount).toEqual(2);
      expect(dropRejectedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(files)));
    });

    it('applies the accept prop to the dropped files', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(0);
      expect(dropSpy.firstCall.args[1]).toHaveLength(1);
      expect(dropAcceptedSpy.callCount).toEqual(0);
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.firstCall.args[0]).toHaveLength(1);
    });

    it('applies the accept prop to the dropped images', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));

      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('accepts a dropped image when Firefox provides a bogus file type', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      var bogusImages = [{
        name: 'bogus.gif',
        size: 1234,
        type: 'application/x-moz-file'
      }];

      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: bogusImages } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('accepts all dropped files and images when no accept prop is specified', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy
      }));
      dropzone.simulate('drop', {
        dataTransfer: { types: ['Files'], files: files.concat(images) }
      });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(3);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(3);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('applies the maxSize prop to the dropped files', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        maxSize: 1111
      }));

      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('applies the maxSize prop to the dropped images', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        maxSize: 1111
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(0);
      expect(dropSpy.firstCall.args[1]).toHaveLength(2);
      expect(dropAcceptedSpy.callCount).toEqual(0);
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.firstCall.args[0]).toHaveLength(2);
    });

    it('applies the minSize prop to the dropped files', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        minSize: 1112
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(0);
      expect(dropSpy.firstCall.args[1]).toHaveLength(1);
      expect(dropAcceptedSpy.callCount).toEqual(0);
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.firstCall.args[0]).toHaveLength(1);
    });

    it('applies the minSize prop to the dropped images', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        minSize: 1112
      }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('accepts all dropped files and images when no size prop is specified', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy
      }));
      dropzone.simulate('drop', {
        dataTransfer: { types: ['Files'], files: files.concat(images) }
      });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(3);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(3);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });
  });

  describe('preview', function () {
    it('should generate previews for non-images', function () {
      var dropSpy = (0, _sinon.spy)();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { onDrop: dropSpy }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(Object.keys(dropSpy.firstCall.args[0][0])).toContain('preview');
      expect(dropSpy.firstCall.args[0][0].preview).toContain('data://file1.pdf');
    });

    it('should generate previews for images', function () {
      var dropSpy = (0, _sinon.spy)();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { onDrop: dropSpy }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      expect(Object.keys(dropSpy.firstCall.args[0][0])).toContain('preview');
      expect(dropSpy.firstCall.args[0][0].preview).toContain('data://cats.gif');
    });

    it('should not throw error when preview cannot be created', function () {
      var dropSpy = (0, _sinon.spy)();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { onDrop: dropSpy }));

      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: ['bad_val'] } });

      expect(Object.keys(dropSpy.firstCall.args[1][0])).not.toContain('preview');
    });

    it('should not generate previews if disablePreview is true', function () {
      var dropSpy = (0, _sinon.spy)();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { disablePreview: true, onDrop: dropSpy }));
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: images } });
      dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: files } });
      expect(dropSpy.callCount).toEqual(2);
      expect(Object.keys(dropSpy.firstCall.args[0][0])).not.toContain('preview');
      expect(Object.keys(dropSpy.lastCall.args[0][0])).not.toContain('preview');
    });
  });

  describe('onDrop links', function () {
    var dropSpy = void 0;
    var dropAcceptedSpy = void 0;
    var dropRejectedSpy = void 0;

    beforeEach(function () {
      dropSpy = (0, _sinon.spy)();
      dropAcceptedSpy = (0, _sinon.spy)();
      dropRejectedSpy = (0, _sinon.spy)();
    });

    afterEach(function () {
      dropSpy.reset();
      dropAcceptedSpy.reset();
      dropRejectedSpy.reset();
    });

    it('should allow text/uri-list to be dropped', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        accept: '.jpg',
        onDrop: dropSpy
      }));

      dropzone.simulate('drop', {
        dataTransfer: {
          types: ['text/uri-list'],
          getData: function getData() {
            return testLinks.image1;
          }
        }
      });

      var _dropSpy$firstCall$ar2 = _slicedToArray(dropSpy.firstCall.args, 3),
          accepted = _dropSpy$firstCall$ar2[0],
          rejected = _dropSpy$firstCall$ar2[1],
          links = _dropSpy$firstCall$ar2[2];

      expect(accepted.length).toEqual(0);
      expect(rejected.length).toEqual(0);
      expect(links.length).toEqual(1);
    });

    it('should return an empty list if text/uri-list is dropped with no accept', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        onDrop: dropSpy
      }));

      dropzone.simulate('drop', {
        dataTransfer: {
          types: ['text/uri-list'],
          getData: function getData() {
            return testLinks.image1;
          }
        }
      });

      var _dropSpy$firstCall$ar3 = _slicedToArray(dropSpy.firstCall.args, 3),
          accepted = _dropSpy$firstCall$ar3[0],
          rejected = _dropSpy$firstCall$ar3[1],
          links = _dropSpy$firstCall$ar3[2];

      expect(accepted.length).toEqual(0);
      expect(rejected.length).toEqual(0);
      expect(links.length).toEqual(0);
    });

    it('should allow for muliple links to be dropped', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        accept: '.jpg, .json',
        onDrop: dropSpy
      }));

      dropzone.simulate('drop', {
        dataTransfer: {
          types: ['text/uri-list'],
          getData: function getData() {
            return testLinks.html2;
          }
        }
      });

      var _dropSpy$firstCall$ar4 = _slicedToArray(dropSpy.firstCall.args, 3),
          accepted = _dropSpy$firstCall$ar4[0],
          rejected = _dropSpy$firstCall$ar4[1],
          links = _dropSpy$firstCall$ar4[2];

      expect(accepted.length).toEqual(0);
      expect(rejected.length).toEqual(0);
      expect(links.length).toEqual(2);
    });

    it('should allow text/html to be dropped', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        accept: '.jpg',
        onDrop: dropSpy
      }));

      dropzone.simulate('drop', {
        dataTransfer: {
          types: ['text/html'],
          getData: function getData() {
            return testLinks.html;
          }
        }
      });

      var _dropSpy$firstCall$ar5 = _slicedToArray(dropSpy.firstCall.args, 3),
          accepted = _dropSpy$firstCall$ar5[0],
          rejected = _dropSpy$firstCall$ar5[1],
          links = _dropSpy$firstCall$ar5[2];

      expect(accepted.length).toEqual(0);
      expect(rejected.length).toEqual(0);
      expect(links.length).toEqual(1);
    });

    it('should only allow links of valid extension', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        accept: '.jpg',
        onDrop: dropSpy,
        multiple: false
      }));

      dropzone.simulate('drop', {
        dataTransfer: {
          types: ['text/uri-list'],
          getData: function getData() {
            return testLinks.json;
          }
        }
      });

      var _dropSpy$firstCall$ar6 = _slicedToArray(dropSpy.firstCall.args, 3),
          accepted = _dropSpy$firstCall$ar6[0],
          rejected = _dropSpy$firstCall$ar6[1],
          links = _dropSpy$firstCall$ar6[2];

      expect(accepted.length).toEqual(0);
      expect(rejected.length).toEqual(0);
      expect(links.length).toEqual(0);
    });
  });

  describe('onCancel', function () {
    it('should not invoke onFileDialogCancel everytime window receives focus', function (done) {
      var onCancelSpy = (0, _sinon.spy)();
      (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        id: 'on-cancel-example',
        onFileDialogCancel: onCancelSpy
      }));
      // Simulated DOM event - onfocus
      document.body.addEventListener('focus', function () {});
      var evt = document.createEvent('HTMLEvents');
      evt.initEvent('focus', false, true);
      document.body.dispatchEvent(evt);
      // setTimeout to match the event callback from actual Component
      setTimeout(function () {
        expect(onCancelSpy.callCount).toEqual(0);
        done();
      }, 300);
    });

    it('should invoke onFileDialogCancel when window receives focus via cancel button', function (done) {
      var onCancelSpy = (0, _sinon.spy)();
      var component = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, {
        className: 'dropzone-content',
        onFileDialogCancel: onCancelSpy
      }));

      // Test / invoke the click event
      (0, _sinon.spy)(component.instance(), 'open');
      component.simulate('click');

      setTimeout(function () {
        expect(component.instance().open.callCount).toEqual(1);

        // Simulated DOM event - onfocus
        document.body.addEventListener('focus', function () {});
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('focus', false, true);
        document.body.dispatchEvent(evt);

        // setTimeout to match the event callback from actual Component
        setTimeout(function () {
          expect(onCancelSpy.callCount).toEqual(1);
          done();
        }, 300);
      }, 0);
    });
  });

  describe('nested MagicDropzone component behavior', function () {
    var outerMagicDropzone = void 0;
    var innerMagicDropzone = void 0;
    var outerDropSpy = void 0;
    var outerDropAcceptedSpy = void 0;
    var outerDropRejectedSpy = void 0;
    var innerDropSpy = void 0;
    var innerDropAcceptedSpy = void 0;
    var innerDropRejectedSpy = void 0;

    var InnerDragAccepted = function InnerDragAccepted() {
      return _react2.default.createElement(
        'p',
        null,
        'Accepted'
      );
    };
    var InnerDragRejected = function InnerDragRejected() {
      return _react2.default.createElement(
        'p',
        null,
        'Rejected'
      );
    };
    var InnerMagicDropzone = function InnerMagicDropzone() {
      return _react2.default.createElement(
        _MagicDropzone2.default,
        {
          onDrop: innerDropSpy,
          onDropAccepted: innerDropAcceptedSpy,
          onDropRejected: innerDropRejectedSpy,
          accept: 'image/*'
        },
        function (_ref3) {
          var isDragActive = _ref3.isDragActive,
              isDragReject = _ref3.isDragReject;

          if (isDragReject) return _react2.default.createElement(InnerDragRejected, null);
          if (isDragActive) return _react2.default.createElement(InnerDragAccepted, null);
          return _react2.default.createElement(
            'p',
            null,
            'No drag'
          );
        }
      );
    };

    describe('dropping on the inner dropzone', function () {
      it('mounts both dropzones', function () {
        outerDropSpy = (0, _sinon.spy)();
        outerDropAcceptedSpy = (0, _sinon.spy)();
        outerDropRejectedSpy = (0, _sinon.spy)();
        innerDropSpy = (0, _sinon.spy)();
        innerDropAcceptedSpy = (0, _sinon.spy)();
        innerDropRejectedSpy = (0, _sinon.spy)();
        outerMagicDropzone = (0, _enzyme.mount)(_react2.default.createElement(
          _MagicDropzone2.default,
          {
            onDrop: outerDropSpy,
            onDropAccepted: outerDropAcceptedSpy,
            onDropRejected: outerDropRejectedSpy,
            accept: 'image/*'
          },
          function (props) {
            return _react2.default.createElement(InnerMagicDropzone, props);
          }
        ));
        innerMagicDropzone = outerMagicDropzone.find(InnerMagicDropzone);
      });

      //   it('does dragEnter on both dropzones', () => {
      //     innerMagicDropzone.simulate('dragEnter', {
      //       dataTransfer: { files: images }
      //     })
      //     expect(innerMagicDropzone).toHaveProp('isDragActive', true)
      //     expect(innerMagicDropzone).toHaveProp('isDragReject', false)
      //     expect(innerMagicDropzone.find(InnerDragAccepted).exists()).toEqual(
      //       true
      //     )
      //     expect(innerMagicDropzone.find(InnerDragRejected).exists()).toEqual(
      //       false
      //     )
      //   })
      //
      //   it('drops on the child dropzone', () => {
      //     innerMagicDropzone.simulate('drop', {
      //       dataTransfer: { files: files.concat(images) }
      //     })
      //   })
      //
      //   it('accepts the drop on the inner dropzone', () => {
      //     expect(innerDropSpy.callCount).toEqual(1)
      //     expect(innerDropSpy.firstCall.args[0]).toHaveLength(2)
      //     expect(innerDropSpy.firstCall.args[1]).toHaveLength(1)
      //     expect(innerDropAcceptedSpy.callCount).toEqual(1)
      //     expect(innerDropAcceptedSpy.firstCall.args[0]).toHaveLength(2)
      //     expect(innerDropRejectedSpy.callCount).toEqual(1)
      //     expect(innerDropRejectedSpy.firstCall.args[0]).toHaveLength(1)
      //     expect(innerMagicDropzone.find(InnerDragAccepted).exists()).toEqual(
      //       false
      //     )
      //     expect(innerMagicDropzone.find(InnerDragRejected).exists()).toEqual(
      //       false
      //     )
      //   })
      //
      //   it('also accepts the drop on the outer dropzone', () => {
      //     expect(outerDropSpy.callCount).toEqual(1)
      //     expect(outerDropSpy.firstCall.args[0]).toHaveLength(2)
      //     expect(outerDropSpy.firstCall.args[1]).toHaveLength(1)
      //     expect(outerDropAcceptedSpy.callCount).toEqual(1)
      //     expect(outerDropAcceptedSpy.firstCall.args[0]).toHaveLength(2)
      //     expect(outerDropRejectedSpy.callCount).toEqual(1)
      //     expect(outerDropRejectedSpy.firstCall.args[0]).toHaveLength(1)
      //     expect(innerMagicDropzone).toHaveProp('isDragActive', false)
      //     expect(innerMagicDropzone).toHaveProp('isDragReject', false)
      //   })
    });
  });

  describe('behavior', function () {
    it('does not throw an error when html is dropped instead of files and multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { multiple: false }));

      var fn = function fn() {
        return dropzone.simulate('drop', { dataTransfer: { types: ['Files'], files: [] } });
      };
      expect(fn).not.toThrow();
    });

    it('does not allow actions when disabled props is true', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { disabled: true }));

      (0, _sinon.spy)(dropzone.instance(), 'open');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(0);
        done();
      }, 0);
    });

    it('when toggle disabled props, MagicDropzone works as expected', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(_MagicDropzone2.default, { disabled: true }));
      (0, _sinon.spy)(dropzone.instance(), 'open');

      dropzone.setProps({ disabled: false });

      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(1);
        done();
      }, 0);
    });
  });
});