$(document).ready(function () {
  const socket = io();
  const canvas = new fabric.Canvas("canvas", {
    isDrawingMode: true,
  });
  window.addEventListener("resize", resizeCanvas, false);

  function resizeCanvas() {
    canvas.setWidth($(".container").width());
    // canvas.setWidth(window.innerWidth);
    canvas.renderAll();
  }

  // resize on init
  resizeCanvas();

  const rect = new fabric.Rect({
    top: 100,
    left: 100,
    width: 60,
    height: 70,
    fill: "red",
  });

  canvas.add(rect);

  socket.emit("drawing", { hello: "Hello" });

  socket.on("drawing", (data) => {
    console.log("🚀 ~ file: index.js ~ line 30 ~ socket.on ~ data", data);
  });

  const drawLine = (x0, y0, x1, y1, color, emit) => {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    context.closePath();

    if (!emit) {
      return;
    }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit("drawing", {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color,
    });
  };
});
