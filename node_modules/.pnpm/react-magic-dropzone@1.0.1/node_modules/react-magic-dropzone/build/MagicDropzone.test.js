'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _enzyme = require('enzyme');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var files = void 0;
var images = void 0;

var rejectColor = 'red';
var acceptColor = 'green';

var rejectStyle = {
  color: rejectColor,
  borderColor: 'black'
};

var acceptStyle = {
  color: acceptColor,
  borderWidth: '5px'
};

describe('Dropzone', function () {
  beforeEach(function () {
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
        Dropzone,
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
        Dropzone,
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
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, null));
      expect(dropzone.instance().fileInputEl).not.toBeUndefined();
      expect(dropzone.instance().fileInputEl.tagName).toEqual('INPUT');
    });

    it('renders dynamic props on the root element', function () {
      var component = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { hidden: true, 'aria-hidden': true, title: 'Dropzone' }));
      expect(component.html()).toContain('aria-hidden="true"');
      expect(component.html()).toContain('hidden=""');
      expect(component.html()).toContain('title="Dropzone"');
    });

    it('renders dynamic props on the input element', function () {
      var component = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { inputProps: { id: 'hiddenFileInput' } }));
      expect(component.find('input').html()).toContain('id="hiddenFileInput"');
    });

    it('applies the accept prop to the child input', function () {
      var component = (0, _enzyme.render)(_react2.default.createElement(Dropzone, { className: 'my-dropzone', accept: 'image/jpeg' }));
      expect(component.find('.my-dropzone').attr()).not.toContain('accept');
      expect(Object.keys(component.find('input').attr())).toContain('accept');
      expect(component.find('input').attr('accept')).toEqual('image/jpeg');
    });

    it('applies the name prop to the child input', function () {
      var component = (0, _enzyme.render)(_react2.default.createElement(Dropzone, { className: 'my-dropzone', name: 'test-file-input' }));
      expect(component.find('.my-dropzone').attr()).not.toContain('name');
      expect(Object.keys(component.find('input').attr())).toContain('name');
      expect(component.find('input').attr('name')).toEqual('test-file-input');
    });

    it('should render children function', function () {
      var content = _react2.default.createElement(
        'p',
        null,
        'some content'
      );
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        null,
        content
      ));
      var dropzoneWithFunction = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        null,
        function () {
          return content;
        }
      ));
      expect(dropzoneWithFunction.html()).toEqual(dropzone.html());
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
      document.addEventListener = spy();
      document.removeEventListener = spy();
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

        acc[eventName] = rest; // eslint-disable-line no-param-reassign
        return acc;
      }, {});
    }

    it('installs hooks to prevent stray drops from taking over the browser window', function () {
      dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
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
      var event = { preventDefault: spy() };
      (0, _utils.onDocumentDragOver)(event);
      expect(event.preventDefault.callCount).toEqual(1);
      event.preventDefault.reset();

      dropzone.getNode().onDocumentDrop(event);
      expect(event.preventDefault.callCount).toEqual(1);
    });

    it('permits drags and drops on elements inside our dropzone', function () {
      var instanceEvent = {
        preventDefault: spy(),
        target: dropzone.getDOMNode()
      };
      dropzone.getNode().onDocumentDrop(instanceEvent);
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
      dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { preventDropOnDocument: false }));
      expect(dropzone.html()).toMatchSnapshot();
      expect(document.addEventListener.callCount).toEqual(0);

      dropzone.unmount();
      expect(document.removeEventListener.callCount).toEqual(0);
    });
  });

  describe('onClick', function () {
    it('should call `open` method', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, null));
      spy(dropzone.instance(), 'open');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(1);
        done();
      }, 0);
    });

    it('should not call `open` if disableClick prop is true', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { disableClick: true }));
      spy(dropzone.instance(), 'open');
      dropzone.simulate('click');
      expect(dropzone.instance().open.callCount).toEqual(0);
    });

    it('should call `onClick` callback if provided', function (done) {
      var clickSpy = spy();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { onClick: clickSpy }));
      spy(dropzone.instance(), 'open');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(1);
        expect(clickSpy.callCount).toEqual(1);
        done();
      }, 0);
    });

    it('should reset the value of input', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, null));
      expect(dropzone.render().find('input').attr('value')).toBeUndefined();
      expect(dropzone.render().find('input').attr('value', 10)).not.toBeUndefined();
      dropzone.simulate('click');
      expect(dropzone.render().find('input').attr('value')).toBeUndefined();
    });

    it('should trigger click even on the input', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, null));
      var clickSpy = spy(dropzone.instance().fileInputEl, 'click');
      dropzone.simulate('click');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(clickSpy.callCount).toEqual(2);
        done();
      }, 0);
    });

    it('should not invoke onClick on the wrapper', function () {
      var onClickOuterSpy = spy();
      var onClickInnerSpy = spy();
      var component = (0, _enzyme.mount)(_react2.default.createElement(
        'div',
        { onClick: onClickOuterSpy },
        _react2.default.createElement(Dropzone, { onClick: onClickInnerSpy })
      ));

      component.simulate('click');
      expect(onClickOuterSpy.callCount).toEqual(1);
      expect(onClickInnerSpy.callCount).toEqual(0);

      onClickOuterSpy.reset();
      onClickInnerSpy.reset();

      component.find('Dropzone').simulate('click');
      expect(onClickOuterSpy.callCount).toEqual(0);
      expect(onClickInnerSpy.callCount).toEqual(1);
    });

    it('should invoke onClick on the wrapper if disableClick is set', function () {
      var onClickOuterSpy = spy();
      var component = (0, _enzyme.mount)(_react2.default.createElement(
        'div',
        { onClick: onClickOuterSpy },
        _react2.default.createElement(Dropzone, { disableClick: true })
      ));

      component.find('Dropzone').simulate('click');
      expect(onClickOuterSpy.callCount).toEqual(1);
    });

    it('should invoke inputProps onClick if provided', function (done) {
      var inputPropsClickSpy = spy();
      var component = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { inputProps: { onClick: inputPropsClickSpy } }));

      component.find('Dropzone').simulate('click');
      setTimeout(function () {
        expect(inputPropsClickSpy.callCount).toEqual(1);
        done();
      }, 0);
    });
  });

  describe('drag-n-drop', function () {
    it('should override onDrag* methods', function () {
      var dragStartSpy = spy();
      var dragEnterSpy = spy();
      var dragOverSpy = spy();
      var dragLeaveSpy = spy();
      var component = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDragStart: dragStartSpy,
        onDragEnter: dragEnterSpy,
        onDragOver: dragOverSpy,
        onDragLeave: dragLeaveSpy
      }));
      component.simulate('dragStart');
      component.simulate('dragEnter', { dataTransfer: { items: files } });
      component.simulate('dragOver', { dataTransfer: { items: files } });
      component.simulate('dragLeave', { dataTransfer: { items: files } });
      expect(dragStartSpy.callCount).toEqual(1);
      expect(dragEnterSpy.callCount).toEqual(1);
      expect(dragOverSpy.callCount).toEqual(1);
      expect(dragLeaveSpy.callCount).toEqual(1);
    });

    it('should guard dropEffect in onDragOver for IE', function () {
      var dragStartSpy = spy();
      var dragEnterSpy = spy();
      var dragLeaveSpy = spy();
      var component = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
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
      var dragOverSpy = stub(component.instance(), 'onDragOver').callsFake(component.instance().onDragOver(eventProxy));

      component.simulate('dragStart', { dataTransfer: { items: files } });
      component.simulate('dragEnter', { dataTransfer: { items: files } });
      component.simulate('dragOver', { dataTransfer: { items: files } });
      component.simulate('dragLeave', { dataTransfer: { items: files } });
      expect(dragStartSpy.callCount).toEqual(1);
      expect(dragEnterSpy.callCount).toEqual(1);
      expect(dragLeaveSpy.callCount).toEqual(1);
      // It should not throw the error
      expect(dragOverSpy).not.toThrow();
      dragOverSpy.restore();
    });

    it('should set proper dragActive state on dragEnter', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        null,
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      var child = dropzone.find(DummyChildComponent);
      dropzone.simulate('dragEnter', { dataTransfer: { files: files } });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragAccept', true);
      expect(child).toHaveProp('isDragReject', false);
    });

    it('should set proper dragReject state on dragEnter', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        { accept: 'image/*' },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      var child = dropzone.find(DummyChildComponent);
      dropzone.simulate('dragEnter', {
        dataTransfer: { files: files.concat(images) }
      });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragAccept', false);
      expect(child).toHaveProp('isDragReject', true);
    });

    it('should set proper dragAccept state if multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        { accept: 'image/*', multiple: false },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      var child = dropzone.find(DummyChildComponent);
      dropzone.simulate('dragEnter', { dataTransfer: { files: files } });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragAccept', false);
      expect(child).toHaveProp('isDragReject', true);
    });

    it('should set proper dragAccept state if multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        { accept: 'image/*', multiple: false },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      var child = dropzone.find(DummyChildComponent);
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragAccept', true);
      expect(child).toHaveProp('isDragReject', true);
    });

    it('should apply acceptStyle if multiple is false and single file', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        {
          accept: 'image/*',
          multiple: false,
          acceptStyle: acceptStyle,
          rejectStyle: rejectStyle
        },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      dropzone.simulate('dragEnter', { dataTransfer: { files: [images[0]] } });
      var mainDiv = dropzone.find('div').at(0);
      expect(mainDiv).toHaveProp('style', acceptStyle);
    });

    it('should apply rejectStyle if multiple is false and single bad file type', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        {
          accept: 'image/*',
          multiple: false,
          acceptStyle: acceptStyle,
          rejectStyle: rejectStyle
        },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      dropzone.simulate('dragEnter', { dataTransfer: { files: [files[0]] } });
      var mainDiv = dropzone.find('div').at(0);
      expect(mainDiv).toHaveProp('style', rejectStyle);
    });

    it('should apply acceptStyle + rejectStyle if multiple is false and multiple good file types', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        {
          accept: 'image/*',
          multiple: false,
          acceptStyle: acceptStyle,
          rejectStyle: rejectStyle
        },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } });
      var mainDiv = dropzone.find('div').at(0);
      var expectedStyle = _extends({}, acceptStyle, rejectStyle);
      expect(mainDiv).toHaveProp('style', expectedStyle);
    });

    it('should set proper dragActive state if accept prop changes mid-drag', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        { accept: 'image/*' },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      var child = dropzone.find(DummyChildComponent);
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragAccept', true);
      expect(child).toHaveProp('isDragReject', false);

      dropzone.setProps({ accept: 'text/*' });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragAccept', false);
      expect(child).toHaveProp('isDragReject', true);
    });

    it('should expose state to children', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        { accept: 'image/*' },
        function (_ref3) {
          var isDragActive = _ref3.isDragActive,
              isDragAccept = _ref3.isDragAccept,
              isDragReject = _ref3.isDragReject;

          if (isDragReject) {
            return (isDragActive && 'Active but') + ' Reject';
          }
          if (isDragAccept) {
            return (isDragActive && 'Active and') + ' Accept';
          }
          return 'Empty';
        }
      ));
      expect(dropzone.text()).toEqual('Empty');
      dropzone.simulate('dragEnter', { dataTransfer: { files: images } });
      expect(dropzone.text()).toEqual('Active and Accept');
      dropzone.simulate('dragEnter', { dataTransfer: { files: files } });
      expect(dropzone.text()).toEqual('Active but Reject');
    });

    it('should reset the dragAccept/dragReject state when leaving after a child goes away', function () {
      var DragActiveComponent = function DragActiveComponent() {
        return _react2.default.createElement(
          'p',
          null,
          'Accept'
        );
      };
      var ChildComponent = function ChildComponent() {
        return _react2.default.createElement(
          'p',
          null,
          'Child component content'
        );
      };
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        null,
        function (_ref4) {
          var isDragAccept = _ref4.isDragAccept,
              isDragReject = _ref4.isDragReject;

          if (isDragReject) {
            return 'Rejected';
          }
          if (isDragAccept) {
            return _react2.default.createElement(DragActiveComponent, { isDragAccept: isDragAccept, isDragReject: isDragReject });
          }
          return _react2.default.createElement(ChildComponent, { isDragAccept: isDragAccept, isDragReject: isDragReject });
        }
      ));
      var child = dropzone.find(ChildComponent);
      child.simulate('dragEnter', { dataTransfer: { files: files } });
      dropzone.simulate('dragEnter', { dataTransfer: { files: files } });
      // make sure we handle any duplicate dragEnter events that the browser may send us
      dropzone.simulate('dragEnter', { dataTransfer: { files: files } });
      var dragActiveChild = dropzone.find(DragActiveComponent);
      expect(dragActiveChild).toBePresent();
      expect(dragActiveChild).toHaveProp('isDragAccept', true);
      expect(dragActiveChild).toHaveProp('isDragReject', false);

      dropzone.simulate('dragLeave', { dataTransfer: { files: files } });
      expect(dropzone.find(DragActiveComponent)).toBeEmpty();
      expect(child).toHaveProp('isDragAccept', false);
      expect(child).toHaveProp('isDragReject', false);
    });
  });

  describe('onDrop', function () {
    var dropSpy = void 0;
    var dropAcceptedSpy = void 0;
    var dropRejectedSpy = void 0;

    beforeEach(function () {
      dropSpy = spy();
      dropAcceptedSpy = spy();
      dropRejectedSpy = spy();
    });

    afterEach(function () {
      dropSpy.reset();
      dropAcceptedSpy.reset();
      dropRejectedSpy.reset();
    });

    it('should reset the dragActive/dragReject state', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(
        Dropzone,
        {
          onDrop: dropSpy,
          onDropAccepted: dropAcceptedSpy,
          onDropRejected: dropRejectedSpy
        },
        function (props) {
          return _react2.default.createElement(DummyChildComponent, props);
        }
      ));
      var child = dropzone.find(DummyChildComponent);
      dropzone.simulate('dragEnter', { dataTransfer: { files: files } });
      expect(child).toHaveProp('isDragActive', true);
      expect(child).toHaveProp('isDragReject', false);
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(child).toHaveProp('isDragActive', false);
      expect(child).toHaveProp('isDragReject', false);
    });

    it('should add valid files to rejected files on a multple drop when multiple false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { accept: 'image/*', onDrop: dropSpy, multiple: false }));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      var rejected = dropSpy.firstCall.args[0];
      expect(rejected.length).toEqual(1);
    });

    it('should add invalid files to rejected when multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { accept: 'image/*', onDrop: dropSpy, multiple: false }));
      dropzone.simulate('drop', {
        dataTransfer: { files: images.concat(files) }
      });
      var rejected = dropSpy.firstCall.args[1];
      expect(rejected.length).toEqual(2);
    });

    it('should allow single files to be dropped if multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { accept: 'image/*', onDrop: dropSpy, multiple: false }));

      dropzone.simulate('drop', { dataTransfer: { files: [images[0]] } });

      var _dropSpy$firstCall$ar = _slicedToArray(dropSpy.firstCall.args, 2),
          accepted = _dropSpy$firstCall$ar[0],
          rejected = _dropSpy$firstCall$ar[1];

      expect(accepted.length).toEqual(1);
      expect(rejected.length).toEqual(0);
    });

    it('should take all dropped files if multiple is true', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { onDrop: dropSpy, multiple: true }));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropSpy.firstCall.args[0][0].name).toEqual(images[0].name);
      expect(dropSpy.firstCall.args[0][1].name).toEqual(images[1].name);
    });

    it('should set this.isFileDialogActive to false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, null));
      dropzone.instance().isFileDialogActive = true;
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropzone.instance().isFileDialogActive).toEqual(false);
    });

    it('should always call onDrop callback with accepted and rejected arguments', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toEqual([], [].concat(_toConsumableArray(files)));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropSpy.callCount).toEqual(2);
      expect(dropSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)), []);
      dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      });
      expect(dropSpy.callCount).toEqual(3);
      expect(dropSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)), [].concat(_toConsumableArray(files)));
    });

    it('should call onDropAccepted callback if some files were accepted', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropAcceptedSpy.callCount).toEqual(0);
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)));
      dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      });
      expect(dropAcceptedSpy.callCount).toEqual(2);
      expect(dropAcceptedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(images)));
    });

    it('should call onDropRejected callback if some files were rejected', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(files)));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropRejectedSpy.callCount).toEqual(1);
      dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      });
      expect(dropRejectedSpy.callCount).toEqual(2);
      expect(dropRejectedSpy.lastCall.args[0]).toEqual([].concat(_toConsumableArray(files)));
    });

    it('applies the accept prop to the dropped files', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(0);
      expect(dropSpy.firstCall.args[1]).toHaveLength(1);
      expect(dropAcceptedSpy.callCount).toEqual(0);
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.firstCall.args[0]).toHaveLength(1);
    });

    it('applies the accept prop to the dropped images', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        accept: 'image/*'
      }));

      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('accepts a dropped image when Firefox provides a bogus file type', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
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

      dropzone.simulate('drop', { dataTransfer: { files: bogusImages } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('accepts all dropped files and images when no accept prop is specified', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy
      }));
      dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
      });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(3);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(3);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('applies the maxSize prop to the dropped files', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        maxSize: 1111
      }));

      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(1);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('applies the maxSize prop to the dropped images', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        maxSize: 1111
      }));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(0);
      expect(dropSpy.firstCall.args[1]).toHaveLength(2);
      expect(dropAcceptedSpy.callCount).toEqual(0);
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.firstCall.args[0]).toHaveLength(2);
    });

    it('applies the minSize prop to the dropped files', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        minSize: 1112
      }));
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(0);
      expect(dropSpy.firstCall.args[1]).toHaveLength(1);
      expect(dropAcceptedSpy.callCount).toEqual(0);
      expect(dropRejectedSpy.callCount).toEqual(1);
      expect(dropRejectedSpy.firstCall.args[0]).toHaveLength(1);
    });

    it('applies the minSize prop to the dropped images', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy,
        minSize: 1112
      }));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(dropSpy.callCount).toEqual(1);
      expect(dropSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropSpy.firstCall.args[1]).toHaveLength(0);
      expect(dropAcceptedSpy.callCount).toEqual(1);
      expect(dropAcceptedSpy.firstCall.args[0]).toHaveLength(2);
      expect(dropRejectedSpy.callCount).toEqual(0);
    });

    it('accepts all dropped files and images when no size prop is specified', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, {
        onDrop: dropSpy,
        onDropAccepted: dropAcceptedSpy,
        onDropRejected: dropRejectedSpy
      }));
      dropzone.simulate('drop', {
        dataTransfer: { files: files.concat(images) }
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
      var dropSpy = spy();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { onDrop: dropSpy }));
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(Object.keys(dropSpy.firstCall.args[0][0])).toContain('preview');
      expect(dropSpy.firstCall.args[0][0].preview).toContain('data://file1.pdf');
    });

    it('should generate previews for images', function () {
      var dropSpy = spy();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { onDrop: dropSpy }));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      expect(Object.keys(dropSpy.firstCall.args[0][0])).toContain('preview');
      expect(dropSpy.firstCall.args[0][0].preview).toContain('data://cats.gif');
    });

    it('should not throw error when preview cannot be created', function () {
      var dropSpy = spy();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { onDrop: dropSpy }));

      dropzone.simulate('drop', { dataTransfer: { files: ['bad_val'] } });

      expect(Object.keys(dropSpy.firstCall.args[1][0])).not.toContain('preview');
    });

    it('should not generate previews if disablePreview is true', function () {
      var dropSpy = spy();
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { disablePreview: true, onDrop: dropSpy }));
      dropzone.simulate('drop', { dataTransfer: { files: images } });
      dropzone.simulate('drop', { dataTransfer: { files: files } });
      expect(dropSpy.callCount).toEqual(2);
      expect(Object.keys(dropSpy.firstCall.args[0][0])).not.toContain('preview');
      expect(Object.keys(dropSpy.lastCall.args[0][0])).not.toContain('preview');
    });
  });

  describe('onClick', function () {});

  describe('onCancel', function () {
    it('should not invoke onFileDialogCancel everytime window receives focus', function (done) {
      var onCancelSpy = spy();
      (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { id: 'on-cancel-example', onFileDialogCancel: onCancelSpy }));
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
      var onCancelSpy = spy();
      var component = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { className: 'dropzone-content', onFileDialogCancel: onCancelSpy }));

      // Test / invoke the click event
      spy(component.instance(), 'open');
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

  describe('nested Dropzone component behavior', function () {
    var outerDropzone = void 0;
    var innerDropzone = void 0;
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
    var InnerDropzone = function InnerDropzone() {
      return _react2.default.createElement(
        Dropzone,
        {
          onDrop: innerDropSpy,
          onDropAccepted: innerDropAcceptedSpy,
          onDropRejected: innerDropRejectedSpy,
          accept: 'image/*'
        },
        function (_ref5) {
          var isDragActive = _ref5.isDragActive,
              isDragReject = _ref5.isDragReject;

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
        outerDropSpy = spy();
        outerDropAcceptedSpy = spy();
        outerDropRejectedSpy = spy();
        innerDropSpy = spy();
        innerDropAcceptedSpy = spy();
        innerDropRejectedSpy = spy();
        outerDropzone = (0, _enzyme.mount)(_react2.default.createElement(
          Dropzone,
          {
            onDrop: outerDropSpy,
            onDropAccepted: outerDropAcceptedSpy,
            onDropRejected: outerDropRejectedSpy,
            accept: 'image/*'
          },
          function (props) {
            return _react2.default.createElement(InnerDropzone, props);
          }
        ));
        innerDropzone = outerDropzone.find(InnerDropzone);
      });

      it('does dragEnter on both dropzones', function () {
        innerDropzone.simulate('dragEnter', {
          dataTransfer: { files: images }
        });
        expect(innerDropzone).toHaveProp('isDragActive', true);
        expect(innerDropzone).toHaveProp('isDragReject', false);
        expect(innerDropzone.find(InnerDragAccepted).exists()).toEqual(true);
        expect(innerDropzone.find(InnerDragRejected).exists()).toEqual(false);
      });

      it('drops on the child dropzone', function () {
        innerDropzone.simulate('drop', {
          dataTransfer: { files: files.concat(images) }
        });
      });

      it('accepts the drop on the inner dropzone', function () {
        expect(innerDropSpy.callCount).toEqual(1);
        expect(innerDropSpy.firstCall.args[0]).toHaveLength(2);
        expect(innerDropSpy.firstCall.args[1]).toHaveLength(1);
        expect(innerDropAcceptedSpy.callCount).toEqual(1);
        expect(innerDropAcceptedSpy.firstCall.args[0]).toHaveLength(2);
        expect(innerDropRejectedSpy.callCount).toEqual(1);
        expect(innerDropRejectedSpy.firstCall.args[0]).toHaveLength(1);
        expect(innerDropzone.find(InnerDragAccepted).exists()).toEqual(false);
        expect(innerDropzone.find(InnerDragRejected).exists()).toEqual(false);
      });

      it('also accepts the drop on the outer dropzone', function () {
        expect(outerDropSpy.callCount).toEqual(1);
        expect(outerDropSpy.firstCall.args[0]).toHaveLength(2);
        expect(outerDropSpy.firstCall.args[1]).toHaveLength(1);
        expect(outerDropAcceptedSpy.callCount).toEqual(1);
        expect(outerDropAcceptedSpy.firstCall.args[0]).toHaveLength(2);
        expect(outerDropRejectedSpy.callCount).toEqual(1);
        expect(outerDropRejectedSpy.firstCall.args[0]).toHaveLength(1);
        expect(innerDropzone).toHaveProp('isDragActive', false);
        expect(innerDropzone).toHaveProp('isDragReject', false);
      });
    });
  });

  describe('behavior', function () {
    it('does not throw an error when html is dropped instead of files and multiple is false', function () {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { multiple: false }));

      var fn = function fn() {
        return dropzone.simulate('drop', { dataTransfer: { files: [] } });
      };
      expect(fn).not.toThrow();
    });

    it('does not allow actions when disabled props is true', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { disabled: true }));

      spy(dropzone.instance(), 'open');
      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(0);
        done();
      }, 0);
    });

    it('when toggle disabled props, Dropzone works as expected', function (done) {
      var dropzone = (0, _enzyme.mount)(_react2.default.createElement(Dropzone, { disabled: true }));
      spy(dropzone.instance(), 'open');

      dropzone.setProps({ disabled: false });

      dropzone.simulate('click');
      setTimeout(function () {
        expect(dropzone.instance().open.callCount).toEqual(1);
        done();
      }, 0);
    });
  });
});