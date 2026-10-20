// Shared by the Gemini Nano (offscreen) and Groq (background) classifiers.

export const CATEGORIES = ['opportunity', 'offer', 'event', 'advice', 'story', 'complaint', 'other'];
export const KEEP_CATEGORIES = new Set(['opportunity', 'offer', 'event']);

const MAX_CHARS = 1500;

export const SYSTEM_PROMPT = `You classify LinkedIn feed posts. Reply with JSON only, in the form {"category": "<category>"}.

Categories:
- opportunity: the author is offering a concrete opportunity the reader can act on: a job or internship they are hiring for, a call for applications, a scholarship, fellowship, grant, freelance gig, or call for speakers/papers.
- offer: a concrete offer the reader can claim: free access to a course or resource, a discount, promo code, giveaway, or free tickets.
- event: an invitation to an upcoming event (webinar, workshop, meetup, conference, hackathon, live session), usually with a date or registration link.
- advice: tips, lessons, how-tos, opinions, motivational or "thought leadership" content.
- story: personal stories, career journeys, life updates, celebrations, new-job announcements, gratitude posts, recaps of past events.
- complaint: rants, venting, criticism of companies, recruiters, or hiring processes.
- other: anything else (news, memes, generic company marketing, people looking for work).

Rules:
- A post ABOUT a topic (for example "tips for getting hired") is advice, not an opportunity.
- Someone announcing they got a job, or looking for a job (#OpenToWork), is story or other, not an opportunity.
- A recap of an event that already happened is story, not event.
- Posts may be in English or Arabic.

Examples:
"We're hiring a React developer in Dubai, send your CV to jobs@acme.com" -> {"category": "opportunity"}
"نبحث عن مصمم جرافيك للانضمام لفريقنا، للتقديم عبر الرابط" -> {"category": "opportunity"}
"Join our free AI workshop next Tuesday, register at the link" -> {"category": "event"}
"7 things I wish I knew before my first job interview" -> {"category": "advice"}
"بعد ٣ سنوات من الرفض، أخيراً حصلت على وظيفة أحلامي" -> {"category": "story"}
"Recruiters who ghost candidates after final rounds should be ashamed" -> {"category": "complaint"}`;

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: { category: { type: 'string', enum: CATEGORIES } },
  required: ['category'],
  additionalProperties: false,
};

export function prepareText(text) {
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}…` : text;
}

export function parseCategory(raw) {
  try {
    const category = JSON.parse(raw)?.category?.toLowerCase();
    if (CATEGORIES.includes(category)) return category;
  } catch {
    // Model ignored the JSON format; fall through to a lenient match.
  }
  const lower = String(raw).toLowerCase();
  return CATEGORIES.find((c) => lower.includes(c)) ?? null;
}
