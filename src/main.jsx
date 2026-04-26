import React from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App.jsx";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("OrbitX render failed", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-screen">
          <p className="eyebrow">OrbitX recovered</p>
          <h1>Something in the live sky feed failed.</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Reload OrbitX</button>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
