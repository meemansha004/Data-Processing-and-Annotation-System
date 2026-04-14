
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AutoLabelPage from "./pages/AutoLabelPage";
import PreprocessPage from "./pages/PreprocessPage";
import TabularPage from "./pages/TabularPage";
import ImagePage from "./pages/ImagePage";

function App() {
  return (
    
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/autolabel" element={<AutoLabelPage />} />
      <Route path="/preprocessing" element={<PreprocessPage />} />
      <Route path="/preprocessing/tabular" element={<TabularPage />} />
      <Route path="/preprocessing/image" element={<ImagePage />} />
    </Routes>
    
  );
}

export default App;