// A founding member's page. Purchasers arrive from Stripe with ?session_id=...
// and see their full page; anyone else arrives through a shared link
// (/founding/0007-<token>) and sees the public certificate. ?preview shows
// sample data for design work.

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session_id');
const memberMatch = window.location.pathname.match(/\/founding\/(\d{1,4}-[A-Za-z0-9_-]{10})\/?$/);

const sampleMember = {
  number: '0007',
  name: 'Your Name',
  joined: '2026-06-05T12:00:00Z',
  status: 'Confirmed',
  emailMasked: 'y****@example.com',
  wallProgress: 7,
  wallGoal: 1000,
  shareUrl: 'https://sohum.studio/founding/0007-preview000',
};

let foundingMember = null;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const fetchMember = async (query, attempt = 1) => {
  const response = await fetch(`/api/founding?${query}`, { headers: { Accept: 'application/json' } });
  const body = await response.json().catch(() => ({}));

  // A checkout that has only just completed can take a moment to be listed.
  if (response.status === 503 && attempt < 4) {
    await new Promise((resolve) => window.setTimeout(resolve, 2000 * attempt));
    return fetchMember(query, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(body.error || 'We could not find this founding membership.');
  }

  return body;
};

const render = (member, { isOwner }) => {
  const values = {
    displayName: member.name,
    id: member.number,
    joinedDate: formatDate(member.joined),
    preorderStatus: member.status,
    emailMasked: member.emailMasked,
    wallProgress: member.wallProgress,
    wallGoal: member.wallGoal,
  };

  document.querySelectorAll('[data-member]').forEach((node) => {
    const value = values[node.getAttribute('data-member')];
    if (value !== undefined && value !== null && value !== '') {
      node.textContent = String(value);
    }
  });

  document.querySelectorAll('[data-owner-only]').forEach((node) => {
    node.hidden = !isOwner;
  });
  document.querySelectorAll('[data-public-only]').forEach((node) => {
    node.hidden = isOwner;
  });

  const pageTitle = `${member.name} is a Founding Member of SO HUM`;
  document.title = pageTitle;
  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag) {
    descriptionTag.setAttribute('content', `${member.name} is helping bring SO HUM into the world.`);
  }

  const progressBar = document.querySelector('.wall-progress');
  const progressFill = document.querySelector('.wall-progress-fill');
  const progressPercentage = Math.min(100, Math.max(0, (member.wallProgress / member.wallGoal) * 100));

  if (progressBar) {
    progressBar.setAttribute('aria-valuemax', String(member.wallGoal));
    progressBar.setAttribute('aria-valuenow', String(member.wallProgress));
  }

  if (progressFill) {
    progressFill.style.width = `${progressPercentage}%`;
  }

  document.body.classList.remove('is-loading');
};

const showMissing = (message) => {
  const missing = document.querySelector('#member-missing');
  const missingMessage = document.querySelector('#member-missing-message');
  document.querySelector('main').hidden = true;
  document.querySelector('.nav-reserve').hidden = true;
  if (missingMessage) {
    missingMessage.textContent = message;
  }
  if (missing) {
    missing.hidden = false;
  }
  document.body.classList.remove('is-loading');
};

const load = async () => {
  if (params.has('preview')) {
    foundingMember = sampleMember;
    render(foundingMember, { isOwner: params.get('preview') !== 'public' });
    return;
  }

  if (!sessionId && !memberMatch) {
    window.location.replace('/#edition');
    return;
  }

  // Shared links arrive with the record already embedded by /api/founding-page.
  const embedded = window.foundingMemberData;
  if (!sessionId && embedded && memberMatch[1].startsWith(`${embedded.number}-`)) {
    foundingMember = embedded;
    render(foundingMember, { isOwner: false });
    return;
  }

  try {
    const query = sessionId
      ? `session_id=${encodeURIComponent(sessionId)}`
      : `member=${encodeURIComponent(memberMatch[1])}`;
    foundingMember = await fetchMember(query);
    render(foundingMember, { isOwner: Boolean(sessionId) });
  } catch (error) {
    showMissing(error.message);
  }
};

load();

const toast = document.querySelector('#copy-toast');
let toastTimer;

const showToast = (message) => {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
};

const copyLink = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(foundingMember.shareUrl);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = foundingMember.shareUrl;
      textArea.setAttribute('readonly', 'readonly');
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    showToast('Founding page link copied');
  } catch (error) {
    showToast('Could not copy link');
  }
};

const shareText =
  'I\'m a Founding Member of SO HUM, an instrument for stillness: frosted crystal resting in a sculpted cradle of wood.';

const tryNativeShare = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: document.title,
        text: shareText,
        url: foundingMember.shareUrl,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  return false;
};

const openShareWindow = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || !foundingMember) {
    return;
  }

  const action = button.getAttribute('data-action');

  if (action === 'view-certificate') {
    const certificate = document.querySelector('#certificate-section');
    if (certificate) {
      certificate.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  if (action === 'copy-link' || action === 'share-certificate') {
    await copyLink();
    return;
  }

  if (action === 'download-certificate') {
    showToast('Certificate download coming soon');
    return;
  }

  if (action === 'share') {
    const didShare = await tryNativeShare();
    if (!didShare) {
      await copyLink();
    }
    return;
  }

  if (action === 'share-linkedin') {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      foundingMember.shareUrl
    )}`;
    openShareWindow(linkedinUrl);
    return;
  }

  if (action === 'share-x') {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(foundingMember.shareUrl)}`;
    openShareWindow(xUrl);
  }
});
