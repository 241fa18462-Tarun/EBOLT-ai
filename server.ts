import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get or initialize GoogleGenAI instance with server API key
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API: Health / status check
app.get('/api/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasKey,
    model: 'gemini-3.8-flash',
    workspace: 'EBOLT',
  });
});

// API: Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, currentNote, userProfile, requestChart } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please ensure your GEMINI_API_KEY is attached in Settings > Secrets.',
        requiresKey: true,
      });
    }

    // Build context-aware system instruction
    let contextAddition = '';
    if (currentNote && (currentNote.title || currentNote.content)) {
      contextAddition += `\n\n[Active Ebolt Note Context]:\nTitle: "${currentNote.title || 'Untitled'}"\nContent:\n${(currentNote.content || '').slice(0, 3000)}`;
    }
    if (userProfile && userProfile.name) {
      contextAddition += `\n\n[User Profile Context]: User name is ${userProfile.name}.`;
    }

    const systemInstruction = `You are Ebolt AI, the intelligent workspace bot and charting companion in EBOLT.
EBOLT is a high-productivity dark-mode workspace for note taking, idea synthesis, planning, and workflow acceleration.

Core Capabilities:
1. Intelligent Chat: Answer questions, craft documentation, brainstorm, summarize, and critique.
2. Note Operations: Offer suggestions to enhance, format, or organize notes. When drafting content the user can save to notes, provide clean, structured markdown.
3. Charting & Visual Data: If the user asks for a chart, graph, metrics breakdown, comparison, visual timeline, or data visualization, provide both an insightful written explanation AND a valid chart block with json format like:
\`\`\`chart
{
  "type": "bar", // supported types: "bar", "line", "pie", "progress"
  "title": "Weekly Productivity Breakdown",
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "datasets": [
    {
      "label": "Notes Created",
      "data": [3, 7, 5, 8, 4]
    }
  ],
  "summary": "Peak creation occurred on Thursday with 8 notes."
}
\`\`\`
The Ebolt interface automatically renders interactive visual charts whenever a \`\`\`chart block is included.
4. Tone: Professional, ultra-clean, supportive, inspiring, and concise. Avoid robotic cliches.${contextAddition}`;

    // Format chat contents for Gemini generateContent
    // Messages format: map role 'user' and 'model' (or 'assistant' -> 'model')
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // If chart was specifically toggled, prompt guidance
    if (requestChart && contents.length > 0) {
      const lastMsg = contents[contents.length - 1];
      if (lastMsg.role === 'user') {
        lastMsg.parts[0].text += '\n\nPlease also include a visual ```chart json block illustrating the relevant data or breakdown.';
      }
    }

    let response;
    const modelsToTry = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response && response.text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next fallback:`, err?.message || err);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('No response from AI model.');
    }

    const reply = response.text || 'No response generated.';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    const message = error?.message || 'Failed to generate response from AI.';
    return res.status(500).json({ error: message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ EBOLT Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
