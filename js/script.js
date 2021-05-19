let socket = io();

let canvas = new fabric.Canvas("c");
let line, triangle, origX, origY;

let mode = {
  isDrawingMode: false,
  isTextMode: false,
};
let isRectActive = false,
  isCircleActive = false,
  isArrowActive = false,
  activeColor = "#000000";
let isLoadedFromJson = false;

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

function initCanvas(canvas) {
  canvas.clear();
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  // canvas.freeDrawingBrush.shadow = new fabric.Shadow({
  //   blur: 0,
  //   offsetX: 0,
  //   offsetY: 0,
  //   affectStroke: true,
  //   color: "#ffffff",
  // });
  canvas.freeDrawingBrush.width = 5;
  canvas.isDrawingMode = false;

  return canvas;
}

function setCanvasSelectableStatus(val) {
  canvas.forEachObject(function (obj) {
    obj.lockMovementX = !val;
    obj.lockMovementY = !val;
    obj.hasControls = val;
    obj.hasBorders = val;
    obj.selectable = val;
  });
  canvas.renderAll();
}

function removeCanvasEvents() {
  canvas.off("mouse:down");
  canvas.off("mouse:move");
  canvas.off("mouse:up");
  canvas.off("object:moving");
}

function deleteObjects() {
  let activeGroup = canvas.getActiveObjects();

  if (activeGroup) {
    canvas.discardActiveObject();
    activeGroup.forEach(function (object) {
      canvas.remove(object);
    });
  }
}

function emitEvent() {
  let aux = canvas;
  let json = aux.toJSON();
  let data = {
    w: w,
    h: h,
    data: json,
  };
  socket.emit("drawing", data);
}

function emitZoomEvent(data) {
  socket.emit("zooming", data);
}

function emitPanEvent(data) {
  socket.emit("paning", data);
}

const exportToFile = (format, fileName) => {
  let dataFile;
  canvas.backgroundColor = "#FFF";
  switch (format) {
    case "image":
      //   dataFile = canvas.toDataURL("image/png");
      dataFile = canvas.toDataURL({
        format: "png",
      });
      break;
    case "pdf":
      console.log("pdf");
      break;
    default:
      break;
  }

  const link = document.getElementById("link");
  link.setAttribute("download", fileName);
  link.setAttribute("href", dataFile);
  link.click();
};

const hideAllOptions = () => {
  $(".option").each(function (i, opt) {
    $(opt).hide();
  });
};

function disableAllMode() {
  Object.keys(mode).map((item) => (mode[item] = false));
}
function checkActivatedMode() {
  const activedIdx = Object.values(mode).indexOf(true);
  return Object.keys(mode)[activedIdx];
}

