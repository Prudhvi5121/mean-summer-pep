const express = require("express");
const fs = require("fs");
require("dotenv").config();
const { arr } = require("./storage/storage");

const app = express();

const authRouter = require("./router/auth.route");
<<<<<<< HEAD
const connectDb = require("./DB/mongo.db");
=======
>>>>>>> dafe4ad1856ebab7f58cff96bf849a8adda98607
const userRouter = require("./router/user.route");
const errorHandler = require("./middlewares/errror.middleware");
const authMiddleware = require("./middlewares/auth.middleware");

// Before AUTH MIDDLEWARE

<<<<<<< HEAD
app.use(express.json());

app.use((req, res, next) => {

  // console.log(arr);
  // if (fs.existsSync("logger.json")) {
  //   fs.appendFileSync("logger.json", `${req.method} ${req.url} ${req.ip}\n`);
  // } else {
  //   fs.readFile("logger.json", "utf8", (err) => {
  //     fs.appendFileSync("logger.json", `${req.method} ${req.url} ${req.ip}\n`);
  //   });
  // }

  console.log(`${req.method} ${req.url} ${req.ip}`);
  next();
});

app.use("/auth/", authRouter);
app.use("/user/", authMiddleware, userRouter);
app.get("/health", (req, res) => {
  res.json({
    status: "success",
    data: "HEALTHY",
  });
})

app.use(errorHandler);

console.log(connectDb)

connectDb()
  .then(() => {
    console.log("DB CONNECTED");
  })
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log(`PORT STARTED ON ${process.env.PORT || 8080}`);
    });
  })
  .catch((err) => {
    console.log(err);
  })
=======


app.use(express.json());

// app.use((req, res, next) => {

//   console.log(arr);
//   if (fs.existsSync("logger.json")) {
//     fs.appendFileSync("logger.json", `${req.method} ${req.url} ${req.ip}\n`);
//   } else {
//     fs.readFile("logger.json", "utf8", (err) => {
//       fs.appendFileSync("logger.json", `${req.method} ${req.url} ${req.ip}\n`);
//     });
//   }

//   console.log(`${req.method} ${req.url} ${req.ip}`);
//   next();
// });

app.use("/auth/", authRouter);
app.use("/user", authMiddleware, userRouter);

app.use(errorHandler);

app.listen(process.env.PORT || 8080, () => {
  console.log(`PORT STARTED ON ${process.env.PORT || 8080}`);
});
>>>>>>> dafe4ad1856ebab7f58cff96bf849a8adda98607
