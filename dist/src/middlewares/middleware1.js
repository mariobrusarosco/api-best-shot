"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var middleware1 = function (_, __, next) {
    console.log('Tá indo: #1');
    next();
    console.log('Tá voltando #1');
};
exports.default = middleware1;
