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

const setupPaint = () => {
  stage.on("mousedown touchstart", function (e) {
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
    socket.emit("draw-line", {
      newLine: true,
      pos,
    });
  });

  stage.on("mouseup touchend", function () {
    isPaint = false;
  });

  // and core function - draw-line
  stage.on("mousemove touchmove", function () {
    if (!isPaint) {
      return;
    }

    const pos = stage.getPointerPosition();
    var newPoints = lastLine.points().concat([pos.x, pos.y]);
    lastLine.points(newPoints);
    socket.emit("draw-line", {
      newLine: false,
      pos: newPoints,
    });
  });
};

const removeAllEvents = () => {
  stage.off();
};

const $paint = $("#paint");
const $text = $("#text");

$paint.click(function () {
  const val = $(this).data("value");
  if (val === "paint") {
    setupPaint();
    // change btn
    $(this).text("Stop paint").data("value", "stop");
  } else {
    removeAllEvents();
    // change btn
    $(this).text("Paint").data("value", "paint");
  }
});
// select.addEventListener("change", function () {
//   mode = select.value;
// });

const setupText = () => {
  const id = `text-${Date.now()}`;
  stage.on("mousedown touchstart", function (e) {
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
    var tr = new Konva.Transformer({
      node: lastText,
      enabledAnchors: ["middle-left", "middle-right"],
      // set minimum width of text
      boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        return newBox;
      },
    });

    lastText.on("transform", function () {
      // reset scale, so only with is changing by transformer
      lastText.setAttrs({
        width: lastText.width() * lastText.scaleX(),
        scaleX: 1,
      });
    });

    layer.add(tr);

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

    lastText.on("dragmove", () => {
      const pos = {
        x: lastText.x(),
        y: lastText.y(),
      };
      // const id = lastText.id();
      socket.emit("move-text", {
        pos,
        id,
      });
    });

    socket.emit("add-text", {
      pos,
      id,
    });
  });

  stage.on("mouseup touchend", function (e) {
    $text.trigger("click");
  });
};

$text.click(function () {
  const val = $(this).data("value");
  if (val === "text") {
    setupText();
    // change btn
    $(this).text("Stop text").data("value", "stop");
  } else {
    removeAllEvents();
    // change btn
    $(this).text("Text").data("value", "text");
  }
});

socket.on("draw-line", (data) => {
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

socket.on("move-text", (data) => {
  const { pos, id } = data;
  const shape = stage.find(`#${id}`)[0];
  shape.x(pos.x);
  shape.y(pos.y);
});
