const test = require('node:test');
const assert = require('node:assert');
require('../src/content/keywords.js');

const { classify, normalize } = globalThis.LIF.keywords;

const cases = [
  // English
  ['keep', "We're hiring! Looking for a Senior Backend Engineer (Go) to join our team in Riyadh. Send your CV to jobs@acme.com"],
  ['keep', 'Join us on Nov 12 for a free webinar on Kubernetes security. Register here: https://lnkd.in/x'],
  ['keep', 'Use promo code LAUNCH for 40% off our course this week only.'],
  ['keep', '𝗪𝗲 𝗮𝗿𝗲 𝗵𝗶𝗿𝗶𝗻𝗴 a data analyst — apply via the link below'],
  ['hide', '5 tips to land your dream job:\n1. Network\n2. Tailor your resume\nAgree?'],
  ['hide', "I'm thrilled to share that I'm starting a new position as Data Analyst at Acme! So grateful."],
  ['hide', 'Dear recruiters, ghosting candidates after 4 interviews is unacceptable.'],
  ['hide', 'Top 5 mistakes hiring managers make. Here\'s what to do instead.'],
  ['ambiguous', 'Big news from our team today.'],
  ['ambiguous', '#hiring tips: 5 things I look for in a resume'],
  // Arabic
  ['keep', 'نحن نوظف! مطلوب مهندس برمجيات. للتقديم أرسل سيرتك الذاتية'],
  ['keep', 'يسرّنا دعوتكم لحضور ورشة عمل مجانية عن الذكاء الاصطناعي، سجّل الآن'],
  ['keep', '#فرص_عمل شركة أكمي تعلن عن وظائف شاغرة'],
  ['hide', '٥ نصائح للحصول على وظيفة أحلامك'],
  ['hide', 'الحمد لله، يسعدني أن أعلن انضمامي إلى شركة أكمي'],
  ['hide', 'للأسف تم رفضي بعد ٤ مقابلات بدون أي رد'],
];

for (const [expected, text] of cases) {
  test(`${expected}: ${text.slice(0, 50)}`, () => {
    const r = classify(text);
    assert.strictEqual(r.verdict, expected, JSON.stringify(r));
  });
}

test('normalize folds Arabic letter variants and diacritics', () => {
  assert.strictEqual(normalize('فُرْصَةٌ أُخرى'), 'فرصه اخري');
});

// Real posts from a saved feed (Oct 2026). Ambiguous ones are expected to go to the LLM.
const feed = require('./fixtures/feed-2026-10-20.json');
const feedExpected = ['hide', 'ambiguous', 'ambiguous']; // Egyptian rant, corporate ad, free-subscription promo
feed.forEach((post, i) => {
  test(`real feed post ${i + 1}: ${feedExpected[i]}`, () => {
    assert.strictEqual(classify(post.text).verdict, feedExpected[i]);
  });
});
