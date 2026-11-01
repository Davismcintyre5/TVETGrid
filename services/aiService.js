const crypto = require('crypto');
const { complete } = require('../config/hdmai');
const { getClient } = require('../config/redis');
const env = require('../config/env');
const queueService = require('./queueService');
const logger = require('../utils/logger');

const CACHE_TTL = 86400;
const TUTOR_SYSTEM_PROMPT = `You are TVETGrid AI Tutor. Help TVET students understand trade and technical subjects.
Be concise, practical, and use examples from real trade work.
If the question is unrelated to education or TVET, politely redirect.
Never invent facts. If you are unsure, say so.`;

function hashKey(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 32);
}

async function cacheGet(key) {
  if (!env.redis.enabled) return null;
  try {
    const redis = getClient();
    if (!redis) return null;
    const raw = await redis.get(`ai:cache:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function cacheSet(key, value) {
  if (!env.redis.enabled) return;
  try {
    const redis = getClient();
    if (!redis) return;
    await redis.set(`ai:cache:${key}`, JSON.stringify(value), 'EX', CACHE_TTL);
  } catch (err) { logger.warn('aiService: cache write failed', { err: err.message }); }
}

async function tutorAsk({ userId, paperId, question, context }) {
  if (!question || !question.trim()) throw new Error('question required');
  const key = hashKey({ q: question.trim().toLowerCase(), paperId: paperId || null, context: context || null });

  const cached = await cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const systemPrompt = context
    ? `${TUTOR_SYSTEM_PROMPT}\n\nCurrent context:\n${context}`
    : TUTOR_SYSTEM_PROMPT;

  const res = await complete({
    message: question.trim(),
    systemPrompt,
  });

  const result = {
    reply: res.reply,
    model: res.model,
    tokensUsed: res.tokensUsed,
    provider: res.provider,
    paperId: paperId || null,
  };

  await cacheSet(key, result);
  logger.info('aiService: tutor answer', { userId, tokensUsed: res.tokensUsed });
  return result;
}

async function enqueueGenerateQuestions({ noteId, count = 5, userId }) {
  const job = await queueService.enqueue('ai.generateQuestions', { noteId, count, userId });
  return { success: true, jobId: job.id, queued: true };
}

async function deliverGenerateQuestions({ noteId, count }) {
  const Note = require('../models/admin/Note');
  const note = await Note.findById(noteId).lean();
  if (!note) throw new Error('Note not found');

  const sourceText = note.bodyMd || '';
  if (!sourceText.trim()) throw new Error('Note has no bodyMd content to generate questions from');

  const systemPrompt = `You are TVETGrid question generator. Produce multiple-choice past-paper style questions from the supplied notes.
Return strict JSON: an array of objects with keys: stem (string), options (array of 4 strings), answer (string, exactly one of the options), solution (string), difficulty ("easy"|"medium"|"hard"), marks (number 1-5).
Do not include any text outside the JSON array.`;

  const res = await complete({
    message: `Generate ${count} questions from these notes:\n\n${sourceText}`,
    systemPrompt,
  });

  let questions = [];
  try {
    const match = res.reply.match(/\[[\s\S]*\]/);
    questions = match ? JSON.parse(match[0]) : [];
  } catch (err) {
    logger.warn('aiService: question JSON parse failed', { err: err.message });
  }
  return { questions, tokensUsed: res.tokensUsed };
}

queueService.registerHandler('ai.generateQuestions', deliverGenerateQuestions);

module.exports = {
  tutorAsk,
  enqueueGenerateQuestions,
  deliverGenerateQuestions,
};