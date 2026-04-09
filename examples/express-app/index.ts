// Example: Express app with Traces middleware-style integration
import express from 'express';
import { Traces } from 'traces-sdk';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const traces = new Traces({
  secretKey: process.env.TRACES_SECRET_KEY ?? 'sk-trc-...',
  baseUrl: 'http://localhost:3100',
});

// Wrap the OpenAI client once
const openai = traces.wrap(new OpenAI(), {
  traceName: 'express-api',
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: message },
    ],
  });

  res.json({
    reply: response.choices[0].message.content,
  });
});

app.listen(3000, () => {
  console.log('Express app on http://localhost:3000');
  console.log('Every /api/chat call is automatically traced');
});
