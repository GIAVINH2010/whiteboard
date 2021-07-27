import Helpers from "./utils/index.js";
const socket = io();

let width = $("#container").width();
let height = $("#container").height();

// stage and layer
const stage = new Konva.Stage({
  container: "container",
  width: width,
  height: height,
});

const layer = new Konva.Layer();
stage.add(layer);
const tooltipLayer = new Konva.Layer();
stage.add(tooltipLayer);

// konva class
const transformer = new Konva.Transformer({
  // node: lastText,
  enabledAnchors: ["middle-left", "middle-right"],
  // set minimum width of text
  boundBoxFunc: function (oldBox, newBox) {
    newBox.width = Math.max(30, newBox.width);
    return newBox;
  },
});

layer.add(transformer);

const tooltip = new Konva.Text({
  text: "",
  fontFamily: "Calibri",
  fontSize: 12,
  padding: 5,
  visible: false,
  fill: "black",
  opacity: 0.75,
  textFill: "white",
});
tooltipLayer.add(tooltip);

// state
let cmnd;
let mode;
let isPaint = false;
let lastLine;
const users = [];
let textEditing = false;
const scaleBy = 1.05;
let zoomingNPaning = false;

// DOM
// const $paint = $("#paint");
// const $zandp = $("#zandp");
const $toolbar = $("#toolbar input");
const $textActions = $("#textActions");

// functions
// const resetToolbar = () => {
//   $("#toolbar label").each(function (i) {
//     const [pointer] = $(this).find("input[value='pointer']");
//     if (pointer) {
//       $(this).addClass("active");
//       $(pointer).prop("check", true);
//     } else {
//       $(this).removeClass("active");
//     }
//   });
// };

const bindTooltip = (ent) => {
  ent.on("mousemove", function () {
    if (mode !== "paint") {
      const mousePos = stage.getRelativePointerPosition();
      tooltip.position({
        x: mousePos.x + 5,
        y: mousePos.y + 5,
      });
      tooltip.text(ent.attrs.owner);
      tooltip.show();
    }
  });

  ent.on("mouseout", function () {
    if (mode !== "paint") {
      tooltip.hide();
    }
  });
};

const setupPointer = () => {
  stage.on("mousedown", () => {
    if (textEditing) {
      return;
    }
    const pos = layer.getStage().getPointerPosition();
    const shape = layer.getIntersection(pos);
    console.log("🚀 ~ file: konva.js ~ line 102 ~ stage.on ~ shape", shape);
    const [node] = transformer.nodes();
    console.log("🚀 ~ file: konva.js ~ line 104 ~ stage.on ~ node", node);

    if (!shape) {
      transformer.detach();
      transformer.getLayer().batchDraw();
      return;
    }

    if (shape === node) {
      return;
    }

    if (shape.id() && shape.attrs.owner === cmnd) {
      transformer.nodes([shape]);
    }
    transformer.getLayer().batchDraw();
  });
};
setupPointer();

const setupPaint = () => {
  stage.on("mousedown.paint", function (e) {
    isPaint = true;
    const pos = stage.getRelativePointerPosition();

    lastLine = new Konva.Line({
      stroke: "#df4b26",
      strokeWidth: 5,
      globalCompositeOperation: "source-over",
      points: [pos.x, pos.y],
      lineJoin: "round",
      lineCap: "round",
      owner: cmnd,
    });

    // lastLine.on("mousemove", function () {
    //   const mousePos = stage.getRelativePointerPosition();
    //   tooltip.position({
    //     x: mousePos.x + 5,
    //     y: mousePos.y + 5,
    //   });
    //   tooltip.text("Cyan Triangle");
    //   tooltip.show();
    // });

    // lastLine.on("mouseout", function () {
    //   tooltip.hide();
    // });
    bindTooltip(lastLine);

    layer.add(lastLine);

    socket.emit("drawing", {
      newLine: true,
      pos,
    });
  });

  stage.on("mouseup.paint", function () {
    isPaint = false;
  });

  stage.on("mousemove.paint", function () {
    if (!isPaint) {
      return;
    }
    const pos = layer.getRelativePointerPosition();
    var newPoints = lastLine.points().concat([pos.x, pos.y]);
    lastLine.points(newPoints);
    socket.emit("drawing", {
      newLine: false,
      pos: newPoints,
    });
  });
};

