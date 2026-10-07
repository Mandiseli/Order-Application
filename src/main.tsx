import {
  StrictMode,
  useEffect
} from "react";

import {
  createRoot
} from "react-dom/client";

import "./index.css";
import "./styles/common.css";

import "react-toastify/dist/ReactToastify.css";

import App from "./App.tsx";

import {
  startConnection,
  stopConnection
} from "./signalr";

function SignalRBootstrap() {
  useEffect(() => {
    let disposed = false;

    const syncConnection =
      async () => {
        if (disposed) {
          return;
        }

        const accessToken =
          localStorage.getItem(
            "accessToken"
          );

        if (accessToken) {
          await startConnection();
        } else {
          await stopConnection();
        }
      };

    void syncConnection();

    const handleAuthChanged =
      () => {
        void syncConnection();
      };

    window.addEventListener(
      "auth-changed",
      handleAuthChanged
    );

    window.addEventListener(
      "storage",
      handleAuthChanged
    );

    return () => {
      disposed = true;

      window.removeEventListener(
        "auth-changed",
        handleAuthChanged
      );

      window.removeEventListener(
        "storage",
        handleAuthChanged
      );
    };
  }, []);

  return null;
}

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <SignalRBootstrap />

    <App />
  </StrictMode>
);