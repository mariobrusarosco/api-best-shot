"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueSchema = exports.LEAGUE_COLLECTION_NAME = void 0;
var mongoose_1 = __importDefault(require("mongoose"));
exports.LEAGUE_COLLECTION_NAME = 'League';
exports.LeagueSchema = new mongoose_1.default.Schema({
    label: {
        type: String,
        require: true
    },
    description: {
        type: String,
        required: true
    },
    flag: {
        type: String,
        default: 'https://www.my-flag.com/unknown'
    },
    members: {
        type: [String],
        required: true
    },
    admins: {
        type: [String],
        required: true
    },
    tournament: {
        type: String,
        require: true
    }
});
exports.default = mongoose_1.default.model(exports.LEAGUE_COLLECTION_NAME, exports.LeagueSchema);