const setupText = () => {
  const id = `text-${Date.now()}`;

  const lastText = new Konva.Text({
    text: "Some text here",
    x: stage.width() / 2,
    y: stage.height() / 2,
    fontSize: 20,
    draggable: true,
    id,
    owner: cmnd,
  });

  const pos = {
    x: stage.width() / 2 - lastText.width() / 2,
    y: stage.height() / 2 - lastText.height() / 2,
  };
  lastText.x(pos.x);
  lastText.y(pos.y);

  bindTooltip(lastText);

  layer.add(lastText);

  transformer.nodes([lastText]);

  lastText.on("dblclick dbltap", () => {
    textEditing = true;
    // hide text node and transformer:
    lastText.hide();
    transformer.hide();

    // create textarea over canvas with absolute position
    // first we need to find position for textarea
    // how to find it?

    // at first lets find position of text node relative to the stage:
    var textPosition = lastText.absolutePosition();

    // so position of textarea will be the sum of positions above:
    var areaPosition = {
      x: stage.container().offsetLeft + textPosition.x,
      y: stage.container().offsetTop + textPosition.y,
    };

    // create textarea and style it
    var textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    // apply many styles to match text on canvas as close as possible
    // remember that text rendering on canvas and on the textarea can be different
    // and sometimes it is hard to make it 100% the same. But we will try...
    textarea.setAttribute("data-id", lastText.id());
    textarea.value = lastText.text();
    textarea.style.position = "absolute";
    textarea.style.top = areaPosition.y + "px";
    textarea.style.left = areaPosition.x + "px";
    textarea.style.width = lastText.width() - lastText.padding() * 2 + "px";
    textarea.style.height =
      lastText.height() - lastText.padding() * 2 + 5 + "px";
    textarea.style.fontSize = lastText.fontSize() + "px";
    textarea.style.border = "none";
    textarea.style.padding = "0px";
    textarea.style.margin = "0px";
    textarea.style.overflow = "hidden";
    textarea.style.background = "none";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = lastText.lineHeight();
    textarea.style.fontFamily = lastText.fontFamily();
    textarea.style.transformOrigin = "left top";
    textarea.style.textAlign = lastText.align();
    textarea.style.color = lastText.fill();
    const rotation = lastText.rotation();
    var transform = "";
    if (rotation) {
      transform += "rotateZ(" + rotation + "deg)";
    }

    var px = 0;
    // also we need to slightly move textarea on firefox
    // because it jumps a bit
    var isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
    if (isFirefox) {
      px += 2 + Math.round(lastText.fontSize() / 20);
    }
    transform += "translateY(-" + px + "px)";

    textarea.style.transform = transform;

    // reset height
    textarea.style.height = "auto";
    // after browsers resized it we can set actual value
    textarea.style.height = textarea.scrollHeight + 3 + "px";

    textarea.focus();

    function removeTextarea() {
      textarea.parentNode.removeChild(textarea);
      window.removeEventListener("click", handleOutsideClick);
      lastText.show();
      transformer.show();
      transformer.forceUpdate();
    }

    function setTextareaWidth(newWidth) {
      if (!newWidth) {
        // set width for placeholder
        newWidth = lastText.placeholder.length * lastText.fontSize();
      }
      // some extra fixes on different browsers
      var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      var isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
      if (isSafari || isFirefox) {
        newWidth = Math.ceil(newWidth);
      }

      var isEdge = document.documentMode || /Edge/.test(navigator.userAgent);
      if (isEdge) {
        newWidth += 1;
      }
      textarea.style.width = newWidth + "px";
    }

    textarea.addEventListener("keydown", function (e) {
      // hide on enter
      // but don't hide on shift + enter
      if (e.keyCode === 13 && !e.shiftKey) {
        lastText.text(textarea.value);
        removeTextarea();
      }
      // on esc do not set value back to node
      if (e.keyCode === 27) {
        removeTextarea();
      }
    });

    textarea.addEventListener("keydown", function (e) {
      const scale = lastText.getAbsoluteScale().x;
      setTextareaWidth(lastText.width() * scale);
      textarea.style.height = "auto";
      textarea.style.height =
        textarea.scrollHeight + lastText.fontSize() + "px";
    });

    textarea.addEventListener("input", function () {
      const value = textarea.value;
      const id = textarea.getAttribute("data-id");
      socket.emit("change-text", {
        value,
        id,
      });
    });

    function handleOutsideClick(e) {
      if (e.target !== textarea) {
        lastText.text(textarea.value);
        removeTextarea();
        textEditing = false;
      }
    }
    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    });
  });

  lastText.on("transform", function () {
    // reset scale, so only with is changing by transformer
    lastText.setAttrs({
      width: lastText.width() * lastText.scaleX(),
      scaleX: 1,
    });

    const rotation = lastText.rotation();
    const width = lastText.width();

    socket.emit("transform-text", {
      rotation,
      width,
      id,
    });
  });

  lastText.on("dragmove", () => {
    const pos = {
      x: lastText.x(),
      y: lastText.y(),
    };
    // const id = lastText.id();
    socket.emit("transform-text", {
      pos,
      id,
    });
  });

  socket.emit("add-text", {
    pos,
    id,
  });
};

