import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import { AIRTABLE_CONFIG } from "./constants";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes for Airtable proxying
  app.get("/api/airtable", async (req, res) => {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_CONFIG.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        return res.status(response.status).json({ error: errorData.error?.message || 'Failed to fetch from Airtable' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Airtable Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/airtable/:recordId", async (req, res) => {
    const { recordId } = req.params;
    const { fields } = req.body;
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}/${recordId}`;
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_CONFIG.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        return res.status(response.status).json({ error: errorData.error?.message || 'Failed to update Airtable record' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Airtable Update Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
