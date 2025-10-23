import React from "react";
import ReactDOM from "react-dom/client";
import "./firebase"; // ¡import obligatorio para inicializar Firebase!
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
