const socket = io();

var width = window.innerWidth;
var height = window.innerHeight - 25;

// first we need Konva core things: stage and layer
var stage = new Konva.Stage({
  container: "container",
  width: width,
  height: height,
});

var layer = new Konva.Layer();
stage.add(layer);

var isPaint = false;
var mode = "brush";
var lastLine;

const users = [];
const temp = {
  isTransform: false,
};

const setupPaint = () => {
  stage.on("mousedown.paint", function (e) {
    isPaint = true;
    var pos = stage.getPointerPosition();
    lastLine = new Konva.Line({
      stroke: "#df4b26",
      strokeWidth: 5,
      globalCompositeOperation:
        mode === "brush" ? "source-over" : "destination-out",
      points: [pos.x, pos.y],
      // tension: 0,
      lineJoin: "round",
      lineCap: "round",
    });
    layer.add(lastLine);
    socket.emit("drawing", {
      newLine: true,
      pos,
    });
  });

  stage.on("mouseup.paint", function () {
    isPaint = false;
  });

  // and core function - drawing
  stage.on("mousemove.paint", function () {
    if (!isPaint) {
      return;
    }

    const pos = stage.getPointerPosition();
    var newPoints = lastLine.points().concat([pos.x, pos.y]);
    lastLine.points(newPoints);
    socket.emit("drawing", {
      newLine: false,
      pos: newPoints,
    });
  });
};

// const removeAllEvents = () => {
//   stage.off();
// };

const $paint = $("#paint");
const $text = $("#text");

$paint.click(function () {
  const val = $(this).data("value");
  if (val === "paint") {
    setupPaint();
    // change btn
    $(this).text("Stop paint").data("value", "stop");
  } else {
    stage.off("mousedown.paint");
    stage.off("mouseup.paint");
    stage.off("mousemove.paint");
    // change btn
    $(this).text("Paint").data("value", "paint");
  }
});

const rotatePoint = ({ x, y }, rad) => {
  const rcos = Math.cos(rad);
  const rsin = Math.sin(rad);
  return { x: x * rcos - y * rsin, y: y * rcos + x * rsin };
};

// will work for shapes with top-left origin, like rectangle
function rotateAroundCenter(node, rotation) {
  //current rotation origin (0, 0) relative to desired origin - center (node.width()/2, node.height()/2)
  const topLeft = { x: -node.width() / 2, y: -node.height() / 2 };
  const current = rotatePoint(topLeft, Konva.getAngle(node.rotation()));
  const rotated = rotatePoint(topLeft, Konva.getAngle(rotation));
  const dx = rotated.x - current.x,
    dy = rotated.y - current.y;

  node.rotation(rotation);
  node.x(node.x() + dx);
  node.y(node.y() + dy);
}

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

// // cancel transform
// stage.on("mousedown", () => {
//   const [node] = transformer.nodes();
//   console.log("🚀 ~ file: index.js ~ line 123 ~ stage.on ~ node", node);
//   if (node) {
//     console.log(
//       "%c Rainbowww!",
//       "font-weight: bold; font-size: 50px;color: red; text-shadow: 3px 3px 0 rgb(217,31,38) , 6px 6px 0 rgb(226,91,14) , 9px 9px 0 rgb(245,221,8) , 12px 12px 0 rgb(5,148,68) , 15px 15px 0 rgb(2,135,206) , 18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113); margin-bottom: 12px; padding: 5%;"
//     );
//     node.draggable(false);
//     transformer.detach();
//     transformer.borderEnabled(false);
//     // temp.isTransform = false;
//   }
// });

const setupText = () => {
  const id = `text-${Date.now()}`;
  stage.on("mousedown.text", function (e) {
    const pos = stage.getPointerPosition();
    const lastText = new Konva.Text({
      text: "Some text here",
      x: pos.x,
      y: pos.y,
      fontSize: 20,
      draggable: true,
      width: 200,
      id,
    });
    layer.add(lastText);

    transformer.nodes([lastText]);

    lastText.on("dblclick dbltap", () => {
      // hide text node and transformer:
      lastText.hide();
      tr.hide();

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
        tr.show();
        tr.forceUpdate();
      }

      function setTextareaWidth(newWidth) {
        if (!newWidth) {
          // set width for placeholder
          newWidth = lastText.placeholder.length * lastText.fontSize();
        }
        // some extra fixes on different browsers
        var isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent
        );
        var isFirefox =
          navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
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
        scale = lastText.getAbsoluteScale().x;
        setTextareaWidth(lastText.width() * scale);
        textarea.style.height = "auto";
        textarea.style.height =
          textarea.scrollHeight + lastText.fontSize() + "px";
      });

      textarea.addEventListener("input", function () {
        const value = textarea.value;
        const id = textarea.getAttribute("data-id");
        console.log("🚀 ~ file: index.js ~ line 244 ~ id", id);
        socket.emit("change-text", {
          value,
          id,
        });
      });

      function handleOutsideClick(e) {
        if (e.target !== textarea) {
          lastText.text(textarea.value);
          removeTextarea();
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
  });

  stage.on("mouseup.text", function (e) {
    $text.trigger("click");
    // temp.isTransform = true;
  });
};

$text.click(function () {
  const val = $(this).data("value");
  if (val === "text") {
    setupText();
    // change btn
    $(this).text("Stop text").data("value", "stop");
  } else {
    stage.off("mousedown.text");
    stage.off("mouseup.text");
    // change btn
    $(this).text("Text").data("value", "text");
  }
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
        globalCompositeOperation:
          mode === "brush" ? "source-over" : "destination-out",
        points: [pos.x, pos.y],
        // tension: 0,
        lineJoin: "round",
        lineCap: "round",
      });
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
        globalCompositeOperation:
          mode === "brush" ? "source-over" : "destination-out",
        points: [pos.x, pos.y],
        // tension: 0,
        lineJoin: "round",
        lineCap: "round",
      }),
    });
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
      width: 200,
      id,
    });
    layer.add(found.text);
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
        width: 200,
        id,
      }),
    });
    layer.add(users.slice(-1)[0].text);
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
    rotateAroundCenter(shape, rotation);
    // shape.rotation(rotation);
  }

  if (width) {
    shape.width(width);
  }
});
