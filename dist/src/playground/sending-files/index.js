"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var path_1 = require("path");
var FileRouting = function (app) {
    var fileRouter = express_1.default.Router();
    fileRouter.get('/', function (req, res) {
        res.sendFile((0, path_1.join)(__dirname, 'me-rapper.webp'));
    });
    app.use('/files/playground', fileRouter);
};
exports.default = FileRouting;
