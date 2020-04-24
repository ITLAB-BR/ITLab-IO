"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _stream = require("stream");

var _util = require("util");

var _cpx = _interopRequireDefault(require("cpx"));

var _ejs = _interopRequireDefault(require("ejs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const _copy = (0, _util.promisify)(_cpx.default.copy);

class EJSTransformer extends _stream.Transform {
  constructor(filePath, settings) {
    super();

    _ejs.default.renderFile(filePath, settings, (err, str) => {
      if (!err) this.write(str);
      this.end();
    });
  }

  _transform(data, encoding, callback) {
    this.push(data);
    callback();
  }

}

var _default = {
  copyStatic: async (glob, dest) => {
    await _copy(glob, dest, {
      includeEmptyDirs: true
    });
  },
  transformAndCopy: async (glob, dest, data) => {
    await _copy(glob, dest, {
      transform: filePath => {
        return new EJSTransformer(filePath, data);
      }
    });
  },
  capitalize: v => {
    return v.replace(/([^A-Za-z]|^)([a-z])(?=[a-z]{1})/g, function (_, g1, g2) {
      return g1 + g2.toUpperCase();
    }).replace(/\s/g, '.').replace(/\.+/g, '.').trim();
  }
};
exports.default = _default;