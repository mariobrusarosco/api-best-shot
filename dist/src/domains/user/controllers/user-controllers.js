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
var schema_1 = __importDefault(require("../schema"));
function getAllUsers(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var allLeagues, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, schema_1.default.find({}, {
                            __v: 0
                        })];
                case 1:
                    allLeagues = _a.sent();
                    return [2 /*return*/, res.status(200).send(allLeagues)];
                case 2:
                    error_1 = _a.sent();
                    // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
                    return [2 /*return*/, res
                            .status(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
                            .send(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.user)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createUser(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var body, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    body = req === null || req === void 0 ? void 0 : req.body;
                    if (!body.email) {
                        return [2 /*return*/, res.status(400).send('You must provide an email to update a league')];
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
                    error_2 = _a.sent();
                    if ((error_2 === null || error_2 === void 0 ? void 0 : error_2.value) === 'NULL') {
                        return [2 /*return*/, res.status(404).send('user not found. fix the mapper dude')];
                    }
                    else {
                        console.error(error_2);
                        // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
                        res
                            .status(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
                            .send(mapper_1.GlobalErrorMapper.BIG_FIVE_HUNDRED.user);
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var UserController = {
    getAllUsers: getAllUsers,
    createUser: createUser
};
exports.default = UserController;
