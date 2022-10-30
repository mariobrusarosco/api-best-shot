"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var TemplateEngines = function (app) {
    app.set('view engine', 'hbs');
    app.set('views', path_1.default.join(__dirname, 'views'));
    app.get('/', function (req, res) {
        res.render('index', { userName: 'Mario', title: 'Index' });
    });
    app.get('/articles', function (req, res) {
        res.render('articles', { placeholder: 'Lorem Ipsum', title: 'Articles' });
    });
};
exports.default = TemplateEngines;
