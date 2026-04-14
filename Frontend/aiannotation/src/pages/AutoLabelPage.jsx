import ImageCanvas from "../components/ImageCanvas";
import { useState } from "react";

export default function AutoLabelPage() {
  const [images, setImages] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [labelSaved, setLabelSaved] = useState(false);  // visual feedback

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);

    const formatted = files.map((file, index) => ({
      id: index,
      file: file,
      preview: URL.createObjectURL(file),
      status: "pending",
      detections: []
    }));

    setImages(formatted);

    for (let i = 0; i < formatted.length; i++) {
      const file = formatted[i].file;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://127.0.0.1:8000/annotate/", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        setImages(prev =>
          prev.map((img, idx) =>
            idx === i
              ? {
                  ...img,
                  status: "done",
                  detections: data.detections
                }
              : img
          )
        );

      } catch (err) {
        console.error("Error processing image:", err);
      }
    }
  };

  const handleSaveLabels = async () => {
    if (selectedIndex === null) return;

    // images[selectedIndex].detections is always up-to-date because
    // ImageCanvas auto-syncs its internal boxes state on every user edit.
    const img = images[selectedIndex];

    const imageElement = new Image();
    imageElement.src = img.preview;

    imageElement.onload = async () => {
      const payload = {
        filename: img.file.name,
        width: imageElement.width,
        height: imageElement.height,
        boxes: img.detections,
      };

      try {
        await fetch("http://127.0.0.1:8000/labels/save-labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        // Show a brief green confirmation instead of a blocking alert
        setLabelSaved(true);
        setTimeout(() => setLabelSaved(false), 2000);
      } catch (err) {
        console.error("Save error:", err);
        alert("Failed to save labels to backend.");
      }
    };
  };

  const handleSaveAllLabels = async () => {
    for (let img of images) {
      const imageElement = new Image();
      imageElement.src = img.preview;

      await new Promise(resolve => {
        imageElement.onload = async () => {
          const payload = {
            filename: img.file.name,
            width: imageElement.width,
            height: imageElement.height,
            boxes: img.detections
          };

          try {
            await fetch("http://127.0.0.1:8000/save-labels/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
          } catch (err) {
            console.error("Error saving:", img.file.name);
          }

          resolve();
        };
      });
    }

    alert("All labels saved successfully!");
  };

  const goNext = () => {
    if (selectedIndex < images.length - 1) {
      setSelectedIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(prev => prev - 1);
    }
  };
  
  const handleSaveAll = () => {
  const exportData = images.map((img, index) => ({
    image_name: img.file.name,
    annotations: img.detections.map((box) => ({
      class: box.class,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      confidence: box.confidence || 1
    }))
  }));

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "annotations.json";
  a.click();

  URL.revokeObjectURL(url);
}; 

  return (
    <div className="h-screen bg-blue-950 text-white p-6 flex flex-col">

      <h1 className="text-2xl font-semibold mb-6">Upload Dataset</h1>

      <div className="mb-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          className="bg-blue-200 text-black px-4 py-2 rounded"
        />
      </div>

      {images.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span>Filters:</span>
            <select className="bg-blue-200 text-black px-3 py-1 rounded">
              <option>All</option>
              <option>Annotated</option>
              <option>Pending</option>
            </select>
          </div>

          <div className="border border-white rounded flex flex-1 overflow-hidden">

            {/* LEFT TABLE */}
            <div className="w-2/3 border-r border-white flex flex-col">

              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col style={{ width: "50px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "100px" }} />
                </colgroup>

                <thead className="border-b border-white">
                  <tr>
                    <th className="p-2">S.No</th>
                    <th className="p-2">Image</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Review</th>
                  </tr>
                </thead>
              </table>

              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-left border-collapse">
                  <colgroup>
                    <col style={{ width: "50px" }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "100px" }} />
                  </colgroup>

                  <tbody>
                    {images.map((img, index) => (
                      <tr key={index} className="border-b border-gray-600">
                        <td className="p-2">{index + 1}</td>

                        <td className="p-2">
                          <img
                            src={img.preview}
                            alt=""
                            style={{ width: "80px", height: "60px", objectFit: "cover" }}
                          />
                        </td>

                        <td className="p-2">
                          {img.status === "done" ? "✔ Done" : "⏳ Pending"}
                        </td>

                        <td className="p-2">
                          <button
                            onClick={() => setSelectedIndex(index)}
                            className="bg-blue-200 text-black px-3 py-1 rounded"
                          >
                            Click
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="w-1/3 p-4 flex flex-col items-center">

              {selectedIndex !== null ? (
                <>
                  <div className="flex justify-between items-center mb-3 w-full">
                    <span className="font-semibold">
                      Image {selectedIndex + 1} / {images.length}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={goPrev}
                        disabled={selectedIndex === 0}
                        className="bg-blue-500 px-3 py-1 rounded disabled:opacity-50"
                      >
                        ←
                      </button>

                      <button
                        onClick={goNext}
                        disabled={selectedIndex === images.length - 1}
                        className="bg-blue-500 px-3 py-1 rounded disabled:opacity-50"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded p-2">
                     <ImageCanvas
                      imageFile={images[selectedIndex].preview}
                      detections={images[selectedIndex].detections}
                      onSave={(boxes) => {
                        setImages(prev =>
                          prev.map((img, idx) =>
                            idx === selectedIndex
                              ? { ...img, detections: boxes }
                              : img
                          )
                        );
                      }}
                    />
                  </div>

                  <button
                    onClick={handleSaveLabels}
                    className={`mt-4 px-6 py-2 rounded transition-colors duration-300 font-medium ${
                      labelSaved
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {labelSaved ? "✓ Saved!" : "Update Label"}
                  </button>
                </>
              ) : (
                <p className="text-gray-400 mt-10">
                  Click "Review" to preview annotations
                </p>
              )}

            </div>

          </div>

          <div className="mt-4">
            <p>
              Annotated: {images.filter(i => i.status === "done").length} / {images.length}
            </p>

            <button
              onClick={handleSaveAll}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save All Labels
            </button>
          </div>
        </>
      )}

    </div>
  );
}