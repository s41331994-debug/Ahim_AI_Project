import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Lazy initialize Gemini client to avoid crashes on startup if key is missing helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasi. Silakan tambahkan di Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoint to test health & configuration
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Main endpoint for AHIM AI generation
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, history, systemInstruction, provider, model, temperature, groqApiKey } = req.body;

      if (!prompt) {
         res.status(400).json({ error: "Permintaan kosong tidak valid." });
         return;
      }

      const finalTemperature = typeof temperature === "number" ? temperature : 0.5;

      // Combine default system instructions for AHIM AI with any requested override
      const baseSystemInstruction = 
        "Kamu adalah AHIM AI, sebuah asisten kecerdasan buatan berkecepatan tinggi dan berakurasi maksimal.\n" +
        "Kamu dirancang khusus untuk menjadi solusi serba bisa dalam penulisan dan pembuatan produk berbasis teks, dengan fokus utama pada sektor pendidikan dan kebutuhan umum/teknis.\n" +
        "Gaya bahasamu profesional, efisien, akurat, dan langsung pada intinya (tidak bertele-tele).\n" +
        "ATURAN OUTPUT:\n" +
        "1. Kecepatan dan Efisiensi: JANGAN memberikan kalimat pembuka atau penutup yang tidak perlu (seperti 'Tentu, saya akan membantu Anda membuat...', 'Berikut adalah...', atau 'Semoga membantu!'). Langsung berikan hasil/produk yang diminta.\n" +
        "2. Struktur: Selalu gunakan format Markdown (Heading, Bullet points, Numbering, Bold) agar output mudah dibaca dan diintegrasikan ke dalam antarmuka aplikasi.\n" +
        "3. Akurasi: Kode pemrograman harus bersih, dikomentari secara efisien, bebas dari error sintaksis. Fakta ilmiah/akademis harus akurat.\n" +
        "4. Jika instruksi dari pengguna kurang spesifik (misalnya hanya 'buatkan soal'), tanyakan dengan sangat singkat tingkat pendidikan dan mata pelajarannya apa.";

      const finalSystemInstruction = systemInstruction 
        ? `${baseSystemInstruction}\n\nKonteks tambahan / kebutuhan khusus:\n${systemInstruction}`
        : baseSystemInstruction;

      if (provider === "groq") {
        const apiKey = groqApiKey || process.env.GROQ_API_KEY;
        if (!apiKey) {
          res.status(400).json({ error: "Kunci API Groq (GROQ_API_KEY) tidak ditemukan. Silakan konfigurasi di panel samping (Streamlit Control Panel)." });
          return;
        }

        const groqModel = model || "llama-3.3-70b-versatile";

        // Build messages in OpenAI compatible format
        const messages = [];
        messages.push({
          role: "system",
          content: finalSystemInstruction
        });

        if (history && Array.isArray(history)) {
          history.forEach((msg: any) => {
            messages.push({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.text
            });
          });
        }

        messages.push({
          role: "user",
          content: prompt
        });

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: groqModel,
            messages: messages,
            temperature: finalTemperature,
            max_tokens: 4096
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          let errMsg = `Error dari Groq API (${response.status})`;
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.error?.message) {
              errMsg = parsed.error.message;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }

        const resData = await response.json();
        const generatedText = resData?.choices?.[0]?.message?.content || "";
        res.json({ text: generatedText, source: "groq", modelUsed: groqModel });
      } else {
        const ai = getGeminiClient();
        // We default to gemini-3.5-flash as recommended for fast, high-quality Indonesian text tasks
        const modelName = model || "gemini-3.5-flash";

        // Check if we have history to carry out a chat conversation
        if (history && Array.isArray(history) && history.length > 0) {
          // Format history into Contents structure
          const contents = history.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          }));

          // Append current prompt as the latest user message
          contents.push({
            role: "user",
            parts: [{ text: prompt }],
          });

          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: finalTemperature,
            },
          });

          res.json({ text: response.text, source: "gemini", modelUsed: modelName });
        } else {
          // Single shot generation
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: finalTemperature,
            },
          });

          res.json({ text: response.text, source: "gemini", modelUsed: modelName });
        }
      }
    } catch (error: any) {
      console.error("API proxy error:", error);
      res.status(500).json({
        error: error.message || "Terjadi kesalahan internal ketika menghubungi asisten AI.",
      });
    }
  });

  // Vite Integration for HMR and Assets
  if (process.env.NODE_ENV !== "production") {
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

startServer();