$(function () {
  //Canvas init
  initCanvas(canvas).renderAll();

  //canvas events
  canvas.on("after:render", function () {
    if (!isLoadedFromJson) {
      emitEvent();
    }
    isLoadedFromJson = false;
    // console.log(canvas.toJSON());
  });

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

  //dynamically resize the canvas on window resize
  $(window)
    .on("resize", function () {
      w = div.width();
      h = div.height();
      canvas.setHeight(h);
      canvas.setWidth(w);
      $canvas.width(w).height(h);
    })
    .on("keydown", function (e) {
      if (e.keyCode === 46) {
        //delete key
        deleteObjects();
      }
    });

  // hold alt to dragging
  $(document)
    .on("keydown", function (e) {
      if (e.keyCode === 18) {
        // find active mode and disable it
        const activated = checkActivatedMode();
        if (activated && activated === "isDrawingMode") {
          canvas.isDrawingMode = false;
        }
        removeCanvasEvents();
        canvas.on("mouse:down", function (opt) {
          var evt = opt.e;
          if (evt.altKey === true) {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
          }
        });
        canvas.on("mouse:move", function (opt) {
          if (this.isDragging) {
            var e = opt.e;
            var vpt = this.viewportTransform;
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;

            emitPanEvent(vpt);
          }
        });
        canvas.on("mouse:up", function (opt) {
          // on mouse up we want to recalculate new interaction
          // for all objects, so we call setViewportTransform
          this.setViewportTransform(this.viewportTransform);
          this.isDragging = false;
        });
      }
    })
    .on("keyup", function (e) {
      if (e.keyCode === 18) {
        const activated = checkActivatedMode();
        if (activated && activated === "isDrawingMode") {
          canvas.isDrawingMode = true;
        } else if (activated === "isTextMode") {
          $("#textbox").trigger("click");
        }
      }
    });

  $("#pointerMode").click(function () {
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    hideAllOptions();
    $("#drawModeOpt").show();
    canvas.isDrawingMode = false;
    canvas.selection = true;
    disableAllMode();
  });

  $("#brushMode").on("click", function () {
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    hideAllOptions();
    $("#brushModeOpt").show();
    canvas.isDrawingMode = true;
    disableAllMode();
    mode.isDrawingMode = true;
  });
  $("#brushWidth").change(function () {
    const val = $(this).val();
    canvas.freeDrawingBrush.width = parseInt(val, 10) || 1;
    $("#brushWidthInfo").text(val);
  });
  $("#lineColor").change(function () {
    const val = $(this).val();
    canvas.freeDrawingBrush.color = val;
  });

  $("#shapeMode").click(function () {
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    hideAllOptions();
    $("#shapeModeOpt").show();
    canvas.isDrawingMode = false;
  });

  $("#shapeArrow").on("click", function (e) {
    removeCanvasEvents();
    $("#shapeModeOpt button").removeClass("active");
    $(this).addClass("active");
    canvas.selection = false;

    let arrow = new Arrow(canvas);
    // $(document).mouseup(function () {
    //   console.log("test arrow");
    //   $(e.target).removeClass("active");
    // });
    // $(canvas).mouseup(function () {
    //   console.log("ahihi");
    // });

    // if (!isArrowActive || isRectActive || isCircleActive) {
    //   isArrowActive = isRectActive = isCircleActive = false;
    //   $("#shapeModeOpt button").removeClass("active");
    //   $(this).addClass("active");
    //   isArrowActive = true;
    //   canvas.selection = false;
    //   let arrow = new Arrow(canvas);
    // } else {
    //   $(this).removeClass("active");
    //   canvas.selection = true;

    //   isArrowActive = isRectActive = isCircleActive = false;
    //   setCanvasSelectableStatus(true);
    // }
  });

  $("#shapeCircle").on("click", function (e) {
    removeCanvasEvents();
    $("#shapeModeOpt button").removeClass("active");
    $(this).addClass("active");
    canvas.selection = false;
    let circle = new Circle(canvas);
    // $(document).mouseup(function () {
    //   console.log("test circle");
    //   $(e.target).removeClass("active");
    // });
    // if (!isCircleActive || isArrowActive || isRectActive) {
    //   isArrowActive = isRectActive = isCircleActive = false;
    //   $("#shapeModeOpt button").removeClass("active");
    //   $(this).addClass("active");
    //   isCircleActive = true;
    //   canvas.selection = false;
    //   let circle = new Circle(canvas);
    // } else {
    //   $(this).removeClass("active");
    //   setCanvasSelectableStatus(true);
    //   canvas.selection = true;
    //   isArrowActive = isRectActive = isCircleActive = false;
    // }
  });

  $("#shapeRect").on("click", function (e) {
    removeCanvasEvents();
    $("#shapeModeOpt button").removeClass("active");
    $(this).addClass("active");
    canvas.selection = false;
    isRectActive = true;
    let rect = new Rectangle(canvas);
    // $(document).mouseup(function () {
    //   $(e.target).removeClass("active");
    // });
    // if (!isRectActive || isCircleActive || isArrowActive) {
    //   isArrowActive = isRectActive = isCircleActive = false;
    //   $("#shapeModeOpt button").removeClass("active");
    //   $(this).addClass("active");
    //   isRectActive = true;
    //   canvas.selection = false;
    //   let rect = new Rectangle(canvas);
    // } else {
    //   $(this).removeClass("active");
    //   setCanvasSelectableStatus(true);
    //   isArrowActive = isRectActive = isCircleActive = false;
    //   canvas.selection = true;
    // }
  });

  $("#textMode").click(function () {
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    hideAllOptions();
    $("#textModeOpt").show();
    disableAllMode();
    canvas.isDrawingMode = false;
    mode.isTextMode = true;
  });

  $("#drwEraser").on("click", function () {
    deleteObjects();
  });

  $("#drwClearCanvas").on("click", function () {
    canvas.clear();
  });

  function setShapeParams(type, value) {
    const activeObj = canvas.getActiveObject();
    const objType = activeObj.get("type");
    if (["lineArrow", "ellipse", "rect"].indexOf(objType) !== -1) {
      activeObj.set(type, value);
      canvas.renderAll();
    }
  }

  $("#shapeStrokeColor, #shapeFillColor").change(function () {
    const type = $(this).data("type");
    const val = $(this).val();
    setShapeParams(type, val);
  });

  $("#saveToPNG").click(function () {
    const fileName = prompt("Enter your file name", "whiteboard.png");
    if (fileName === null) {
      return;
    }
    exportToFile("image", fileName);
    delete canvas.backgroundColor; // magic
    canvas.setHeight(700);
    canvas.renderAndReset();
  });

  $(".font-change, .font-size, #textColor").on("change", function () {
    const prop = $(this).data("type");
    let val = $(this).find("option:selected").val() || $(this).val();
    if (prop === "fontSize") {
      val = Number(val);
    }
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      const type = activeObj.get("type");

      if (activeObj && type === "i-text") {
        if (prop == "color") {
          activeObj.setColor(val);
        } else {
          activeObj.set(prop, val);
        }
        canvas.renderAll();
      }
    }
  });

  $("#textbox").on("click", function () {
    const params = {
      fontFamily: $(".font-change").val(),
      fontSize: Number($(".font-size").val()),
      fill: $("#textColor").val(),
    };
    let textbox = new TextBox(canvas, params);
  });

  $("#zoom").on("click", function () {
    const zoom = canvas.getZoom();
    socket.emit("zooming", zoom * 2);
    // canvas.setZoom(zoom * 2);
    // canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  });

  canvas.renderAll();

  //Sockets
  socket.emit("ready", "Page loaded");

  socket.on("drawing", function (obj) {
    //set this flag, to disable infinite rendering loop
    isLoadedFromJson = true;

    //calculate ratio by dividing this canvas width to sender canvas width
    let ratio = w / obj.w;

    //reposition and rescale each sent canvas object
    obj.data.objects.forEach(function (object) {
      object.left *= ratio;
      object.scaleX *= ratio;
      object.top *= ratio;
      object.scaleY *= ratio;
    });

    canvas.loadFromJSON(obj.data);
  });

  socket.on("zooming", function (obj) {
    const { x, y, zoom } = obj;
    canvas.zoomToPoint({ x, y }, zoom);
  });
  socket.on("paning", function (obj) {
    let vpt = canvas.viewportTransform;
    vpt[4] = obj[4];
    vpt[5] = obj[5];
    canvas.requestRenderAll();
    // canvas.setViewportTransform(vpt);
  });
});
