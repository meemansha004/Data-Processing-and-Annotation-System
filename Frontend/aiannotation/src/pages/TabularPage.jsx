import { useState } from "react";

const TabularPage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);
  const [showProcessedProfile, setShowProcessedProfile] = useState(false);

  const [showProblems, setShowProblems] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);;

  const [splitRatio, setSplitRatio] = useState(0.8);

  const [selectedSteps, setSelectedSteps] = useState({
    missing: true,
    duplicates: true,
    categorical: true,
    encoding: true,
    scaling: true,
    log: false,
    drop: false,
    date: false,
  });

  // Upload file
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setFileName(uploadedFile?.name || "");
  };

  // Analyze dataset
  const runAnalysis = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/preprocessing/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error("Error:", error);
    }

    setLoading(false);
  };

  // Apply preprocessing
  const applyPreprocessing = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("steps", JSON.stringify(selectedSteps));

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/preprocessing/apply",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      setProcessedData(data);

    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Toggle steps
  const toggleStep = (step) => {
    setSelectedSteps((prev) => ({
      ...prev,
      [step]: !prev[step],
    }));
  };

  const downloadDataset = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("steps", JSON.stringify(selectedSteps));
    formData.append("split_ratio", splitRatio);

    try {
        const response = await fetch(
        "http://127.0.0.1:8000/preprocessing/download",
        {
            method: "POST",
            body: formData,
        }
        );

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dataset_split.zip";
        a.click();

    } catch (error) {
        console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B2D48] text-white p-10">

      <h1 className="text-3xl font-bold mb-6">
        Tabular Data Pipeline
      </h1>

      {/* Upload */}
      <div className="bg-[#123A5A] p-6 rounded-xl mb-6">
        <h2 className="text-xl mb-4">Upload Dataset</h2>

        <input
          type="file"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
        />

        {fileName && (
          <p className="text-gray-300 mt-2">
            Uploaded: {fileName}
          </p>
        )}

        <button
          onClick={runAnalysis}
          disabled={!file || loading}
          className="mt-4 px-6 py-2 bg-[#1A4D6E] rounded-lg hover:bg-[#245d85]"
        >
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {/* Analysis */}
      {analysisResult && (
        <div className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#123A5A] p-4 rounded-xl">
              <p className="text-gray-300">Rows</p>
              <p className="text-2xl font-bold">{analysisResult.rows}</p>
            </div>

            <div className="bg-[#123A5A] p-4 rounded-xl">
              <p className="text-gray-300">Columns</p>
              <p className="text-2xl font-bold">{analysisResult.columns}</p>
            </div>

            <div className="bg-[#123A5A] p-4 rounded-xl">
              <p className="text-gray-300">Quality Score</p>
              <p className="text-2xl font-bold">
                {analysisResult.quality_score}
              </p>
            </div>
          </div>

        {/* ---------------- PROBLEMS DETECTED ---------------- */}
        <div className="bg-[#123A5A] p-4 rounded-xl mb-4">
        <button
            onClick={() => setShowProblems(!showProblems)}
            className="w-full text-left font-semibold flex justify-between"
        >
            Problems Detected
            <span>{showProblems ? "▲" : "▼"}</span>
        </button>

        {showProblems && (
            <div className="mt-3 text-sm text-gray-300">
            <pre>
                {JSON.stringify(analysisResult.problems, null, 2)}
            </pre>
            </div>
        )}
        </div>

        {/* ---------------- RECOMMENDED STEPS ---------------- */}
        <div className="bg-[#123A5A] p-4 rounded-xl mb-6">
        <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="w-full text-left font-semibold flex justify-between"
        >
            Recommended Steps
            <span>{showRecommendations ? "▲" : "▼"}</span>
        </button>

        {showRecommendations && (
            <div className="mt-3 text-sm text-gray-300">

            {analysisResult.problems && (
                <ul className="list-disc pl-5 space-y-1">

                {analysisResult.problems["Missing Values"] > 0 && (
                    <li>Handle missing values</li>
                )}

                {analysisResult.problems["Duplicate Rows"] > 0 && (
                    <li>Remove duplicates</li>
                )}

                {analysisResult.problems["Outliers detected in"]?.length > 0 && (
                    <li>Handle outliers</li>
                )}

                <li>Apply encoding for categorical columns</li>
                <li>Scale numerical features</li>

                </ul>
            )}

            </div>
        )}
        </div>

          {/* Step Selection */}
          <div className="bg-[#123A5A] p-6 rounded-xl">
            <h3 className="text-xl mb-4">
              Select Preprocessing Steps
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {Object.keys(selectedSteps).map((step) => (
                <label key={step}>
                  <input
                    type="checkbox"
                    checked={selectedSteps[step]}
                    onChange={() => toggleStep(step)}
                  />{" "}
                  {step}
                </label>
              ))}
            </div>

            <button
              onClick={applyPreprocessing}
              className="mt-6 px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700"
            >
              Apply Preprocessing
            </button>
          </div>

        </div>
      )}

      {processedData && (
            <div className="bg-[#123A5A] p-6 rounded-xl mt-6 space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                <h2 className="text-xl">Processed Results</h2>
                <button
                    onClick={() => setShowProcessed(!showProcessed)}
                    className="text-sm bg-[#1A4D6E] px-3 py-1 rounded"
                >
                    {showProcessed ? "Hide Data" : "View Data"}
                </button>
                </div>

                {/* Quality Score */}
                <div className="bg-[#0B2D48] p-4 rounded-xl">
                <p className="text-gray-300">Updated Quality Score</p>
                <p className="text-2xl font-bold">
                    {processedData.quality_score}
                </p>
                </div>

                {/* Data Preview */}
                {showProcessed && (
                <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                    <thead>
                        <tr>
                        {processedData.columns.map((col) => (
                            <th key={col} className="p-2 text-left">
                            {col}
                            </th>
                        ))}
                        </tr>
                    </thead>

                    <tbody>
                        {processedData.preview.map((row, i) => (
                        <tr key={i}>
                            {processedData.columns.map((col) => (
                            <td key={col} className="p-2">
                                {row[col] ?? "-"}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}

                {/* Profile Toggle */}
                <div>
                <button
                    onClick={() => setShowProcessedProfile(!showProcessedProfile)}
                    className="text-sm bg-[#1A4D6E] px-3 py-1 rounded"
                >
                    {showProcessedProfile ? "Hide Profile" : "View Data Profile"}
                </button>

                {showProcessedProfile && (
                    <div className="mt-4 space-y-4">

                    {/* Missing Values */}
                    <div>
                        <h3 className="font-semibold">Missing Values</h3>
                        <pre className="text-sm text-gray-300">
                        {JSON.stringify(
                            processedData.profile["Missing values per column"],
                            null,
                            2
                        )}
                        </pre>
                    </div>

                    {/* Data Types */}
                    <div>
                        <h3 className="font-semibold">Data Types</h3>
                        <pre className="text-sm text-gray-300">
                        {JSON.stringify(
                            processedData.profile["Data types"],
                            null,
                            2
                        )}
                        </pre>
                    </div>

                    </div>
                )}
                </div>

            </div>
         )}

        <div className="bg-[#123A5A] p-6 rounded-xl mt-6">

            <h2 className="text-lg font-semibold mb-4">
                Train-Test Split
            </h2>

            <p className="mb-2 text-sm text-gray-300">
                Train: {(splitRatio * 100).toFixed(0)}% | Test: {((1 - splitRatio) * 100).toFixed(0)}%
            </p>

            <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.05"
                value={splitRatio}
                onChange={(e) => setSplitRatio(e.target.value)}
                className="w-full"
            />

            <button
                onClick={downloadDataset}
                className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
                Download Split Dataset
            </button>

        </div>
      

    </div>
  );
};

export default TabularPage;