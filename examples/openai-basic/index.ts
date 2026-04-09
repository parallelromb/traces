// Example: Auto-instrument OpenAI with Traces
import { Traces } from 'traces-sdk';
import OpenAI from 'openai';

const traces = new Traces({
  secretKey: process.env.TRACES_SECRET_KEY ?? 'sk-trc-...',
  baseUrl: 'http://localhost:3100',
});

const openai = traces.wrap(new OpenAI());

async function main() {
  // Every API call is automatically traced
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the meaning of life?' },
    ],
  });

  console.log(response.choices[0].message.content);

  // Flush pending spans before exit
  await traces.flush();
}

main();
