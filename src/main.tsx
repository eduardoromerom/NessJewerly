import "./firebase";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
console.log("BOOT main", new Date().toISOString());
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App/></React.StrictMode>
);
