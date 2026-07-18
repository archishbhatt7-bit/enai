import { createRoot } from "react-dom/client";
import React from "react";
// Force Vercel redeploy 1
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
