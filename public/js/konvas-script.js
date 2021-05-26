const width = $(".stage").width();
const height = $(".stage").height();
// first we need Konva core things: stage and layer
const stage = new Konva.Stage({
  container: "stage",
  width: width,
  height: height,
});
const layer = new Konva.Layer();
stage.add(layer);

for (var i = 0; i < 10000; i++) {
  var rect = new Konva.Circle({
    x: Math.random() * $(".stage").width(),
    y: Math.random() * $(".stage").height(),

    radius: 20,
    name: "shape",
    fill: Konva.Util.getRandomColor(),
  });
  layer.add(rect);
}

layer.draw();

// const tr = new Konva.Transformer({
//   node: textNode,
//   enabledAnchors: [
//     "top-center",
//     "middle-right",
//     "middle-left",
//     "bottom-center",
//   ],
//   padding: 5,
//   // // set minimum width of text
//   boundBoxFunc: function (oldBox, newBox) {
//     newBox.width = Math.max(50, newBox.width);
//     newBox.height = Math.max(20, newBox.height);
//     return newBox;
//   },
// });

// textNode.on("transform", function () {
//   // reset scale, so only with is changing by transformer
//   textNode.setAttrs({
//     width: textNode.width() * textNode.scaleX(),
//     height: textNode.height() * textNode.scaleY(),
//     scaleX: 1,
//     scaleY: 1,
//   });
// });

// layer.add(tr);

// layer.draw();

// Make stage draggable
$(document)
  .on("keydown", function (e) {
    if (e.keyCode === 18) {
      stage.draggable(true);
    }
  })
  .on("keyup", function (e) {
    if (e.keyCode === 18) {
      stage.draggable(false);
    }
  });

const topLayer = new Konva.Layer();
stage.add(topLayer);

const selectionRectangle = new Konva.Rect({
  fill: "rgba(0,0,255,0.5)",
});
topLayer.add(selectionRectangle);

const group = new Konva.Group({
  draggable: true,
});
topLayer.add(group);

function getRelativePointerPosition(node) {
  // the function will return pointer position relative to the passed node
  const transform = node.getAbsoluteTransform().copy();
  // to detect relative position we need to invert transform
  transform.invert();

  // get pointer (say mouse or touch) position
  const pos = node.getStage().getPointerPosition();

  // now we find relative point
  return transform.point(pos);
}

let x1, y1, x2, y2;
stage.on("mousedown touchstart", (e) => {
  // do nothing if we mousedown on the group
  if (e.target.getParent() === group) {
    console.log("do nothing if we mousedown on the group");
    return;
  } else if (stage.draggable()) {
    // do nothing if we are dragging stage
    console.log("do nothing if we are dragging stage");
    return;
  }
  x1 = getRelativePointerPosition(stage).x;
  y1 = getRelativePointerPosition(stage).y;

  selectionRectangle.setAttrs({
    x: x1,
    y: y1,
    width: 0,
    height: 0,
    visible: true,
  });

  const groupItems = group.children.toArray();

  // move old selection back to original layer, with new position and transform
  if (groupItems.length > 0) {
    groupItems.forEach((shape) => {
      const pos = shape.getAbsolutePosition(layer);
      shape.moveTo(layer);
      shape.position({ x: pos.x, y: pos.y });
      // const transform = shape.getAbsoluteTransform();
      // shape.setAttrs(transform.decompose());
    });
    // reset group transforms
    group.setAttrs({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    });
    // clear cache to remove old node wiht old position
    group.clearCache();
    // re-draw the layer to avoid blashing
    layer.batchDraw();
  }
});
stage.on("mousemove", (e) => {
  // do nothing if we didn't start selection - the selectionRectangle is not created
  if (!selectionRectangle.visible()) {
    return;
  }
  x2 = getRelativePointerPosition(stage).x;
  y2 = getRelativePointerPosition(stage).y;

  selectionRectangle.setAttrs({
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  });
  topLayer.batchDraw();
});

stage.on("mouseup", () => {
  // do nothing if we didn't start selection - the selectionRectangle is not created
  if (!selectionRectangle.visible()) {
    return;
  }
  selectionRectangle.visible(false);

  // get all shape before remove them from layer
  const shapes = stage.find(".shape");
  const box = selectionRectangle.getClientRect();

  // remove all children on layer for better performance
  layer.removeChildren();

  // then check intersections and add all shape into correct container
  shapes.forEach((shape) => {
    const intersected = Konva.Util.haveIntersection(box, shape.getClientRect());
    if (intersected) {
      group.add(shape);
      shape.stroke("blue");
    } else {
      layer.add(shape);
      shape.stroke(null);
    }
  });
  stage.batchDraw();
  // layer.batchDraw();
  // topLayer.batchDraw();

  if (group.children.length) {
    // tr.nodes([group]);
    group.cache();
  }
});

function usePointerMode() {
  // Make stage zoomable
  const scaleBy = 1.05;
  stage.on("wheel", (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();

    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    if (newScale > 7) newScale = 7;
    if (newScale < 1) newScale = 1;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  });
}

function endPointerMode() {
  stage.draggable(false);
  stage.off("wheel");
}

function getRelativePointerPosition(node) {
  // the function will return pointer position relative to the passed node
  const transform = node.getAbsoluteTransform().copy();
  // to detect relative position we need to invert transform
  transform.invert();

  // get pointer (say mouse or touch) position
  const pos = node.getStage().getPointerPosition();

  // now we find relative point
  return transform.point(pos);
}

function useDrawingMode(params) {
  let isDrawing = false;
  let mode = "brush";
  let currentLine;
  stage.on("mousedown touchstart", function (e) {
    isDrawing = true;
    const pos = getRelativePointerPosition(stage);
    currentLine = new Konva.Line({
      stroke: "#df4b26",
      strokeWidth: 5,
      lineCap: "round",
      lineJoin: "round",
      tension: 1,
      globalCompositeOperation:
        mode === "brush" ? "source-over" : "destination-out",
      points: [pos.x, pos.y],
    });
    layer.add(currentLine);
  });

  stage.on("mousemove touchmove", function () {
    if (!isDrawing) {
      return;
    }

    const pos = getRelativePointerPosition(stage);
    const newPoints = currentLine.points().concat([pos.x, pos.y]);
    currentLine.points(newPoints);
    layer.batchDraw();
  });

  stage.on("mouseup touchend", function () {
    isDrawing = false;
  });
}

function endDrawingMode() {
  stage.off("mousedown");
  stage.off("mousemove");
  stage.off("mouseup");
}

$(document).ready(function () {
  function hideAllOptions() {
    $(".option").each(function (i, opt) {
      $(opt).hide();
    });
  }
  hideAllOptions();
  usePointerMode();

  $("#pointerMode").click(function () {
    hideAllOptions();

    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    endDrawingMode();
    usePointerMode();
  });

  $("#brushMode").click(function () {
    hideAllOptions();
    $(".toolbar button").removeClass("active");
    $(this).addClass("active");
    $("#brushModeOpt").show();
    endPointerMode();
    const params = {
      stroke: $("#lineColor").val(),
      strokeWidth: $("#brushWidth").val(),
    };
    useDrawingMode(params);
  });
});
