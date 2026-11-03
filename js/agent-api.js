/* ===== JARVIS OFFICE v2 — AGENT API (Multi-Provider + Fallback) ===== */

const AGENT_PROVIDERS = {
  groq: {
    label: 'Groq',
    hint: 'Kostenlos — console.groq.com',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (empfohlen)' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (sehr schnell)' },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    keyPlaceholder: 'gsk_…',
  },
  gemini: {
    label: 'Google Gemini',
    hint: 'Kostenloses Kontingent — aistudio.google.com',
    models: [
      { id: 'gemini-1.5-flash',   label: 'Gemini 1.5 Flash (kostenlos)' },
      { id: 'gemini-1.5-flash-8b',label: 'Gemini 1.5 Flash 8B (schnellste)' },
      { id: 'gemini-1.5-pro',     label: 'Gemini 1.5 Pro (begrenzt kostenlos)' },
    ],
    defaultModel: 'gemini-1.5-flash',
    keyPlaceholder: 'AIza…',
  },
  together: {
    label: 'Together AI',
    hint: 'Kostenloses Kontingent — api.together.ai',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', label: 'Llama 3.3 70B (kostenlos)' },
      { id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', label: 'Llama 3.2 11B' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',           label: 'Mixtral 8x7B' },
    ],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    keyPlaceholder: 'tgp_…',
  },
  ollama: {
    label: 'Ollama (lokal)',
    hint: 'Vollständig kostenlos & offline — ollama.ai',
    models: [
      { id: 'llama3.2',   label: 'Llama 3.2 (empfohlen)' },
      { id: 'llama3.1',   label: 'Llama 3.1' },
      { id: 'mistral',    label: 'Mistral 7B' },
      { id: 'gemma2',     label: 'Gemma 2' },
      { id: 'phi3',       label: 'Phi-3 Mini' },
    ],
    defaultModel: 'llama3.2',
    keyPlaceholder: '(kein Key nötig)',
  },
  anthropic: {
    label: 'Anthropic Claude',
    hint: 'Bezahlt — console.anthropic.com',
    models: [
      { id: 'claude-haiku-4-5',  label: 'Haiku 4.5 (schnell & günstig)' },
      { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5 (ausgewogen)' },
      { id: 'claude-opus-4-5',   label: 'Opus 4.5 (maximal)' },
    ],
    defaultModel: 'claude-haiku-4-5',
    keyPlaceholder: 'sk-ant-…',
  },
};

// Fehlertypen, bei denen ein Fallback sinnvoll ist
const FALLBACK_ERRORS = ['rate_limit', 'quota', '429', '503', 'overloaded'];

function shouldFallback(msg) {
  const m = msg.toLowerCase();
  return FALLBACK_ERRORS.some(e => m.includes(e));
}

// ── Einzel-Anfrage (kein Streaming) ──────────────────────────────────────────
async function agentCallOnce(systemPrompt, userContent, maxTokens = 320) {
  const cfg = JarvisDB.get('agentConfig', {});
  const providers = _providerChain(cfg);

  let lastErr;
  for (const { provider, apiKey, model } of providers) {
    try {
      return await _callOnce(provider, apiKey, model, systemPrompt, userContent, maxTokens);
    } catch (e) {
      lastErr = e;
      if (!shouldFallback(e.message)) throw e;
      console.warn(`[AgentAPI] ${provider} Fehler (${e.message}) — versuche Fallback …`);
    }
  }
  throw lastErr;
}

