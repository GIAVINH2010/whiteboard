let socket = io();

let canvas = new fabric.Canvas("c");
let thisUserId;
let isLoadedFromJson = false;
// let drawing = false;
// let current = {};
let mode = {
  isDrawingMode: false,
  isTextMode: false,
};
let drawing = false;

//init variables
let div = $("#canvasWrapper");
let $canvas = $("#c");

//width and height of canvas's wrapper
let w, h;
w = div.width();
h = div.height();
$canvas.width(w).height(h);

//set w & h for canvas
canvas.setHeight(h);
canvas.setWidth(w);
// let context = fabric.document.createElement("canvas").getContext("2d");

function initCanvas(canvas) {
  canvas.clear();
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.shadow = new fabric.Shadow({
    blur: 0,
    offsetX: 0,
    offsetY: 0,
    affectStroke: true,
    color: "#ffffff",
  });
  canvas.freeDrawingBrush.width = 5;
  canvas.isDrawingMode = false;
  canvas.enableRetinaScaling = true;
  return canvas;
}

function emitDrawingEvent(emit, drawingData) {
  console.log(
    "🚀 ~ file: script2.js ~ line 45 ~ emitDrawingEvent ~ emit",
    emit
  );
  let aux = canvas;
  let json = aux.toJSON(["myOwner"]);
  let data = {
    w: w,
    h: h,
    // obj: json,
    obj: drawingData,
  };
  if (!emit) {
    return;
  }
  // console.log("EMIT NHAAAAA");

  socket.emit("drawing", data);
}

function emitZoomEvent(data) {
  socket.emit("zooming", data);
}

function checkActivatedMode() {
  const activedIdx = Object.values(mode).indexOf(true);
  return Object.keys(mode)[activedIdx];
}

function removeCanvasEvents() {
  canvas.off("mouse:down");
  canvas.off("mouse:move");
  canvas.off("mouse:up");
  canvas.off("object:moving");
}

