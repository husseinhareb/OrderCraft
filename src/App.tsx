import "./App.css";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightPanel from "./components/RightPanel/RightPanel";

function App() {
  return (
    <div className="app-container">
      <LeftPanel />
      <RightPanel />
    </div>
  );
}

export default App;
