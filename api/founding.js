// Founding member data, read from Stripe.
//
// GET /api/founding?session_id=cs_...   The purchaser's own view, reached from
//                                        the Payment Link's post-payment redirect.
// GET /api/founding?member=0007-<token>  The public view behind a shared link.

const {
  MEMBER_SLUG,
  describeMember,
  findPublicMember,
  isConfigured,
  isFoundingLink,
  isPaid,
  listFoundingSessions,
  stripeGet,
} = require('./_founding');

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

  if (!isConfigured()) {
    console.error('Founding API is missing Stripe configuration');
    return send(res, 500, { error: 'This page is not available yet.' });
  }

  const query = new URL(req.url, 'http://localhost').searchParams;
  const sessionId = query.get('session_id') || '';
  const memberSlug = query.get('member') || '';

  try {
    if (/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      const session = await stripeGet(`/checkout/sessions/${sessionId}`);
      if (!session || !isFoundingLink(session.payment_link) || !isPaid(session)) {
        return send(res, 404, { error: 'We could not find this founding membership.' });
      }

      const sessions = await listFoundingSessions();
      if (!sessions.some((s) => s.id === session.id)) {
        // Stripe's list can trail a just-completed checkout by a moment.
        return send(res, 503, { error: 'Your membership is still being recorded. Refresh in a moment.' });
      }
      return send(res, 200, describeMember(session, sessions, { includePrivate: true }));
    }

    if (MEMBER_SLUG.test(memberSlug)) {
      const member = await findPublicMember(memberSlug);
      if (!member) {
        return send(res, 404, { error: 'We could not find this founding membership.' });
      }

      return send(res, 200, member);
    }

    return send(res, 400, { error: 'Missing founding member reference.' });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'We could not reach our records just now. Please try again shortly.' });
  }
};
