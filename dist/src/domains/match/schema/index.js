"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchSchema = exports.MATCH_COLLECTION_NAME = void 0;
var mongoose_1 = __importDefault(require("mongoose"));
exports.MATCH_COLLECTION_NAME = 'Match';
exports.MatchSchema = new mongoose_1.default.Schema({
    host: {
        type: String,
        require: true
    },
    visitor: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
    },
    tournamentId: {
        type: String,
        require: true
    },
    stadium: {
        type: String,
        require: true
    }
});
exports.default = mongoose_1.default.model(exports.MATCH_COLLECTION_NAME, exports.MatchSchema);
