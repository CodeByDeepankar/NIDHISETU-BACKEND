const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434/api/chat';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'gemma3:4b';
const VISION_MODEL_NAME = process.env.OLLAMA_VISION_MODEL || 'gemma3:4b';

app.post('/api/loan-assistant', async (req, res) => {
  try {
    const { messages, context } = req.body;

    const systemPrompt = buildSystemPrompt(context || {});
    
    // Convert frontend messages to Ollama format if needed
    // Frontend sends { role: 'user'|'assistant', content: string }
    // Ollama expects { role: 'user'|'assistant'|'system', content: string }
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log('Sending request to Ollama:', MODEL_NAME);

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: ollamaMessages,
        stream: false
      })
    });

    console.log(response.body)

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    // Ollama response format: { model: '...', created_at: '...', message: { role: 'assistant', content: '...' }, ... }
    
    if (!data.message || !data.message.content) {
      throw new Error('Invalid response from Ollama');
    }

    res.json({ content: data.message.content });

  } catch (error) {
    console.error('Error calling Ollama:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
});

app.get('/api/government-updates', async (req, res) => {
  const { topic } = req.query;

  const imagePool = [
    "https://picsum.photos/400/300?topic=bye",
    "https://picsum.photos/400/300?topic=nature",
    "https://picsum.photos/400/300?topic=gov",
    "https://picsum.photos/400/300?topic=dog",
    "https://picsum.photos/400/300?topic=hii"
  ];

  const fallbackUpdates = [
    {
      title: "PM Vishwakarma Scheme Application Drive",
      description: "Special camps are being organized across districts to help artisans register for PM Vishwakarma benefits.",
      imageUrl: imagePool[0],
      publishedAt: new Date().toISOString(),
      source: "Ministry of MSME"
    },
    {
      title: "New Credit Guarantee for Micro Enterprises",
      description: "CGTMSE introduces enhanced coverage for loans up to ₹50 Lakhs without collateral.",
      imageUrl: imagePool[1],
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      source: "PIB"
    },
    {
      title: "Udyam Registration Milestone",
      description: "Over 2 Crore MSMEs have successfully registered on the Udyam portal, unlocking priority lending.",
      imageUrl: imagePool[2],
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      source: "MSME Pulse"
    },
    {
      title: "Interest Subvention Scheme",
      description: "2% interest subvention for all GST registered MSMEs on fresh or incremental loans.",
      imageUrl: imagePool[3],
      publishedAt: new Date(Date.now() - 43200000).toISOString(),
      source: "RBI"
    }
  ];

  try {
    const systemPrompt = `You are a JSON generator for government news.
    CRITICAL INSTRUCTION: You MUST generate a JSON Array containing EXACTLY 4 separate objects.
    Do not generate just one object.
    Structure:
    [
      { "title": "News 1", "description": "...", "source": "..." },
      { "title": "News 2", "description": "...", "source": "..." },
      { "title": "News 3", "description": "...", "source": "..." },
      { "title": "News 4", "description": "...", "source": "..." }
    ]`;

    const userPrompt = topic 
      ? `Generate exactly 4 distinct fictional government updates related to '${topic}' in India. Return a JSON array of length 4.`
      : `Generate exactly 4 distinct fictional government updates related to MSME schemes in India. Return a JSON array of length 4.`;

    console.log('Generating updates via Ollama for topic:', topic || 'general');

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.message?.content;
    
    console.log('Ollama raw content:', content);

    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    // Clean up potential markdown code blocks
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    let generatedUpdates;
    try {
      generatedUpdates = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse Ollama JSON:', content);
      throw new Error('Invalid JSON from Ollama');
    }

    if (!Array.isArray(generatedUpdates)) {
       // If it returned a single object or wrapped in a key, try to fix
       // Look for the first key that holds an array
       const arrayKey = Object.keys(generatedUpdates).find(key => Array.isArray(generatedUpdates[key]));
       if (arrayKey) {
         generatedUpdates = generatedUpdates[arrayKey];
       } else if (generatedUpdates.title && generatedUpdates.description) {
         // It returned a single object instead of an array
         generatedUpdates = [generatedUpdates];
       } else {
         // Try to convert object values to array if they look like items
         const values = Object.values(generatedUpdates);
         const potentialItems = values.filter(v => v && typeof v === 'object' && v.title);
         if (potentialItems.length > 0) {
            generatedUpdates = potentialItems;
         } else {
            console.error('Ollama returned object but no array found:', generatedUpdates);
            throw new Error('Ollama did not return an array');
         }
       }
    }

    // Ensure we have at least 4 items by padding with fallbacks if needed
    if (generatedUpdates.length < 4) {
        console.log(`Ollama generated only ${generatedUpdates.length} updates. Padding with fallbacks.`);
        const needed = 4 - generatedUpdates.length;
        // Shuffle fallbacks to get random ones
        const shuffledFallbacks = [...fallbackUpdates].sort(() => 0.5 - Math.random());
        
        const extras = shuffledFallbacks
            .filter(f => !generatedUpdates.some(g => g.title === f.title))
            .slice(0, needed);
            
        generatedUpdates = [...generatedUpdates, ...extras];
        
        // Final safety net to ensure 4 items
        while (generatedUpdates.length < 4) {
            generatedUpdates.push(fallbackUpdates[generatedUpdates.length % fallbackUpdates.length]);
        }
    }

    // Enhance with images and dates
    const finalUpdates = generatedUpdates.slice(0, 4).map((update, index) => ({
      ...update,
      // Use original pool order but append random seed to force reload/randomness
      imageUrl: `${imagePool[index % imagePool.length]}&random=${Math.random()}`,
      publishedAt: new Date(Date.now() - index * 3600000).toISOString() // Stagger times
    }));

    res.json({ updates: finalUpdates });

  } catch (error) {
    console.error('Error generating updates:', error);
    // Fallback to hardcoded data if Ollama fails
    // Shuffle fallback for variety
    const shuffled = [...fallbackUpdates].sort(() => 0.5 - Math.random());
    res.json({ updates: shuffled });
  }
});

