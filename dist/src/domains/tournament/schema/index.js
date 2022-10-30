"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentSchema = exports.TOURNAMENT_COLLECTION_NAME = void 0;
var mongoose_1 = require("mongoose");
exports.TOURNAMENT_COLLECTION_NAME = 'Tournament';
exports.TournamentSchema = new mongoose_1.Schema({
    label: {
        type: String,
        require: true,
        unique: true,
        dropDups: true
    },
    description: {
        type: String,
        required: true
    },
    flag: {
        type: String,
        default: 'https://www.my-flag.com/unknown'
    }
});
exports.default = (0, mongoose_1.model)(exports.TOURNAMENT_COLLECTION_NAME, exports.TournamentSchema);
