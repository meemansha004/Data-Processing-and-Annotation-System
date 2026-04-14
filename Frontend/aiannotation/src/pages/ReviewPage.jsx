import React, { useState } from "react";
import ImageUpload from "../components/ImageUpload";
import ImageCanvas from "../components/ImageCanvas";

export default function ReviewPage() {
  
  const [results, setResults] = useState([]); // [{ file, data }]

  // Called once YOLO inference finishes
  const handleResult = (allResults) => {
    setResults(allResults);
  };

  // Save YOLO-style labels to backend
  const handleSave = async (filename, boxes) => {
    const entry = results.find((r) => r.file.name === filename);
    if (!entry) {
      alert("Error: Image not found.");
      return;
    }

    // Load the image to extract width/height
    const img = new Image();
    img.src = URL.createObjectURL(entry.file);

    img.onload = async () => {
      const payload = {
        filename,
        width: img.width,
        height: img.height,
        boxes,
      };

      try {
        const res = await fetch(
          "http://localhost:8000/labels/save-labels",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        alert("Labels saved to: " + data.saved_to);
      } catch (err) {
        console.error("Save error:", err);
        alert("Saving failed. Check backend.");
      }
    };
  };

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-8 text-blue-700">
        Image Label Review
      </h1>

      {/* Upload Section */}
      {results.length === 0 && <ImageUpload onResult={handleResult} />}

      {/* Render Canvas for each image */}
      {results.length > 0 && (
        <div className="space-y-10">
          {results.map((r, index) => (
            <div key={index} className="border p-4 rounded-lg shadow">
              
              <h2 className="text-xl mb-4 text-gray-700">
                {r.file.name} — {r.data.num_detections} detections
              </h2>

              {/* Annotation Canvas */}
              <ImageCanvas
                imageFile={r.file}
                detections={r.data.detections}
                onSave={(finalBoxes) => handleSave(r.file.name, finalBoxes)}
              />

              {/* Save Labels Button */}
              <button
                onClick={() => window.saveCanvas()}

                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              >
                Save Labels
              </button>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