async function _callOnce(provider, apiKey, model, system, user, maxTokens) {
  if (provider === 'groq' || provider === 'together') {
    const base = provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : 'https://api.together.xyz/v1';
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${resp.status}`); }
    const d = await resp.json();
    return d.choices[0].message.content.trim();

  } else if (provider === 'ollama') {
    const resp = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status} — läuft Ollama lokal?`);
    const d = await resp.json();
    return d.choices[0].message.content.trim();

  } else if (provider === 'gemini') {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { maxOutputTokens: maxTokens } }) }
    );
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini HTTP ${resp.status}`); }
    const d = await resp.json();
    return d.candidates[0].content.parts[0].text.trim();

  } else {
    // Anthropic
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system,
        messages: [{ role: 'user', content: user }] }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${resp.status}`); }
    const d = await resp.json();
    return d.content[0].text.trim();
  }
}

// ── Streaming-Anfrage ─────────────────────────────────────────────────────────
async function agentCallStream(systemPrompt, messages, onChunk, maxTokens = 2048) {
  const cfg = JarvisDB.get('agentConfig', {});
  const providers = _providerChain(cfg);

  let lastErr;
  for (const { provider, apiKey, model } of providers) {
    try {
      return await _callStream(provider, apiKey, model, systemPrompt, messages, onChunk, maxTokens);
    } catch (e) {
      lastErr = e;
      if (!shouldFallback(e.message)) throw e;
      onChunk(`[Rate-Limit bei ${provider} — wechsle zu Fallback …]\n`);
      console.warn(`[AgentAPI] Fallback nach ${provider} Fehler: ${e.message}`);
    }
  }
  throw lastErr;
}

async function _callStream(provider, apiKey, model, system, messages, onChunk, maxTokens) {
  if (provider === 'groq' || provider === 'together' || provider === 'ollama') {
    const base = provider === 'groq'    ? 'https://api.groq.com/openai/v1'
               : provider === 'together'? 'https://api.together.xyz/v1'
               :                          'http://localhost:11434/v1';
    const headers = provider === 'ollama'
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST', headers,
      body: JSON.stringify({ model, max_tokens: maxTokens, stream: true,
        messages: [{ role: 'system', content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${resp.status}`); }
    return await _readOpenAIStream(resp, onChunk);

  } else if (provider === 'gemini') {
    // Gemini hat kein SSE-Streaming in gleicher Weise — einmaliger Call, simuliertes Streaming
    const text = await _callOnce(provider, apiKey, model, system,
      messages.map(m => m.content).join('\n'), maxTokens);
    onChunk(text);
    return text;

  } else {
    // Anthropic
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: maxTokens, stream: true, system, messages }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${resp.status}`); }
    return await _readAnthropicStream(resp, onChunk);
  }
}

// ── SSE Parser ────────────────────────────────────────────────────────────────
async function _readOpenAIStream(resp, onChunk) {
  const reader = resp.body.getReader(), decoder = new TextDecoder();
  let full = '', buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try { const evt = JSON.parse(data); const c = evt.choices?.[0]?.delta?.content; if (c) { full += c; onChunk(full); } } catch {}
    }
  }
  return full;
}

async function _readAnthropicStream(resp, onChunk) {
  const reader = resp.body.getReader(), decoder = new TextDecoder();
  let full = '', buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try { const evt = JSON.parse(line.slice(6).trim()); if (evt.type === 'content_block_delta' && evt.delta?.text) { full += evt.delta.text; onChunk(full); } } catch {}
    }
  }
  return full;
}

// ── Provider-Kette aufbauen (primary → fallback) ──────────────────────────────
function _providerChain(cfg) {
  const chain = [];
  const primary = { provider: cfg.provider || 'groq', apiKey: cfg.apiKey || '', model: cfg.model || AGENT_PROVIDERS[cfg.provider || 'groq']?.defaultModel };
  chain.push(primary);
  // Fallback-Provider aus Einstellungen
  if (cfg.fallbackProvider && cfg.fallbackProvider !== primary.provider) {
    chain.push({
      provider: cfg.fallbackProvider,
      apiKey:   cfg.fallbackApiKey || '',
      model:    cfg.fallbackModel  || AGENT_PROVIDERS[cfg.fallbackProvider]?.defaultModel,
    });
  }
  return chain;
}
