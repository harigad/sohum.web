// Founding member records, read from Stripe. Shared by /api/founding and
// /api/founding-page; the leading underscore keeps Vercel from serving it.
//
// A member's number is their position among completed checkouts on the
// founding Payment Link, oldest first. Completed sessions are never removed,
// even after a refund, so numbers never shift.
//
// Environment:
//   STRIPE_SECRET_KEY        Restricted key with read access to Checkout Sessions.
//   STRIPE_PAYMENT_LINK_ID   The founding Payment Links (plink_...), comma-separated:
//                            one for the base, one for the base and bowl.
//   FOUNDING_LINK_SECRET     Random string used to sign shareable links.

const crypto = require('crypto');

const STRIPE_API = 'https://api.stripe.com/v1';
const WALL_GOAL = 1000;
const SITE_URL = 'https://sohum.studio';

const stripeGet = async (path) => {
  const response = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Stripe responded ${response.status} for ${path.split('?')[0]}`);
  }

  return response.json();
};

const isPaid = (session) =>
  session.status === 'complete' &&
  (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');

const foundingLinkIds = () =>
  (process.env.STRIPE_PAYMENT_LINK_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const isFoundingLink = (paymentLinkId) => foundingLinkIds().includes(paymentLinkId);

// All completed sessions across the founding links, oldest first. Members are
// numbered in one sequence whichever option they bought.
const listFoundingSessions = async () => {
  const sessions = [];

  for (const linkId of foundingLinkIds()) {
    let startingAfter = '';

    for (;;) {
      const page = await stripeGet(
        `/checkout/sessions?payment_link=${encodeURIComponent(linkId)}` +
          `&status=complete&limit=100${startingAfter ? `&starting_after=${startingAfter}` : ''}`
      );
      sessions.push(...page.data);

      if (!page.has_more || page.data.length === 0) {
        break;
      }
      startingAfter = page.data[page.data.length - 1].id;
    }
  }

  return sessions
    .filter(isPaid)
    .sort((a, b) => a.created - b.created || (a.id < b.id ? -1 : 1));
};

const signSession = (sessionId) =>
  crypto
    .createHmac('sha256', process.env.FOUNDING_LINK_SECRET)
    .update(sessionId)
    .digest('base64url')
    .slice(0, 10);

const tokensMatch = (a, b) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const maskEmail = (email) => {
  if (!email || !email.includes('@')) {
    return '';
  }
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.max(3, local.length - 1))}@${domain}`;
};

const describeMember = (session, sessions, { includePrivate }) => {
  const number = String(sessions.findIndex((s) => s.id === session.id) + 1).padStart(4, '0');
  const details = session.customer_details || {};
  const member = {
    number,
    name: (details.name || '').trim() || `Founding Member No. ${number}`,
    joined: new Date(session.created * 1000).toISOString(),
    shareUrl: `${SITE_URL}/founding/${number}-${signSession(session.id)}`,
    wallProgress: sessions.length,
    wallGoal: WALL_GOAL,
  };

  if (includePrivate) {
    member.status = 'Confirmed';
    member.emailMasked = maskEmail(details.email);
  }

  return member;
};

const isConfigured = () =>
  Boolean(
    process.env.STRIPE_SECRET_KEY &&
      foundingLinkIds().length > 0 &&
      process.env.FOUNDING_LINK_SECRET
  );

const MEMBER_SLUG = /^(\d{1,4})-([A-Za-z0-9_-]{10})$/;

// The public record behind a shared link, or null when the link is not genuine.
const findPublicMember = async (memberSlug) => {
  const slug = (memberSlug || '').match(MEMBER_SLUG);
  if (!slug) {
    return null;
  }

  const sessions = await listFoundingSessions();
  const session = sessions[Number(slug[1]) - 1];
  if (!session || !tokensMatch(slug[2], signSession(session.id))) {
    return null;
  }

  return describeMember(session, sessions, { includePrivate: false });
};

module.exports = {
  MEMBER_SLUG,
  describeMember,
  findPublicMember,
  isConfigured,
  isFoundingLink,
  isPaid,
  listFoundingSessions,
  stripeGet,
};
