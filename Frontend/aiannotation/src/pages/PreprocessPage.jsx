import { useNavigate } from "react-router-dom";

const PreprocessPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white bg-[#0B2D48]">

      <h1 className="text-4xl font-bold mb-4">
        Data Preprocessing
      </h1>

      <p className="text-gray-300 mb-10">
        What are you working with today?
      </p>

      <div className="flex gap-8">

        {/* Tabular */}
        <div
          onClick={() => navigate("/preprocessing/tabular")}
          className="cursor-pointer p-10 bg-[#123A5A] rounded-2xl shadow-md hover:shadow-xl hover:scale-105 hover:bg-[#1A4D6E] transition"
        >
          <h2 className="text-xl font-semibold mb-2 text-white">
            📊 Tabular Dataset
          </h2>
          <p className="text-gray-300">CSV, Excel files</p>
        </div>

        {/* Image */}
        <div
          onClick={() => navigate("/preprocessing/image")}
          className="cursor-pointer p-10 bg-[#123A5A] rounded-2xl shadow-md hover:shadow-xl hover:scale-105 hover:bg-[#1A4D6E] transition"
        >
          <h2 className="text-xl font-semibold mb-2 text-white">
            🖼️ Image Dataset
          </h2>
          <p className="text-gray-300">Images, annotations</p>
        </div>

      </div>

    </div>
  );
};

export default PreprocessPage;