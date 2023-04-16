import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { MantineProvider } from "@mantine/core";

import "./index.css";
import App from "./App";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider
      theme={{
        colorScheme: "dark",
        components: {
          Tooltip: {
            defaultProps: {
              transitionProps: {
                transition: "pop",
              },
            },
          },
        },
      }}
      withNormalizeCSS
      withGlobalStyles
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
