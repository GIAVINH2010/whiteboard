const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
let canvasData;

app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/v2", function (req, res) {
  res.sendFile(__dirname + "/views/konvas.html");
});

io.on("connection", function (socket) {
  const userId = socket.id;
  console.log("a user connected", userId);
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
});
const port = process.env.PORT || 5000;

http.listen(port, function () {
  console.log(`listening on *:${port}`);
});
