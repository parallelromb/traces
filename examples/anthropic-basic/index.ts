// Example: Manual spans with Anthropic
import { Traces } from 'traces-sdk';
import Anthropic from '@anthropic-ai/sdk';

const traces = new Traces({
  secretKey: process.env.TRACES_SECRET_KEY ?? 'sk-trc-...',
  baseUrl: 'http://localhost:3100',
});

const anthropic = new Anthropic();

async function main() {
  // Create a trace to group related spans
  const trace = await traces.trace({
    name: 'summarize-article',
    userId: 'user-123',
  });

  // Create a span for the LLM call
  const span = trace.span({
    name: 'claude-summarize',
    model: 'claude-sonnet-4',
    provider: 'anthropic',
  });

  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Summarize the history of computing in 3 sentences.' },
    ],
  });

  // Record the span
  span
    .input({ messages: [{ role: 'user', content: 'Summarize the history of computing...' }] })
    .output({ content: response.content[0].type === 'text' ? response.content[0].text : '' })
    .tokens(response.usage.input_tokens, response.usage.output_tokens)
    .end();

  console.log(response.content[0]);

  await traces.flush();
}

main();
