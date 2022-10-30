"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var connect = function () {
    var _a;
    mongoose_1.default
        .connect((_a = process.env.DB_CREDENTIALS) !== null && _a !== void 0 ? _a : '')
        .then(function () {
        console.log('Connected to a mongo DB');
    })
        .catch(function (error) {
        console.error('bad connection', error);
        new Error('Mongo connection error');
    });
};
var close = function () { return mongoose_1.default.disconnect(); };
exports.default = { connect: connect, close: close };