const setupZoomNPan = () => {
  zoomingNPaning = true;
  stage.on("wheel", (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();

    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // change cursor
    if (e.evt.deltaY > 0) {
      stage.container().style.cursor = "zoom-in";
    } else {
      stage.container().style.cursor = "zoom-out";
    }

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);

    socket.emit("zooming", {
      newScale,
      newPos,
    });
  });
};

const eventCleanup = () => {
  stage.container().style.cursor = "auto";
  // clean up events
  stage.off("mousedown.paint");
  stage.off("mouseup.paint");
  stage.off("mousemove.paint");
};

const domCleanup = () => {
  $(".actions").each((i, elm) => {
    $(elm)
      .find("button")
      .each((k, btn) => {
        $(document).off("click", null, setupText);
      });
    $(elm).empty();
  });
};

const textActions = `
  <div class="card mb-3">
    <div class="card-body">
      <button
        type="button"
        class="btn btn-primary btn-block"
        id="addText"
      >
        Add text
      </button>
    </div>
  </div>
`;

// keyboard event
$(window).on("resize", function () {
  width = $("#container").width();
  height = $("#container").height();
  stage.width(width);
  stage.height(height);
});
// .on("keydown", function (e) {
//   if (e.keyCode === 18 && zoomingNPaning) {
//     stage.draggable(true);

//     stage.container().style.cursor = "grab";

//     stage.on("mousedown.znp", () => {
//       stage.container().style.cursor = "grabbing";

//       stage.on("mousemove.znp", () => {
//         stage.container().style.cursor = "grabbing";
//       });
//     });

//     stage.on("mouseup.znp", () => {
//       stage.off("mousemove");
//       stage.container().style.cursor = "grab";
//     });

//     stage.on("dragmove", () => {
//       const stagePos = {
//         x: stage.x(),
//         y: stage.y(),
//       };

//       socket.emit("paning", {
//         stagePos,
//       });
//     });
//   }
// })
// .on("keyup", function (e) {
//   if (e.keyCode === 18 && zoomingNPaning) {
//     stage.off("mousedown");
//     stage.off("mouseup");
//     stage.container().style.cursor = "zoom-in";
//     stage.draggable(false);
//   }
// });

$toolbar.on("change", function () {
  console.log("CHANGE");
  eventCleanup();
  domCleanup();
  mode = $(this).val();

  switch (mode) {
    case "pointer":
      setupPointer();
      break;
    case "paint":
      stage.container().style.cursor = "crosshair";
      setupPaint();
      break;
    case "text":
      $textActions.html(textActions);
      $(document).on("click", "#addText", setupText);
      break;

    default:
      break;
  }
});

