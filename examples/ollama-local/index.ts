// Example: Trace local Ollama models — tok/s metrics
import { Traces } from 'traces-sdk';

const traces = new Traces({
  secretKey: process.env.TRACES_SECRET_KEY ?? 'sk-trc-...',
  baseUrl: 'http://localhost:3100',
});

async function main() {
  const trace = await traces.trace({ name: 'local-inference' });

  const span = trace.span({
    name: 'ollama-chat',
    model: 'gemma4:e4b',
    provider: 'ollama',
  });

  const startTime = Date.now();

  // Call Ollama directly
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemma4:e4b',
      messages: [{ role: 'user', content: 'Explain quantum computing simply.' }],
      stream: false,
    }),
  });

  const data = await res.json();
  const latencyMs = Date.now() - startTime;

  span
    .input({ messages: [{ role: 'user', content: 'Explain quantum computing simply.' }] })
    .output({ content: data.message?.content })
    .tokens(data.prompt_eval_count ?? 0, data.eval_count ?? 0)
    .end();

  console.log(`Model: gemma4:e4b`);
  console.log(`Latency: ${latencyMs}ms`);
  console.log(`Output tokens: ${data.eval_count}`);
  console.log(`tok/s: ${((data.eval_count / latencyMs) * 1000).toFixed(1)}`);
  console.log(data.message?.content);

  await traces.flush();
}

main();
