"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMapper = exports.TOURNAMENT_API_ERRORS = void 0;
var TOURNAMENT_API_ERRORS;
(function (TOURNAMENT_API_ERRORS) {
    TOURNAMENT_API_ERRORS["DUPLICATED_LABEL"] = "duplicated_label";
    TOURNAMENT_API_ERRORS["NOT_FOUND"] = "not_found";
})(TOURNAMENT_API_ERRORS = exports.TOURNAMENT_API_ERRORS || (exports.TOURNAMENT_API_ERRORS = {}));
exports.ErrorMapper = {
    DUPLICATED_LABEL: {
        status: 404,
        debug: 'duplicated key: label',
        user: 'This tournament already exists. Please, try another name'
    },
    NOT_FOUND: {
        status: 404,
        debug: 'not found',
        user: 'This tournament does not exists.'
    }
};
