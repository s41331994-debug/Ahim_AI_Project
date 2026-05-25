import express from "express";
import path from "path";
import app from "./api-app";

const PORT = 3000;

// Setup local server block (Vite frontend middleware & Port 3000 listener)
async function setupLocalServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AHIM AI backend server is running on port ${PORT}`);
  });
}

// Only launch standalone web listener when not running as a Vercel Serverless Function
if (!process.env.VERCEL) {
  setupLocalServer();
}

export default app;
