"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMapper = exports.LEAGUE_API_ERRORS = void 0;
var LEAGUE_API_ERRORS;
(function (LEAGUE_API_ERRORS) {
    LEAGUE_API_ERRORS["DUPLICATED_LABEL"] = "duplicated_label";
    LEAGUE_API_ERRORS["NOT_FOUND"] = "not_found";
})(LEAGUE_API_ERRORS = exports.LEAGUE_API_ERRORS || (exports.LEAGUE_API_ERRORS = {}));
exports.ErrorMapper = {
    DUPLICATED_LABEL: {
        status: 404,
        debug: 'duplicated key: label',
        user: 'This league already exists. Please, try another name'
    },
    NOT_FOUND: {
        status: 404,
        debug: 'not found',
        user: 'This league was not created yet.'
    },
    MISSING_LABEL: {
        status: 404,
        debug: 'missing labeL',
        user: 'You must provide an label in order to update a league.'
    }
};
