const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const OLLAMA_ENDPOINT = 'http://172.29.96.1:11434/api/chat';
const MODEL_NAME = 'gemma3:4b';

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

function buildSystemPrompt(context) {
   const beneficiaryName = context.beneficiaryName || 'the beneficiary';
   const loanAmount = context.loanAmount ? `with a sanctioned amount of ₹${context.loanAmount.toLocaleString('en-IN')}` : '';
   const bankName = context.bankName ? `through ${context.bankName}` : '';

   return `You are the NIDHI SETU Loan Copilot. Respond as a supportive expert focused only on loan-related queries such as documentation, disbursement milestones, and compliance.
Borrower profile: ${beneficiaryName} ${loanAmount} ${bankName}.
Always keep tone friendly, concise, and bilingual where helpful (English with occasional Hindi phrases).
If a question is unrelated to loans, politely steer the conversation back to MSME loan guidance.
Summaries should include actionable next steps or reminders sourced from government MSME schemes when relevant.`;
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
