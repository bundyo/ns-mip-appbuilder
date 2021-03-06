"use strict";
var bluetooth = require("nativescript-bluetooth");
var codes_1 = require("./codes");
var mip_types_1 = require("./mip-types");
var MipStatusReader = (function () {
    function MipStatusReader(UUID) {
        this.UUID = "B4:99:4C:48:14:24";
        this.UUID = UUID;
        this.listeners = {};
    }
    /**
     * Takes the instruction code and required parameters and issues a bluetooth command.
     * This version doesn't wait for the response, therefore is eqiuiped to handle more commands per second
     * @param instructionCode Instruction code from the list of codes. See codes.ts
     * @param params a collection of parameters required for the given function
     */
    MipStatusReader.prototype.executeInstructionFast = function (instructionCode, params) {
        if (params === void 0) { params = []; }
        //Parse instruction parameters -> convert each value into a hex string and then concatenate them to a comma separated string
        var instructionParams = params.map(function (param) {
            return convertToHexString(param);
        }).join(",");
        //Prepare a bluetooth message using the connected device UUID, instruction code and instruction parameters
        var bluetoothMessage = {
            peripheralUUID: this.UUID,
            serviceUUID: 'ffe5',
            characteristicUUID: 'ffe9',
            value: instructionCode + "," + instructionParams
        };
        //Send the call via bluetooth
        bluetooth.writeWithoutResponse(bluetoothMessage);
    };
    MipStatusReader.prototype.notify = function () {
        var _this = this;
        return bluetooth.startNotifying({
            peripheralUUID: this.UUID,
            serviceUUID: 'ffe0',
            characteristicUUID: 'ffe4',
            onNotify: function (codedMessage) {
                var data = new Uint8Array(codedMessage.value);
                //The result is made of ASCII codes
                //If we convert all the ASCII codes and turn them into a string, then we will get a string with the values in HEX
                // First we need to extract the instruction code that issued this update notification
                // The code is made of the first two characters
                var instructionCalled = convertAsciiToHexNumber(data[0], data[1]);
                // Now convert the rest of the data, again each data value is made of a pair of ASCII characters
                var res = [];
                for (var i = 2; i < data.length; i += 2) {
                    var val = convertAsciiToHexNumber(data[i], data[i + 1]);
                    res.push(val);
                }
                // Finally trigger promise waiting for the data published in this notification
                // However ignore it there are no listeners waiting for the result
                if (_this.listeners[instructionCalled]) {
                    _this.listeners[instructionCalled](res);
                    _this.listeners[instructionCalled] = null;
                }
            }
        });
    };
    MipStatusReader.prototype.requestData = function (instructionCode) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.listeners[parseInt(instructionCode)] = resolve;
            _this.executeInstructionFast(instructionCode);
        });
    };
    MipStatusReader.prototype.getGameMode = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.GetGameMode)
                .then(function (res) {
                resolve(res[0]);
            });
        });
    };
    MipStatusReader.prototype.getMipStatus = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.RequestStatus)
                .then(function (res) {
                var status = new mip_types_1.Status(res[0], res[1]);
                resolve(status);
            });
        });
    };
    MipStatusReader.prototype.requestWeightUpdate = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.RequestWeightUpdate)
                .then(function (res) {
                var status = new mip_types_1.WeightStatus(res[0]);
                resolve(status);
            });
        });
    };
    MipStatusReader.prototype.requestChestLEDInfo = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.RequestChestLED)
                .then(function (res) {
                var chestLedInfo = new mip_types_1.ChestLedInfo(res[0], res[1], res[2]);
                resolve(chestLedInfo);
            });
        });
    };
    /**
     * Gets the current status of the head LEDs
     */
    MipStatusReader.prototype.requestHeadLEDInfo = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.RequestChestLED)
                .then(function (res) {
                var chestLedInfo = new mip_types_1.HeadLedInfo(res[0], res[1], res[2], res[3]);
                resolve(chestLedInfo);
            });
        });
    };
    /**
     * Gets the total distance travelled (in cm) in the current power cycle
     */
    MipStatusReader.prototype.getOdometer = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.ReadOdometer)
                .then(function (res) {
                //BYTE 1 & 2 & 3 & 4 : Distance ((0~4294967296)/48.5) cm
                //First merge all 4 bytes
                // BYTE 1 & 2 & 3 & 4 :Byte1 is highest byte
                var allBytes = res[0] * Math.pow(0x100, 3)
                    + res[1] * Math.pow(0x100, 2)
                    + res[2] * 0x100
                    + res[3];
                // Then convert the value to cm
                // 1cm=48.5, 0xFFFFFFFF=4294967295=88556026.7cm
                var distance = Math.round(allBytes / 48.5);
                resolve(distance);
            });
        });
    };
    MipStatusReader.prototype.getMipSoftware = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestData(codes_1.codes.GetSoftwareVersion)
                .then(function (res) {
                console.log("SoftwareVersion: " + JSON.stringify(res));
                var softwareVersion = new mip_types_1.SoftwareVersion(res[0], res[1], res[2], res[3]);
                resolve(softwareVersion);
            });
        });
    };
    return MipStatusReader;
}());
exports.MipStatusReader = MipStatusReader;
/**
 * Converts each ASCII code to a corresponding character and then parses that to a Hex based number
 */
function convertAsciiToHexNumber(char1, char2) {
    return parseInt(String.fromCharCode(char1) + String.fromCharCode(char2), 16);
}
function convertToHexString(code) {
    return "0x" + code.toString(16);
}
//# sourceMappingURL=mip-status-reader.js.map