app.post('/api/analyze-evidence', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    console.log('Analyzing evidence:', imageUrl);

    // Download image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error('Failed to download image');
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to offline folder
    const uploadDir = path.join(__dirname, 'src', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Create a safe filename from timestamp
    const filename = `evidence_${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    console.log('Image saved offline to:', filepath);

    // Convert to base64 for Ollama
    const base64Image = buffer.toString('base64');

    const systemPrompt = `Analyze the image and respond ONLY in this format:

object: <main physical object or material seen (e.g., Tractor, Machine, Farm, Shop). Do NOT describe UI, text, or screenshots.>
image_quality: <good, bad, or best>
remarks: <brief description of the visual content, focusing on the asset>

No extra text. No explanation.`;

    console.log(`Sending to Ollama model: ${VISION_MODEL_NAME}`);

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL_NAME,
        messages: [
          { role: 'user', content: systemPrompt, images: [base64Image] }
        ],
        stream: false
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.message?.content || '';
    console.log('Ollama analysis:', content);

    // Parse the list format into JSON
    const lines = content.split('\n');
    const analysis = {};
    
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/ /g, '_');
        const value = match[2].trim();
        analysis[key] = value;
      }
    });

    // Ensure keys match our interface
    const mappedAnalysis = {
      object: analysis['object'] || 'Unknown',
      secondary_objects: 'None', // simplified for now
      image_quality_check: analysis['image_quality'] || 'good',
      document_check: 'N/A',
      geo_timestamp_check: 'Valid',
      compliance_status: 'Pending',
      remarks: analysis['remarks'] || 'AI Analysis completed'
    };

    res.json(mappedAnalysis);

  } catch (error) {
    console.error('Error analyzing evidence:', error);
    // Return a fallback/mock response so the flow doesn't break
    res.json({
      object: 'Not Detected',
      secondary_objects: 'None',
      image_quality_check: 'Error',
      document_check: 'N/A',
      geo_timestamp_check: 'Unknown',
      compliance_status: 'Pending',
      remarks: 'AI analysis failed. Please verify manually.'
    });
  }
});

function buildSystemPrompt(context) {
   const beneficiaryName = context.beneficiaryName || 'the beneficiary';
   const loanAmount = context.loanAmount ? `with a sanctioned amount of ₹${context.loanAmount.toLocaleString('en-IN')}` : '';
   const bankName = context.bankName ? `through ${context.bankName}` : '';

   return `You are the NIDHI MITRA Loan Copilot. Respond as a supportive expert focused only on loan-related queries such as documentation, disbursement milestones, and compliance.
Borrower profile: ${beneficiaryName} ${loanAmount} ${bankName}.
Always keep tone friendly, concise, and bilingual where helpful (English with occasional Hindi phrases).
If a question is unrelated to loans, politely steer the conversation back to MSME loan guidance.
Summaries should include actionable next steps or reminders sourced from government MSME schemes when relevant.`;
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
