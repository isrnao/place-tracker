import express from "express";
import { createRequestHandler } from "@react-router/express";

const app = express();

// Serve static files from the build directory
app.use(express.static("build/client"));

// Handle all other routes with React Router
app.all("*", createRequestHandler({
  // @ts-ignore - Build-time generated module
  build: () => import("../build/server/index.js")
}));

const PORT = process.env.PORT || 5174;

app.listen(PORT, () => {
  console.log(`SSR server listening on http://localhost:${PORT}`);
});
