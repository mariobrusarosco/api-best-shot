"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mapper_1 = require("../../shared/error-handling/mapper");
var mapper_2 = require("../error-handling/mapper");
var schema_1 = __importDefault(require("../schema"));
var schema_2 = __importDefault(require("../../match/schema"));
function getTournamentMatches(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var tournamentId, allRelatedMatches, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tournamentId = req === null || req === void 0 ? void 0 : req.params.tournamentId;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, schema_1.default.findOne({ _id: tournamentId }, {
                            __v: 0
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, schema_2.default.find({ tournamentId: tournamentId })];
                case 3:
                    allRelatedMatches = _a.sent();
                    return [2 /*return*/, res.status(200).send(allRelatedMatches)];
                case 4:
                    error_1 = _a.sent();
                    if ((error_1 === null || error_1 === void 0 ? void 0 : error_1.kind) === 'ObjectId') {
                        return [2 /*return*/, res.status(mapper_2.ErrorMapper.NOT_FOUND.status).send(mapper_2.ErrorMapper.NOT_FOUND.user)];
                    }
                    else {
                        console.error(error_1);
                        return [2 /*return*/, res
                                .status(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
                                .send(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.user)];
                    }
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function getAllTournaments(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var allTournaments, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, schema_1.default.find({}, {
                            __v: 0
                        })];
                case 1:
                    allTournaments = _a.sent();
                    return [2 /*return*/, res.status(200).send(allTournaments)];
                case 2:
                    error_2 = _a.sent();
                    if ((error_2 === null || error_2 === void 0 ? void 0 : error_2.kind) === 'ObjectId') {
                        return [2 /*return*/, res.status(mapper_2.ErrorMapper.NOT_FOUND.status).send(mapper_2.ErrorMapper.NOT_FOUND.user)];
                    }
                    else {
                        console.error(error_2);
                        return [2 /*return*/, res
                                .status(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
                                .send(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.user)];
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getTournament(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var tournamentId, tournament, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tournamentId = req === null || req === void 0 ? void 0 : req.params.tournamentId;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, schema_1.default.findOne({ _id: tournamentId }, {
                            __v: 0
                        })];
                case 2:
                    tournament = _a.sent();
                    return [2 /*return*/, res.status(200).send(tournament)];
                case 3:
                    error_3 = _a.sent();
                    if ((error_3 === null || error_3 === void 0 ? void 0 : error_3.kind) === 'ObjectId') {
                        return [2 /*return*/, res.status(mapper_2.ErrorMapper.NOT_FOUND.status).send(mapper_2.ErrorMapper.NOT_FOUND.status)];
                    }
                    else {
                        // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
                        return [2 /*return*/, res
                                .status(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
                                .send(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.user)];
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function createTournament(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var body, result, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    body = req === null || req === void 0 ? void 0 : req.body;
                    if (!body.label) {
                        return [2 /*return*/, res.status(400).json({ message: 'You must provide a label for a tournament' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, schema_1.default.create(__assign({}, body))];
                case 2:
                    result = _a.sent();
                    res.json(result);
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    // log here: ErrorMapper.DUPLICATED_LABEL.debug
                    res.status(mapper_2.ErrorMapper.DUPLICATED_LABEL.status).send(mapper_2.ErrorMapper.DUPLICATED_LABEL);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var TournamentController = {
    getTournament: getTournament,
    getTournamentMatches: getTournamentMatches,
    getAllTournaments: getAllTournaments,
    createTournament: createTournament
};
exports.default = TournamentController;
