'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MagicDropzone = function (_Component) {
  _inherits(MagicDropzone, _Component);

  function MagicDropzone() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, MagicDropzone);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = MagicDropzone.__proto__ || Object.getPrototypeOf(MagicDropzone)).call.apply(_ref, [this].concat(args))), _this), _this.isFileDialogActive = false, _this.composeHandlers = function (handler) {
      var disabled = _this.props.disabled;

      if (disabled) {
        return null;
      }
      return handler;
    }, _this.onDocumentDrop = function (e) {
      if (_this.node && _this.node.contains(e.target)) {
        // if we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
        return;
      }
      e.preventDefault();
      _this.dragTargets = [];
    }, _this.onDragStart = function (e) {
      var onDragStart = _this.props.onDragStart;

      if (onDragStart) {
        onDragStart.call(_this, e);
      }
    }, _this.onDragEnter = function (e) {
      var onDragEnter = _this.props.onDragEnter;

      e.preventDefault();

      // Count the dropzone and any children that are entered.
      if (_this.dragTargets.indexOf(e.target) === -1) {
        _this.dragTargets.push(e.target);
      }

      var draggedFiles = (0, _utils.getDataTransferItems)(e);

      if (onDragEnter) {
        onDragEnter.call(_this, e);
      }
    }, _this.onDragOver = function (e) {
      var onDragOver = _this.props.onDragOver;

      e.preventDefault();
      e.stopPropagation();
      try {
        e.dataTransfer.dropEffect = 'copy';
      } catch (err) {
        // continue regardless of error
      }

      if (onDragOver) {
        onDragOver.call(_this, e);
      }
      return false;
    }, _this.onDragLeave = function (e) {
      var onDragLeave = _this.props.onDragLeave;

      e.preventDefault();

      // Only deactivate once the dropzone and all children have been left.
      _this.dragTargets = _this.dragTargets.filter(function (element) {
        return element !== e.target && _this.node.contains(element);
      });
      if (_this.dragTargets.length > 0) {
        return;
      }

      if (onDragLeave) {
        onDragLeave.call(_this, e);
      }
    }, _this.onDrop = function (e) {
      var _this$props = _this.props,
          onDrop = _this$props.onDrop,
          onDropAccepted = _this$props.onDropAccepted,
          onDropRejected = _this$props.onDropRejected,
          multiple = _this$props.multiple,
          disablePreview = _this$props.disablePreview,
          minSize = _this$props.minSize,
          maxSize = _this$props.maxSize,
          accept = _this$props.accept;

      var fileList = (0, _utils.getDataTransferItems)(e);
      var acceptedFiles = [];
      var rejectedFiles = [];

      // Stop default browser behavior
      e.preventDefault();

      // If there aren't any files, it might be a link.
      if (fileList.length === 0) {
        _this.onLink(e);
        return;
      }

      // Reset the counter along with the drag on a drop.
      _this.dragTargets = [];
      _this.isFileDialogActive = false;

      fileList.forEach(function (file) {
        if (!disablePreview) {
          try {
            file.preview = window.URL.createObjectURL(file);
          } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              // console.error('Failed to generate preview for file', file, err)
            }
          }
        }

        if ((0, _utils.fileAccepted)(file, accept) && (0, _utils.fileMatchSize)(file, maxSize, minSize)) {
          acceptedFiles.push(file);
        } else {
          rejectedFiles.push(file);
        }
      });

      if (!multiple) {
        // if not in multi mode add any extra accepted files to rejected.
        // This will allow end users to easily ignore a multi file drop in "single" mode.
        rejectedFiles.push.apply(rejectedFiles, _toConsumableArray(acceptedFiles.splice(1)));
      }

      if (onDrop) {
        onDrop.call(_this, acceptedFiles, rejectedFiles, [], e);
      }

      if (rejectedFiles.length > 0 && onDropRejected) {
        onDropRejected.call(_this, rejectedFiles, e);
      }

      if (acceptedFiles.length > 0 && onDropAccepted) {
        onDropAccepted.call(_this, acceptedFiles, e);
      }
    }, _this.onClick = function (e) {
      var _this$props2 = _this.props,
          onClick = _this$props2.onClick,
          disableClick = _this$props2.disableClick;

      if (!disableClick) {
        e.stopPropagation();

        if (onClick) {
          onClick.call(_this, e);
        }

        // in IE11/Edge the file-browser dialog is blocking, ensure this is behind setTimeout
        // this is so react can handle state changes in the onClick prop above above
        // see: https://github.com/react-dropzone/react-dropzone/issues/450
        setTimeout(_this.open.bind(_this), 0);
      }
    }, _this.onInputElementClick = function (e) {
      var inputProps = _this.props.inputProps;

      e.stopPropagation();
      if (inputProps && inputProps.onClick) {
        inputProps.onClick();
      }
    }, _this.onFileDialogCancel = function () {
      // timeout will not recognize context of this method
      var onFileDialogCancel = _this.props.onFileDialogCancel;
      var _this2 = _this,
          fileInputEl = _this2.fileInputEl;
      var _this3 = _this,
          isFileDialogActive = _this3.isFileDialogActive;
      // execute the timeout only if the onFileDialogCancel is defined and FileDialog
      // is opened in the browser

      if (onFileDialogCancel && isFileDialogActive) {
        setTimeout(function () {
          // Returns an object as FileList
          var FileList = fileInputEl.files;
          if (!FileList.length) {
            isFileDialogActive = false;
            onFileDialogCancel();
          }
        }, 300);
      }
    }, _this.setRef = function (ref) {
      _this.node = ref;
    }, _this.setRefs = function (ref) {
      _this.fileInputEl = ref;
    }, _this.onLink = function (e) {
      var _this$props3 = _this.props,
          onDrop = _this$props3.onDrop,
          accept = _this$props3.accept;


      if (!accept) {
        if (onDrop) {
          onDrop([], [], [], e);
        }
        return;
      }

      var extensionReg = /(\.[^.]+)(?=[,]|$)/gi;

      var extensions = accept.match(extensionReg);

      if (!extensions) {
        if (onDrop) {
          onDrop([], [], [], e);
        }
        return;
      }

      var replace = '(https://|http://)((?!http).)*(' + extensions.join('|') + ')';
      var urlReg = new RegExp(replace, 'gi');

      var links = [];
      if (e.dataTransfer) {
        var uriLink = decodeURIComponent(e.dataTransfer.getData('text/uri-list')).match(urlReg);

        var htmlLink = e.dataTransfer.getData('text/html').match(urlReg);

        // Have priority of the actual uri.
        if (uriLink) {
          links = [].concat(_toConsumableArray(uriLink));
        } else if (htmlLink) {
          links = [].concat(_toConsumableArray(htmlLink.filter(function (l) {
            return l.indexOf('"') === -1;
          }).map(function (v) {
            return decodeURIComponent(v);
          })));
        }
      } else {
        // Not sure when this will ever be the case?
        links = [].concat(_toConsumableArray(decodeURIComponent(e.target.value).match(urlReg)));
      }

      if (onDrop) {
        onDrop([], [], links, e);
      }
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(MagicDropzone, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var preventDropOnDocument = this.props.preventDropOnDocument;

      this.dragTargets = [];

      if (preventDropOnDocument) {
        document.addEventListener('dragover', _utils.onDocumentDragOver, false);
        document.addEventListener('drop', this.onDocumentDrop, false);
      }
      this.fileInputEl.addEventListener('click', this.onInputElementClick, false);
      // Tried implementing addEventListener, but didn't work out
      document.body.onfocus = this.onFileDialogCancel;
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      var preventDropOnDocument = this.props.preventDropOnDocument;

      if (preventDropOnDocument) {
        document.removeEventListener('dragover', _utils.onDocumentDragOver);
        document.removeEventListener('drop', this.onDocumentDrop);
      }
      this.fileInputEl.removeEventListener('click', this.onInputElementClick, false);
      // Can be replaced with removeEventListener, if addEventListener works
      document.body.onfocus = null;
    }

    // After much internal debate I decided to not distinguish that the files will
    // be accepted. It is not widely supported and we only get mime-type info back
    // Also, users won't be able to react fast enough to do anything if the
    // overlay says WAIT THAT FILE ISN'T GOING TO WORK

  }, {
    key: 'open',


    /**
     * Open system file upload dialog.
     *
     * @public
     */
    value: function open() {
      this.isFileDialogActive = true;
      this.fileInputEl.value = null;
      this.fileInputEl.click();
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          accept = _props.accept,
          children = _props.children,
          disabled = _props.disabled,
          multiple = _props.multiple,
          possibleUnused = _objectWithoutProperties(_props, ['accept', 'children', 'disabled', 'multiple']);

      var preventDropOnDocument = possibleUnused.preventDropOnDocument,
          disablePreview = possibleUnused.disablePreview,
          disableClick = possibleUnused.disableClick,
          maxSize = possibleUnused.maxSize,
          minSize = possibleUnused.minSize,
          inputProps = possibleUnused.inputProps,
          onDropAccepted = possibleUnused.onDropAccepted,
          onDropRejected = possibleUnused.onDropRejected,
          onFileDialogCancel = possibleUnused.onFileDialogCancel,
          restOfProps = _objectWithoutProperties(possibleUnused, ['preventDropOnDocument', 'disablePreview', 'disableClick', 'maxSize', 'minSize', 'inputProps', 'onDropAccepted', 'onDropRejected', 'onFileDialogCancel']);

      return _react2.default.createElement(
        'div',
        _extends({}, restOfProps, {
          onClick: this.composeHandlers(this.onClick),
          onDragStart: this.composeHandlers(this.onDragStart),
          onDragEnter: this.composeHandlers(this.onDragEnter),
          onDragOver: this.composeHandlers(this.onDragOver),
          onDragLeave: this.composeHandlers(this.onDragLeave),
          onDrop: this.composeHandlers(this.onDrop),
          ref: this.setRef,
          'aria-disabled': disabled
        }),
        children,
        _react2.default.createElement('input', {
          disabled: disabled,
          accept: accept,
          type: 'file',
          style: { display: 'none' },
          multiple: _utils.supportMultiple && multiple,
          ref: this.setRefs,
          onChange: this.onDrop,
          autoComplete: 'off'
        })
      );
    }
  }]);

  return MagicDropzone;
}(_react.Component);

MagicDropzone.defaultProps = {
  preventDropOnDocument: true,
  disabled: false,
  disablePreview: false,
  disableClick: false,
  multiple: true,
  maxSize: Infinity,
  minSize: 0
};

exports.default = MagicDropzone;