// $zandp.click(function () {
//   const val = $(this).data("value");
//   if (val === "zandp") {
//     stage.container().style.cursor = "zoom-in";
//     setupZoomNPan();
//     // change btn
//     $(this).text("Stop zooming and paning").data("value", "stop");
//   } else {
//     stage.container().style.cursor = "auto";
//     stage.off("wheel");
//     // change btn
//     $(this).text("Zoom & Pan").data("value", "zandp");
//   }
// });

socket.on("ready", (userId) => {
  cmnd = userId;
});

socket.on("drawing", (data) => {
  const { newLine, pos, userId } = data;
  const found = users.find((user) => user.userId === userId);
  if (found) {
    console.log(found);
    if (newLine) {
      found.line = new Konva.Line({
        stroke: "#df4b26",
        strokeWidth: 5,
        globalCompositeOperation: "source-over",
        points: [pos.x, pos.y],
        // tension: 0,
        lineJoin: "round",
        lineCap: "round",
        owner: userId,
      });

      bindTooltip(found.line);

      layer.add(found.line);
    } else {
      found.line.points(pos);
    }
  } else {
    console.log(
      "%cHello index.js line:67 ",
      "background: green; color: white; display: block;"
    );
    users.push({
      userId,
      line: new Konva.Line({
        stroke: "#df4b26",
        strokeWidth: 5,
        globalCompositeOperation: "source-over",
        points: [pos.x, pos.y],
        // tension: 0,
        lineJoin: "round",
        lineCap: "round",
        owner: userId,
      }),
    });

    bindTooltip(users.slice(-1)[0].line);

    layer.add(users.slice(-1)[0].line);
  }
});

socket.on("add-text", (data) => {
  const { pos, userId, id } = data;
  const found = users.find((user) => user.userId === userId);
  if (found) {
    found.text = new Konva.Text({
      text: "Some text here",
      x: pos.x,
      y: pos.y,
      fontSize: 20,
      // draggable: true,
      id,
      owner: userId,
    });

    bindTooltip(found.text);

    layer.add(found.text);

    // found.text.on("dragmove", () => {
    //   const pos = {
    //     x: found.text.x(),
    //     y: found.text.y(),
    //   };
    //   // const id = lastText.id();
    //   socket.emit("transform-text", {
    //     pos,
    //     id,
    //   });
    // });
  } else {
    console.log(
      "%cHello index.js line:67 ",
      "background: green; color: white; display: block;"
    );
    users.push({
      userId,
      text: new Konva.Text({
        text: "Some text here",
        x: pos.x,
        y: pos.y,
        fontSize: 20,
        // draggable: true,
        id,
        owner: userId,
      }),
    });
    const text = users.slice(-1)[0].text;

    bindTooltip(text);

    layer.add(text);

    // text.on("dragmove", () => {
    //   const pos = {
    //     x: text.x(),
    //     y: text.y(),
    //   };
    //   // const id = lastText.id();
    //   socket.emit("transform-text", {
    //     pos,
    //     id,
    //   });
    // });
  }
});

socket.on("change-text", (data) => {
  const { value, userId, id } = data;
  const shape = stage.find(`#${id}`)[0];
  shape.text(value);
});

socket.on("transform-text", (data) => {
  const { pos, rotation, width, id } = data;
  const shape = stage.find(`#${id}`)[0];

  if (pos) {
    shape.x(pos.x);
    shape.y(pos.y);
  }

  if (rotation) {
    Helpers.rotateAroundCenter(shape, rotation);
  }

  if (width) {
    shape.width(width);
  }
});

socket.on("zooming", (data) => {
  const { newScale, newPos } = data;
  stage.scale({ x: newScale, y: newScale });
  stage.position(newPos);
});

socket.on("paning", (data) => {
  const { stagePos } = data;
  stage.position(stagePos);
});
