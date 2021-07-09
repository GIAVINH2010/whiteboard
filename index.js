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

const isValidJwt = (header) => {
  const token = header.split(" ")[1];
  if (token === "yourToken") {
    return true;
  } else {
    return false;
  }
};

io.use((socket, next) => {
  // const { token } = socket.handshake.auth;
  // console.log("🚀 ~ file: index.js ~ line 20 ~ io.use ~ token", token);
  const header = socket.handshake.headers["authorization"];
  console.log("🚀 ~ file: index.js ~ line 22 ~ io.use ~ header", header);

  if (isValidJwt(header)) {
    next();
  } else {
    const err = new Error("not authorized");
    err.data = { content: "Please retry later" }; // additional details
    next(err);
  }
});

const _emitUserList = async () => {
  const sockets = await io.fetchSockets();
  const userList = sockets.map((socket) => ({
    id: socket.id,
    ...socket.data,
  }));
  io.emit("user-list", userList);
};

io.on("connection", async function (socket) {
  console.log("a user connected", socket.id);

  socket.on("connected", async (profile) => {
    socket.data = profile;
    socket.broadcast.emit("user-connected", profile.name);
    _emitUserList();
  });

  // socket.broadcast.to(socket.id).emit('drawing', canvasData);

  socket.on("disconnect", function () {
    console.log("user disconnected", socket.id);
    socket.broadcast.emit("user-disconnected", socket.data.name);
    _emitUserList();
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
