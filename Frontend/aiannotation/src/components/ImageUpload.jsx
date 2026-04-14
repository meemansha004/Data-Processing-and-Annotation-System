import React, { useState } from "react";

export default function ImageUpload({ onResult }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (files.length === 0) return alert("Choose at least one image first");
    setLoading(true);
    setProgress(0);

    const total = files.length;
    const results = [];

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://127.0.0.1:8000/annotate/", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();
        results.push({ file, data });

        // Update progress bar
        setProgress(Math.round(((i + 1) / total) * 100));
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
      }
    }

    setLoading(false);
    onResult(results); // Send all results back
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files))}
        className="border rounded p-2"
      />

      {files.length > 0 && (
        <p className="text-sm text-gray-600">
          Selected {files.length} image{files.length > 1 ? "s" : ""}
        </p>
      )}

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? `Processing... ${progress}%` : "Upload & Annotate"}
      </button>
    </div>
  );
}
