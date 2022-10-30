"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var path_1 = require("path");
var ServingWebsites = function (app) {
    app.use('/site', express_1.default.static((0, path_1.join)(__dirname, 'public')));
};
exports.default = ServingWebsites;
