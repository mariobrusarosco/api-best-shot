"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var league_controllers_1 = __importDefault(require("../controllers/league-controllers"));
var LeagueRouting = function (app) {
    var leagueRouter = express_1.default.Router();
    leagueRouter.post('/', league_controllers_1.default.createLeague);
    leagueRouter.get('/', league_controllers_1.default.getAllLeagues);
    leagueRouter.get('/:leagueId', league_controllers_1.default.getLeague);
    leagueRouter.patch('/:leagueId', league_controllers_1.default.updateLeague);
    app.use("".concat(process.env.API_VERSION, "/league"), leagueRouter);
};
exports.default = LeagueRouting;
