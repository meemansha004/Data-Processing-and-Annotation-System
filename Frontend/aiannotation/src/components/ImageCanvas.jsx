import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Text, Transformer } from "react-konva";
import useImage from "use-image";
import { v4 as uuidv4 } from "uuid";

export default function ImageCanvas({ imageFile, detections, onSave }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [image] = useImage(imageUrl, "anonymous");

  const [boxes, setBoxes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newBox, setNewBox] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  const transformerRef = useRef();
  const stageRef = useRef();

  // This flag prevents the circular loop:
  // user edits → onSave → parent updates detections prop → setBoxes → onSave → ...
  const loadingFromProp = useRef(false);

  // Handle File or URL
  useEffect(() => {
    if (imageFile) {
      if (typeof imageFile === "string") {
        setImageUrl(imageFile);
      } else {
        const url = URL.createObjectURL(imageFile);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [imageFile]);

  // Load detections from prop (YOLO results or restored edits)
  useEffect(() => {
    // Mark that the next boxes change is from prop, not from a user edit
    loadingFromProp.current = true;
    if (detections && detections.length > 0) {
      const converted = detections.map((det) => {
        // Support both raw YOLO format { bbox: [x1,y1,x2,y2] } and
        // already-converted format { x, y, width, height }
        if (det.bbox) {
          const [x1, y1, x2, y2] = det.bbox;
          return {
            id: uuidv4(),
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1,
            class: det.class,
            confidence: det.confidence,
            source: det.source || "yolo",
          };
        }
        // Already in internal format — keep as-is but ensure an id
        return { id: det.id || uuidv4(), ...det };
      });
      setBoxes(converted);
    } else {
      setBoxes([]);
    }
  }, [detections]);

  // Auto-sync boxes → parent whenever the user makes any edit.
  // The loadingFromProp flag prevents the circular update loop.
  useEffect(() => {
    if (loadingFromProp.current) {
      loadingFromProp.current = false;
      return;
    }
    if (onSave) onSave(boxes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes]);

  // Transformer attach
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;

    if (tr && stage) {
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        tr.nodes([selectedNode]);
      } else {
        tr.nodes([]);
      }
      tr.getLayer().batchDraw();
    }
  }, [selectedId]);

  // Legacy global — kept so ReviewPage still works, but AutoLabelPage
  // no longer depends on it (auto-sync via useEffect above handles it).
  useEffect(() => {
    window.saveCanvas = () => {
      if (onSave) onSave(boxes);
    };
  }, [boxes, onSave]);

  // Drawing
  const handleMouseDown = (e) => {
    if (!image) return;

    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
      setSelectedBox(null);
    }

    if (e.evt.shiftKey) {
      const pos = e.target.getStage().getPointerPosition();
      setIsDrawing(true);
      setNewBox({
        id: uuidv4(),
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        class: "manual",
        confidence: 1.0,
        source: "manual",
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !newBox) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setNewBox({
      ...newBox,
      width: point.x - newBox.x,
      height: point.y - newBox.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !newBox) return;
    setBoxes((prev) => [...prev, newBox]);
    setIsDrawing(false);
    setNewBox(null);
  };

  const handleDragMove = (id, newAttrs) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...newAttrs } : b))
    );
  };

  const handleTransformEnd = (id, node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const newAttrs = {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    };

    setBoxes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...newAttrs } : b))
    );
  };

  if (!image) return <p className="text-gray-500 italic">Loading image...</p>;

  // 🔥 SCALE FIX
  const maxWidth = 500;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;

  return (
    <div className="flex flex-col items-center">

      <Stage
        ref={stageRef}
        width={image.width * scale}
        height={image.height * scale}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border rounded shadow"
      >
        <Layer>
          <KonvaImage image={image} scaleX={scale} scaleY={scale} />

          {boxes.map((box) => (
            <React.Fragment key={box.id}>
              <Rect
                id={box.id}
                x={box.x * scale}
                y={box.y * scale}
                width={box.width * scale}
                height={box.height * scale}
                stroke={box.source === "yolo" ? "orange" : "green"}
                strokeWidth={2}
                dash={box.source === "manual" ? [5, 5] : []}
                draggable
                onClick={() => {
                  setSelectedId(box.id);
                  setSelectedBox(box);
                }}
                onDragMove={(e) =>
                  handleDragMove(box.id, {
                    x: e.target.x() / scale,
                    y: e.target.y() / scale,
                  })
                }
                onTransformEnd={(e) =>
                  handleTransformEnd(box.id, e.target)
                }
              />

              <Text
                x={box.x * scale}
                y={(box.y - 18) * scale}
                text={`${box.class} (${Math.round(box.confidence * 100)}%)`}
                fontSize={14}
                fill={box.source === "yolo" ? "orange" : "green"}
              />
            </React.Fragment>
          ))}

          {newBox && (
            <Rect
              x={newBox.x * scale}
              y={newBox.y * scale}
              width={newBox.width * scale}
              height={newBox.height * scale}
              stroke="blue"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}

          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            anchorSize={8}
            borderStroke="dodgerblue"
            anchorFill="white"
          />
        </Layer>
      </Stage>

      {selectedBox && (
        <div className="mt-4 p-3 border rounded bg-gray-100 w-64 text-black">
          <p className="font-semibold mb-2 text-black">Edit Label:</p>

          <select
            value={selectedBox.class}
            onChange={(e) => {
              const newClass = e.target.value;
              setBoxes((prev) =>
                prev.map((b) =>
                  b.id === selectedBox.id ? { ...b, class: newClass } : b
                )
              );
              setSelectedBox((prev) => ({ ...prev, class: newClass }));
            }}
            className="border p-2 rounded w-full text-black"
          >
            <option value="manual">manual</option>
            <option value="person">person</option>
            <option value="car">car</option>
            <option value="truck">truck</option>
            <option value="van">van</option>
            <option value="dog">dog</option>
            <option value="cat">cat</option>
          </select>

          <button
            onClick={() => {
              setBoxes((prev) => prev.filter((b) => b.id !== selectedId));
              setSelectedId(null);
              setSelectedBox(null);
            }}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded w-full"
          >
            Delete Box
          </button>
        </div>
      )}

      <p className="text-sm text-gray-600 mt-2 text-center">
        Click to edit | SHIFT + drag to draw | Drag/Resize to adjust
      </p>
    </div>
  );
}