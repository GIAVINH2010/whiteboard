//Sockets
socket.emit("ready", "Page loaded");

socket.on("user", function (userId) {
  thisUserId = userId;
  console.log("%csocket.js line:6 thisUserId", "color: #007acc;", thisUserId);
});

const test = new fabric.Path(`M 0 20 Q 50 100 100 20`, {
  left: 50,
  top: 50,
  stroke: "black",
  fill: "",
});
canvas.add(test);

socket.on("drawing", function (data) {
  //set this flag, to disable infinite rendering loop
  // isLoadedFromJson = true;

  // console.log("%csocket.js line:13 data", "color: #26bfa5;", data);
  const { obj } = data;
  console.log("%csocket.js line:15 obj", "color: #26bfa5;", obj);
  if (obj) {
    test.path = obj;
  }
  // console.log(
  //   "%csocket.js line:18 test",
  //   "color: white; background-color: #26bfa5;",
  //   test
  // );

  // let path;
  // if (obj && obj.clientX && obj.clientY) {
  //   path = new fabric.Path(`M 0 0`, {
  //     left: obj.clientX,
  //     top: obj.clientY,
  //     stroke: "black",
  //   });
  //   console.log("%csocket.js line:22 path", "color: #007acc;", path);

  //   canvas.add(path);
  // } else if (obj) {
  //   path.path = obj;
  //   console.log("%csocket.js line:27 path2", "color: #007acc;", path);
  // }
  canvas.renderAll();
});
