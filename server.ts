import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Initialize GoogleGenAI client with required 'User-Agent' header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// VertexIS System Instruction tailored to the Marsh Bites gourmet enterprise domain
function buildSystemInstruction(userRole?: string, currentTab?: string, branchName?: string): string {
  return `You are "MallowBot", the VertexIS AI Operational Assistant & Copilot for Marsh Bites Gourmet Marshmallow Enterprise.
Your mission is to provide accurate, step-by-step, actionable support to franchise branch staff, branch managers, and commissary administrators.

### Core Domain Knowledge:
- **Company**: The Marsh Bites Enterprise (Central Commissary in Legazpi City, Albay, supplying 19 franchise branches nationwide).
- **Confectionery Product**: Handcrafted gourmet marshmallows (Classic Vanilla, Roasted Campfire, Strawberry Velvet, Ube Halaya, Dark Choco Swirl, Matcha Cloud, etc.).
- **Shelf Life & Storage**: 45 days shelf life. Must be stored in dry, cool conditions under 24°C, away from direct sunlight. Spoilage/wastage must be logged promptly with reason (heat damaged, expired, transit damage, broken packaging).
- **3-Tier RBAC Roles**:
  1. **Branch Staff**: Frontline operations. Performs daily physical inventory counts, records manual sales, logs spoilage/wastage, inspects inbound stock receiving, and submits shift summary reports.
  2. **Branch Manager**: Store leadership. Validates daily shift logs and reconciles inventory variances (theoretical vs physical count), places wholesale stock requisitions (Silver 50 packs, Gold 100 packs, Platinum 200 packs), uploads GCash/Bank payment proofs, and tracks deliveries.
  3. **Super Admin / Commissary**: Manages commissary batch allocations, kitchen production stages (Queued -> In Kettle -> Curing -> Packaging & QC -> Ready for Dispatch), approves branch requisitions, tracks deliveries via J&T Express / In-House Fleet, reviews BIR official receipts, and monitors sales analytics.
- **Predictive Demand Forecasting**:
  - Uses Single Exponential Smoothing (SES) with alpha = 0.3:
    Formula: Forecast_{t+1} = 0.3 * Actual_t + 0.7 * Forecast_t
  - Alpha = 0.3 balances responsiveness to recent demand surges while filtering out noise.
  - Reorder Point (ROP) = (Average Daily Demand * Lead Time in days) + Safety Stock.

### Current User Context:
- Active Role: ${userRole || 'Branch User'}
- Current Screen/Tab: ${currentTab || 'General Workspace'}
${branchName ? `- Branch: ${branchName}` : ''}

### Response Guidelines:
- Be concise, professional, encouraging, and clear.
- Use bullet points, bold key terms, and step-by-step instructions.
- If referencing specific UI actions, mention exact button names (e.g. "Physical Counts", "Submit Requisition", "Log Wastage", "Validate Log").
- If the user asks math or formula questions, clearly show the calculation.
`;
}

// Multi-turn chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, userRole, currentTab, branchName } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Select valid model according to task requirements
    // - gemini-3.1-flash-lite: for tasks that should happen fast
    // - gemini-3.5-flash: for general tasks
    // - gemini-3.1-pro-preview: for particularly complex tasks
    let selectedModel = model;
    if (!selectedModel || !['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'].includes(selectedModel)) {
      selectedModel = 'gemini-3.5-flash';
    }

    const systemInstruction = buildSystemInstruction(userRole, currentTab, branchName);

    // Format contents for multi-turn history
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || "I'm ready to assist with your VertexIS workflow. Could you clarify your question?";
      return res.json({ reply, model: selectedModel });
    } else {
      // Fallback domain response when GEMINI_API_KEY is not configured
      const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      let fallback = "Hello! I am MallowBot, your VertexIS Operational Copilot.\n\n";

      if (lastUserMsg.includes('count') || lastUserMsg.includes('inventory')) {
        fallback += "**Daily Physical Count Procedure:**\n1. Navigate to **Physical Counts** tab.\n2. Count actual sealed packs on display shelves and backroom stock.\n3. Input the quantities into the count sheet.\n4. Any discrepancies against theoretical stock will be highlighted for manager review.\n5. Click **Submit Count** when finished.";
      } else if (lastUserMsg.includes('order') || lastUserMsg.includes('requisition')) {
        fallback += "**Wholesale Requisition Guide:**\n1. Go to **Stock Requisitions**.\n2. Select your tier: **Silver (50 packs)**, **Gold (100 packs)**, or **Platinum (200 packs)**.\n3. Use the **AI Demand Auto-Fill** to allocate flavors according to exponential smoothing forecasts.\n4. Attach proof of payment (GCash or Bank transfer).\n5. Commissary cooks your batch on a Made-to-Order basis!";
      } else if (lastUserMsg.includes('spoilage') || lastUserMsg.includes('waste')) {
        fallback += "**Spoilage & Wastage Logging:**\n1. Open **Wastage Log**.\n2. Select product SKU, damaged quantity, and reason (e.g. *Heat Damaged*, *Compromised Packaging*, *Expired*).\n3. Submit for isolation and audit disposal.";
      } else if (lastUserMsg.includes('formula') || lastUserMsg.includes('smoothing') || lastUserMsg.includes('alpha')) {
        fallback += "**Single Exponential Smoothing (SES):**\n- Formula: **F_{t+1} = α · A_t + (1 - α) · F_t**\n- VertexIS uses **α = 0.3** to smoothly adapt to shifting franchise demand while filtering short-term noise.";
      } else {
        fallback += `I can help you with:\n- **Frontline Operations**: Physical inventory counts, POS sales, and wastage reporting.\n- **Manager Workflows**: Shift validation, wholesale requisitions, and courier tracking.\n- **Commissary Production**: 4-stage batch processing and demand analytics.\n\nHow can I help you right now?`;
      }

      return res.json({ reply: fallback, model: selectedModel, fallback: true });
    }
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate response from AI Copilot.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VertexIS Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
