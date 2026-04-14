import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-[#062743] flex items-center justify-center">

    

      <div className="text-center">

        {/* Title */}
        <h1 className="text-9xl md:text-10xl font-semibold text-white mb-8">
          AutoML
        </h1>

        

        {/* Subtitle */}
        <p className="text-2xl md:text-3xl text-gray-300 mb-16">
          What are you working with today?
        </p>

        {/* Buttons */}
        <div className="flex gap-14 justify-center">

          {/* Data Preprocessing */}
          <button
            onClick={() => navigate("/preprocessing")}
            className="bg-[#b8c1ec] text-black px-10 py-4 rounded-full text-xl  font-medium hover:scale-105 transition"
          >
            Data Preprocessing
          </button>

          {/* Auto Labelling */}
          <button
            onClick={() => navigate("/autolabel")}
            className="bg-[#b8c1ec] text-black px-10 py-4 rounded-full text-xl font-medium hover:scale-105 transition"
          >
            Auto Labelling
          </button>

        </div>

      </div>
    </div>
  );
}