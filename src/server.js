const express = require("express");
const commentsRoutes = require("./routes/comment.js");
const db = require("./db");
const cors = require("cors");
const dotenv = require("dotenv");
const { swaggerDocs } = require("./utils/swagger");

if (process.env.NODE_ENV !== "Production") {
  dotenv.config();
}
const PORT = process.env.PORT || 8002;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:8000",
      "http://192.168.0.162:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/v1", commentsRoutes);

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// retry connection in case of failure

let retryCount = 0,
  maxRetry = 5; // retry only five times

// db connection and server kick off.
const connectWithRetry = () =>
  db()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        swaggerDocs(app, PORT);
        retryCount = 0;
      });
    })
    .catch((err) => {
      console.log("failed to connect", err);
      if (retryCount < maxRetry) {
        retryCount++;
        console.log("retrying db connection ......");
        console.log(`${retryCount} of ${maxRetry} retries`);
        setTimeout(connectWithRetry, 5000);
      }
    });

connectWithRetry(); // start
