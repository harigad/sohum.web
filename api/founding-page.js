// Serves a shared founding page (/founding/0007-<token>) with the member's
// name in the title and link-preview tags. LinkedIn, X, iMessage and WhatsApp
// read these tags without running the page's script, so they have to be in
// the HTML itself. The member record is embedded too, so the page does not
// need to ask the API again.

const fs = require('fs');
const path = require('path');

const { findPublicMember, isConfigured } = require('./_founding');

const SITE_URL = 'https://sohum.studio';
const PAGE_PATH = path.join(process.cwd(), 'founding.html');

let pageTemplate;
const readPage = () => {
  if (!pageTemplate) {
    pageTemplate = fs.readFileSync(PAGE_PATH, 'utf8');
  }
  return pageTemplate;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

const replaceTag = (html, pattern, replacement) => html.replace(pattern, () => replacement);

const personalize = (html, member) => {
  const title = escapeHtml(`${member.name} is a Founding Member of SO HUM`);
  const description = escapeHtml(
    `Founding Member No. ${member.number}, one of the first thousand people helping bring SO HUM, an instrument for stillness, into the world.`
  );
  const url = escapeHtml(member.shareUrl);
  // Escaped so a name can never close the script element.
  const data = JSON.stringify(member).replace(/</g, '\\u003c');

  let page = html;
  page = replaceTag(page, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  page = replaceTag(page, /<meta\s+name="description"[^>]*\/>/, `<meta name="description" content="${description}" />`);
  page = replaceTag(page, /<meta\s+property="og:title"[^>]*\/>/, `<meta property="og:title" content="${title}" />`);
  page = replaceTag(
    page,
    /<meta\s+property="og:description"[^>]*\/>/,
    `<meta property="og:description" content="${description}" />\n    <meta property="og:url" content="${url}" />`
  );
  page = replaceTag(page, /<meta\s+name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${title}" />`);
  page = replaceTag(
    page,
    /<script src="\/home\.js"><\/script>/,
    `<script>window.foundingMemberData = ${data};</script>\n    <script src="/home.js"></script>`
  );
  return page;
};

module.exports = async (req, res) => {
  const memberSlug = new URL(req.url, SITE_URL).searchParams.get('member') || '';
  let html = readPage();
  let status = 200;
  let member = null;

  if (isConfigured()) {
    try {
      member = await findPublicMember(memberSlug);
      if (!member) {
        status = 404;
      }
    } catch (error) {
      // Fall back to the plain page; its script reports the problem.
      console.error(error);
    }
  }

  if (member) {
    html = personalize(html, member);
  }

  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    member ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' : 'no-store'
  );
  res.end(html);
};
