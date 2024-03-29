"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = exports.USER_COLLECTION_NAME = void 0;
var mongoose_1 = require("mongoose");
// Old schema
// _id
// 62b4d7cba8a6227e9a2ef117
// authTypes
// Object
// emailAndPassword
// Object
// active
// true
// email
// "mariobrusarosco@hotmail.com"
// password
// "$2b$10$HFPtkF6jJCXGUd2TDJjfqOOuQ9b4.TXZt2zvKs6DANGdMVp29mnaW"
// google
// Object
// twitter
// Object
// emailVerified
// false
// lastAccess
// 2022-06-23T21:14:46.822+00:00
// firstname
// "Mario"
// lastname
// "Brusarosco"
// __v
// 0
exports.USER_COLLECTION_NAME = 'User';
exports.UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        require: true,
        unique: true,
        dropDups: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    }
});
exports.default = (0, mongoose_1.model)(exports.USER_COLLECTION_NAME, exports.UserSchema);
