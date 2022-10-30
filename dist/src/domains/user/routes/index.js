"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var user_controllers_1 = __importDefault(require("../controllers/user-controllers"));
var UserRouting = function (app) {
    var userRouter = express_1.default.Router();
    userRouter.get('/', user_controllers_1.default.getAllUsers);
    userRouter.post('/', user_controllers_1.default.createUser);
    app.use("".concat(process.env.API_V1_VERSION, "/user"), userRouter);
};
exports.default = UserRouting;
