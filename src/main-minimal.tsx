import { createRoot } from "react-dom/client";

const App = () => {
  return (
    <div>
      <h1>Minimal React Test</h1>
      <p>React is working!</p>
    </div>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);
