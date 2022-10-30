"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var middleware2 = function (_, __, next) {
    console.log('Tá indo: #2');
    next();
    console.log('Tá voltando #2');
};
exports.default = middleware2;
