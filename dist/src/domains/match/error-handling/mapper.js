"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMapper = exports.MATCH_API_ERRORS = void 0;
var MATCH_API_ERRORS;
(function (MATCH_API_ERRORS) {
    MATCH_API_ERRORS["NOT_FOUND"] = "not_found";
})(MATCH_API_ERRORS = exports.MATCH_API_ERRORS || (exports.MATCH_API_ERRORS = {}));
exports.ErrorMapper = {
    NOT_FOUND: {
        status: 404,
        debug: 'not found',
        user: 'We could not find this match.'
    }
};
