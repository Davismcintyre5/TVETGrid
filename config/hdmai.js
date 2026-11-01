const axios = require('axios');
const env = require('./env');

const client = axios.create({
  baseURL: env.hdmAi.apiUrl,
  timeout: env.hdmAi.timeoutMs,
  headers: {
    Authorization: `Bearer ${env.hdmAi.apiKey}`,
    'Content-Type': 'application/json',
  },
});

async function complete({ message, systemPrompt, messages, temperature, maxTokens }) {
  const body = {
    message,
    system_prompt: systemPrompt,
    temperature: temperature ?? env.hdmAi.temperature,
    max_tokens: maxTokens ?? env.hdmAi.maxTokens,
  };
  if (messages) body.messages = messages;
  const { data } = await client.post('/completion', body);
  if (!data || data.success !== true) {
    const err = new Error(data?.error || 'HDM AI completion failed');
    err.code = 'HDM_AI_FAILED';
    throw err;
  }
  return {
    reply: data.data.reply,
    model: data.data.model,
    tokensUsed: data.data.tokens_used,
    provider: data.data.provider,
  };
}

module.exports = { client, complete };