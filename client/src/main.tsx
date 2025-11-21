import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { prewarmFormatCache } from "./lib/format-utils";

// Prewarm the format cache for instant number formatting
prewarmFormatCache();

createRoot(document.getElementById("root")!).render(<App />);
