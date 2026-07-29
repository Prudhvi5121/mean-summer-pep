const express = require("express");
const userRouter = express.Router();
const {
    userHome
} = require("../controller/user.controller");



userRouter.get("/home", userHome);
<<<<<<< HEAD
// userRouter.post("/image". )
=======
>>>>>>> dafe4ad1856ebab7f58cff96bf849a8adda98607

module.exports = userRouter;