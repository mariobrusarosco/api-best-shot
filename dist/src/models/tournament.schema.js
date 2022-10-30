"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tournament = void 0;
var mongoose_1 = __importDefault(require("mongoose"));
var Tournament = new mongoose_1.default.Schema({
    label: {
        type: String,
        require: true
    },
    description: {
        type: String,
        required: true
    },
    flag: String // 'base64://'
});
exports.Tournament = Tournament;
