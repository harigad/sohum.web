// Founding member data, read from Stripe.
//
// GET /api/founding?session_id=cs_...   The purchaser's own view, reached from
//                                        the Payment Link's post-payment redirect.
// GET /api/founding?member=0007-<token>  The public view behind a shared link.
//
// A member's number is their position among completed checkouts on the
// founding Payment Link, oldest first. Completed sessions are never removed,
// even after a refund, so numbers never shift.
//
// Environment:
//   STRIPE_SECRET_KEY        Restricted key with read access to Checkout Sessions.
//   STRIPE_PAYMENT_LINK_ID   The founding Payment Link (plink_...).
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

// All completed sessions on the founding link, oldest first.
const listFoundingSessions = async () => {
  const sessions = [];
  let startingAfter = '';

  for (;;) {
    const page = await stripeGet(
      `/checkout/sessions?payment_link=${encodeURIComponent(process.env.STRIPE_PAYMENT_LINK_ID)}` +
        `&status=complete&limit=100${startingAfter ? `&starting_after=${startingAfter}` : ''}`
    );
    sessions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }
    startingAfter = page.data[page.data.length - 1].id;
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

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? 'private, max-age=300' : 'no-store');
  res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Method not allowed' });
  }

  const { STRIPE_SECRET_KEY, STRIPE_PAYMENT_LINK_ID, FOUNDING_LINK_SECRET } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_PAYMENT_LINK_ID || !FOUNDING_LINK_SECRET) {
    console.error('Founding API is missing Stripe configuration');
    return send(res, 500, { error: 'This page is not available yet.' });
  }

  const query = new URL(req.url, 'http://localhost').searchParams;
  const sessionId = query.get('session_id') || '';
  const memberSlug = query.get('member') || '';

  try {
    if (/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      const session = await stripeGet(`/checkout/sessions/${sessionId}`);
      if (!session || session.payment_link !== STRIPE_PAYMENT_LINK_ID || !isPaid(session)) {
        return send(res, 404, { error: 'We could not find this founding membership.' });
      }

      const sessions = await listFoundingSessions();
      if (!sessions.some((s) => s.id === session.id)) {
        // Stripe's list can trail a just-completed checkout by a moment.
        return send(res, 503, { error: 'Your membership is still being recorded. Refresh in a moment.' });
      }
      return send(res, 200, describeMember(session, sessions, { includePrivate: true }));
    }

    const slug = memberSlug.match(/^(\d{1,4})-([A-Za-z0-9_-]{10})$/);
    if (slug) {
      const sessions = await listFoundingSessions();
      const session = sessions[Number(slug[1]) - 1];
      if (!session || !tokensMatch(slug[2], signSession(session.id))) {
        return send(res, 404, { error: 'We could not find this founding membership.' });
      }

      return send(res, 200, describeMember(session, sessions, { includePrivate: false }));
    }

    return send(res, 400, { error: 'Missing founding member reference.' });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'We could not reach our records just now. Please try again shortly.' });
  }
};
