'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BaseAccessory = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _hapNodejs = require('homebridge/node_modules/hap-nodejs');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseAccessory = function (_Accessory) {
    _inherits(BaseAccessory, _Accessory);

    function BaseAccessory(log, name, partitionNumber, zoneNumber) {
        _classCallCheck(this, BaseAccessory);

        var id = `envisalink.${partitionNumber}`;
        if (zoneNumber) {
            id += `.${zoneNumber}`;
        }
        var uuid_base = _hapNodejs.uuid.generate(id);

        var _this = _possibleConstructorReturn(this, (BaseAccessory.__proto__ || Object.getPrototypeOf(BaseAccessory)).call(this, name, uuid_base));

        _this.Service = _hapNodejs.Service;
        _this.Characteristic = _hapNodejs.Characteristic;
        _this.Accessory = _hapNodejs.Accessory;

        _this.uuid_base = uuid_base;
        _this.log = log;
        _this.name = name;
        _this.partitionNumber = partitionNumber;
        _this.zoneNumber = zoneNumber;

        _this.services = [];
        return _this;
    }

    _createClass(BaseAccessory, [{
        key: 'getServices',
        value: function getServices() {
            return this.services;
        }
    }]);

    return BaseAccessory;
}(_hapNodejs.Accessory);

exports.BaseAccessory = BaseAccessory;