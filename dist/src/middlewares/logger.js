"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logger = function (req, res, next) {
    console.log('[logger]', req.url);
    next();
};
exports.default = logger;
