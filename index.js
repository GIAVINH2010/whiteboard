const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    // methods: ["GET", "POST"],
  },
});
const path = require("path");
let canvasData;

app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
  // res.sendFile(__dirname + "/views/konva.html");
});

app.get("/v2", function (req, res) {
  res.sendFile(__dirname + "/views/konva.html");
});

io.on("connection", function (socket) {
  const userId = socket.id;
  console.log("a user connected", userId);
  io.to(userId).emit("ready", userId);
  // socket.broadcast.to(socket.id).emit('drawing', canvasData);

  socket.on("disconnect", function () {
    console.log("user disconnected", userId);
  });

  socket.on("ready", function (msg) {
    console.log(msg);
    io.to(userId).emit("user", userId);
  });

  socket.on("drawing", function (canvasJson) {
    console.log("Drawing");
    canvasData = canvasJson;
    canvasData.userId = userId;
    socket.broadcast.emit("drawing", canvasData);
  });

  socket.on("zooming", function (canvasZoom) {
    console.log("Zooming");
    canvasData = canvasZoom;
    socket.broadcast.emit("zooming", canvasData);
  });

  socket.on("paning", function (canvasPan) {
    console.log("Paning");
    canvasData = canvasPan;
    socket.broadcast.emit("paning", canvasData);
  });

  socket.on("draw-line", function (input) {
    console.log("Drawing");
    const data = {
      ...input,
      userId,
    };
    socket.broadcast.emit("draw-line", data);
  });

  socket.on("add-text", function (input) {
    console.log("Add text");
    const data = {
      ...input,
      userId,
    };
    socket.broadcast.emit("add-text", data);
  });

  socket.on("change-text", function (input) {
    console.log("Change text");
    const data = {
      ...input,
      userId,
    };
    socket.broadcast.emit("change-text", data);
  });

  socket.on("transform-text", function (input) {
    console.log("Move text");
    const data = {
      ...input,
      userId,
    };
    socket.broadcast.emit("transform-text", data);
  });
});
const port = process.env.PORT || 5000;

http.listen(port, function () {
  console.log(`listening on *:${port}`);
});
