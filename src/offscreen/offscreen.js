// Runs Gemini Nano through Chrome's Prompt API. It lives in an offscreen document
// because the API is exposed to window contexts, not to the extension service worker.
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, parseCategory } from '../shared/prompt.js';

const PROMPT_TIMEOUT_MS = 20000;

// Try English + Arabic input first, then English only if Arabic isn't supported.
const LANGUAGE_OPTIONS = [
  { arabic: true, expectedInputs: [{ type: 'text', languages: ['en', 'ar'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] },
  { arabic: false, expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] },
];

let basePromise = null;

async function status() {
  if (typeof LanguageModel === 'undefined') return { availability: 'unsupported', arabic: false };
  const [withArabic, englishOnly] = await Promise.all(
    LANGUAGE_OPTIONS.map(({ arabic, ...opts }) => LanguageModel.availability(opts).catch(() => 'unavailable')),
  );
  return { availability: englishOnly, arabic: withArabic === 'available' };
}

function getBaseSession() {
  basePromise ??= (async () => {
    for (const { arabic, ...opts } of LANGUAGE_OPTIONS) {
      if ((await LanguageModel.availability(opts)) !== 'available') continue;
      try {
        const session = await LanguageModel.create({
          ...opts,
          initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
        });
        return { session, arabic };
      } catch (err) {
        console.warn('[LIF] LanguageModel.create failed', opts, err);
      }
    }
    throw new Error('Gemini Nano is not available');
  })();
  basePromise.catch(() => (basePromise = null));
  return basePromise;
}

async function classify(text) {
  const { session } = await getBaseSession();
  // Clone per post so earlier posts don't pile up in the context window.
  const s = await session.clone();
  try {
    const raw = await s.prompt(text, {
      responseConstraint: RESPONSE_SCHEMA,
      signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS),
    });
    return { category: parseCategory(raw) };
  } catch (err) {
    basePromise = null; // force a fresh session next time in case this one is broken
    throw err;
  } finally {
    s.destroy();
  }
}

const handlers = { status, classify: (msg) => classify(msg.text) };

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;
  handlers[msg.type](msg).then(sendResponse, (err) => sendResponse({ error: String(err?.message ?? err) }));
  return true;
});