$(document).ready(function () {
  //Canvas init
  initCanvas(canvas);

  const brush = new fabric.PencilBrush(canvas);

  canvas.on("mouse:wheel", function (opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 1) zoom = 1;

    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    const data = {
      x: opt.e.offsetX,
      y: opt.e.offsetY,
      zoom,
    };
    emitZoomEvent(data);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  canvas.on("path:created", function (e) {
    console.log("🚀 ~ file: script2.js ~ line 107 ~ canvas.on ~ e", e);

    // brush.onMouseDown(start);
    const drawData = {
      pointer: end,
      during: true,
    };

    // emitDrawingEvent(true, drawData);
  });

  canvas.on("mouse:down", function (eD) {
    if (canvas.isDrawingMode) {
      drawing = true;
      console.log("down");
      const pointer = canvas.getPointer(eD.e);
      console.log("🚀 ~ file: script2.js ~ line 126 ~ pointer", pointer);
      // const { x, y } = eD.e;
      const drawData = {
        pointer,
        start: true,
      };
      emitDrawingEvent(true, drawData);

      // brush.onMouseDown({ x: pointer.x, y: pointer.y });
    }
  });

  // canvas.on("mouse:move", function (eM) {
  //   if (canvas.isDrawingMode) {
  //     if (drawing) {
  //       const pointer = canvas.getPointer(eM.e);

  //       const drawData = {
  //         pointer,
  //         during: true,
  //       };

  //       // brush.onMouseMove({ x: pointer.x, y: pointer.y });
  //       emitDrawingEvent(true, drawData);
  //     }
  //   }
  // });

  canvas.on("mouse:up", function () {
    // brush.onMouseUp();
    if (canvas.isDrawingMode) {
      drawing = false;
      console.log("up");
      const drawData = {
        end: true,
      };
      emitDrawingEvent(true, drawData);
    }
  });

  // //dynamically resize the canvas on window resize
  // $(window)
  //   .on("resize", function () {
  //     w = div.width();
  //     h = div.height();
  //     canvas.setHeight(h);
  //     canvas.setWidth(w);
  //     $canvas.width(w).height(h);
  //   })
  //   .on("keydown", function (e) {
  //     if (e.keyCode === 46) {
  //       //delete key
  //       deleteObjects();
  //     }
  //   });

  // // hold alt to dragging
  // $(document)
  //   .on("keydown", function (e) {
  //     if (e.keyCode === 18) {
  //       // find active mode and disable it
  //       const activated = checkActivatedMode();
  //       if (activated && activated === "isDrawingMode") {
  //         canvas.isDrawingMode = false;
  //       }
  //       removeCanvasEvents();
  //       canvas.on("mouse:down", function (opt) {
  //         var evt = opt.e;
  //         if (evt.altKey === true) {
  //           this.isDragging = true;
  //           this.selection = false;
  //           this.lastPosX = evt.clientX;
  //           this.lastPosY = evt.clientY;
  //         }
  //       });
  //       canvas.on("mouse:move", function (opt) {
  //         if (this.isDragging) {
  //           var e = opt.e;
  //           var vpt = this.viewportTransform;
  //           vpt[4] += e.clientX - this.lastPosX;
  //           vpt[5] += e.clientY - this.lastPosY;
  //           this.requestRenderAll();
  //           this.lastPosX = e.clientX;
  //           this.lastPosY = e.clientY;

  //           emitPanEvent(vpt);
  //         }
  //       });
  //       canvas.on("mouse:up", function (opt) {
  //         // on mouse up we want to recalculate new interaction
  //         // for all objects, so we call setViewportTransform
  //         this.setViewportTransform(this.viewportTransform);
  //         this.isDragging = false;
  //       });
  //     }
  //   })
  //   .on("keyup", function (e) {
  //     if (e.keyCode === 18) {
  //       const activated = checkActivatedMode();
  //       if (activated && activated === "isDrawingMode") {
  //         canvas.isDrawingMode = true;
  //       } else if (activated === "isTextMode") {
  //         $("#textbox").trigger("click");
  //       }
  //     }
  //   });

  // canvas.on("mouse:move", function (e) {
  //   if (canvas.isDrawingMode) {
  //     // console.log("mouse:move");
  //     const { clientX, clientY } = e.e;
  //     // console.log(
  //     //   "%cscript2.js line:76 target",
  //     //   "color: white; background-color: #007acc;",
  //     //   target
  //     // );
  //     const path = target && target.path;
  //     emitEvent(path);
  //   }
  // });

  $("#pointerMode").click(function () {
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    // hideAllOptions();
    // $("#drawModeOpt").show();
    canvas.isDrawingMode = false;
    // canvas.selection = true;
    // disableAllMode();
  });

  $("#brushMode").on("click", function () {
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    // hideAllOptions();
    // $("#brushModeOpt").show();
    canvas.isDrawingMode = true;
    // disableAllMode();
    // mode.isDrawingMode = true;
  });
  //Sockets
  socket.emit("ready", "Page loaded");

  socket.on("user", function (userId) {
    thisUserId = userId;
    console.log("%csocket.js line:6 thisUserId", "color: #007acc;", thisUserId);
  });

  socket.on("drawing", function (data) {
    //set this flag, to disable infinite rendering loop
    // isLoadedFromJson = true;

    const { obj } = data;
    if (obj.start) {
      console.log("🚀 ~ file: script2.js ~ line 282 ~ obj", obj);
      brush.onMouseDown({ x: obj.pointer.x, y: obj.pointer.y });
    }

    if (obj.during) {
      brush.onMouseMove({ x: obj.pointer.x, y: obj.pointer.y });
    }

    if (obj.end) {
      console.log("brush mouse up");
      brush.onMouseUp();
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
  });

  socket.on("zooming", function (obj) {
    const { x, y, zoom } = obj;
    canvas.zoomToPoint({ x, y }, zoom);
  });
});
