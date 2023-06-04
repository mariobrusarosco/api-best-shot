"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var match_controller_1 = __importDefault(require("../controllers/match-controller"));
var MatchRouting = function (app) {
    var mactchRouter = express_1.default.Router();
    mactchRouter.get('/:matchId', match_controller_1.default.getMatch);
    mactchRouter.patch('/:matchId', match_controller_1.default.updateMatch);
    mactchRouter.post('/', match_controller_1.default.createMatch);
    app.use("".concat(process.env.API_VERSION, "/match"), mactchRouter);
};
exports.default = MatchRouting;
