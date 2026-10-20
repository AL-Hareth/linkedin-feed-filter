// LinkedIn's DOM changes often. When the filter stops working, this is the file to update.
// Current feed (Oct 2026) is LinkedIn's server-driven React UI: hashed class names, so we
// rely on role/componentkey/data-testid. Legacy selectors are kept for older layouts.
(function (root) {
  const LIF = (root.LIF = root.LIF || {});

  LIF.selectors = {
    // One feed item. Only the outermost match is used, so overlapping selectors are fine.
    post: [
      '[role="listitem"][componentkey^="update-card-focus"]',
      // legacy
      'div[data-id^="urn:li:activity:"]',
      'div[data-id^="urn:li:aggregate:"]',
      'div[data-urn^="urn:li:activity:"]',
      'div[data-urn^="urn:li:aggregate:"]',
      'div.feed-shared-update-v2',
    ].join(','),

    // The feed list itself. Its direct children are the feed items, which is how ads that
    // don't use the normal post wrapper are still found and hidden.
    feed: '[data-testid="mainFeed"]',

    // Ads: a short header label (matched on normalized text, outside the post body) or
    // ad click-tracking links. Either one marks the whole feed item as promoted.
    adLabel: /^(promoted|promoted by\b.*|sponsored|مروج|ممول|اعلان)$/,
    adLink: 'a[href*="li_fat_id="]',

    // Attributes holding a stable per-post id, checked in order.
    keyAttrs: ['componentkey', 'data-urn', 'data-id'],

    // The post's own text (and the reshared post's text), excluding author name and headline,
    // since headlines like "Recruiter | We're hiring" would fool the keyword scorer.
    text: [
      '[data-testid="expandable-text-box"]',
      // legacy
      '.update-components-text',
      '.feed-shared-update-v2__description',
      '.feed-shared-inline-show-more-text',
    ].join(','),
  };
})(globalThis);
