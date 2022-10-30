"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var tournament_controllers_1 = __importDefault(require("../controllers/tournament-controllers"));
var TournamentRouting = function (app) {
    var tournamentRouter = express_1.default.Router();
    tournamentRouter.post('/', tournament_controllers_1.default.createTournament);
    tournamentRouter.get('/', tournament_controllers_1.default.getAllTournaments);
    tournamentRouter.get('/:tournamentId', tournament_controllers_1.default.getTournament);
    tournamentRouter.get('/:tournamentId/matches', tournament_controllers_1.default.getTournamentMatches);
    app.use("".concat(process.env.API_V1_VERSION, "/tournament"), tournamentRouter);
};
exports.default = TournamentRouting;
