const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const header = document.querySelector('.site-header');
const experienceSection = document.querySelector('#experience');
const isFoundingPage = document.body.classList.contains('founding-member-page');
const nonExperienceSections = Array.from(
  document.querySelectorAll('main > section:not(#experience)')
);

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
  }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});

if (header && experienceSection) {
  const syncHeaderState = () => {
    const sectionBottom = experienceSection.getBoundingClientRect().bottom;
    const headerHeight = header.offsetHeight;
    const isPastExperience = sectionBottom <= headerHeight + 24;
    const hasScrolled = window.scrollY > 2;

    header.classList.toggle('past-experience', isPastExperience);
    document.body.classList.toggle('is-scrolled', hasScrolled);
  };

  syncHeaderState();
  window.addEventListener('scroll', syncHeaderState, { passive: true });
  window.addEventListener('resize', syncHeaderState);
}

if (nonExperienceSections.length > 0) {
  let blurTicking = false;

  const syncBelowBlurState = () => {
    const blurBelowThreshold = 0.4;
    const viewportHeight = window.innerHeight;

    nonExperienceSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = Math.max(rect.height, 1);
      const belowBottomRatio = Math.max(0, rect.bottom - viewportHeight) / sectionHeight;
      const shouldBlur = belowBottomRatio > blurBelowThreshold;

      section.classList.toggle('section-below-blurred', shouldBlur);
    });
  };

  const requestBlurSync = () => {
    if (blurTicking) {
      return;
    }

    blurTicking = true;
    window.requestAnimationFrame(() => {
      syncBelowBlurState();
      blurTicking = false;
    });
  };

  syncBelowBlurState();
  window.addEventListener('scroll', requestBlurSync, { passive: true });
  window.addEventListener('resize', requestBlurSync);
}

if (isFoundingPage) {
  const pathMatch = window.location.pathname.match(/\/founding\/(\d+)/i);

  const foundingMember = {
    id: pathMatch ? pathMatch[1].padStart(4, '0') : '0007',
    fullName: 'Harish Gadiraju',
    displayName: 'Harish Gadiraju',
    joinedDate: 'June 5, 2026',
    emailMasked: 'h****@gmail.com',
    preorderStatus: 'Confirmed',
    wallProgress: 7,
    wallGoal: 500,
    shareUrl: pathMatch
      ? `${window.location.origin}/founding/${pathMatch[1].padStart(4, '0')}`
      : 'https://sohum.studio/founding/0007',
    displayPreference: 'full_name',
  };

  const getPublicDisplayName = (member) => {
    if (member.displayPreference === 'anonymous') {
      return `Founding Member #${member.id}`;
    }

    if (member.displayPreference === 'first_name_last_initial') {
      const parts = member.fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0];
      }

      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }

    return member.displayName;
  };

  const publicName = getPublicDisplayName(foundingMember);
  const memberBindings = document.querySelectorAll('[data-member]');

  memberBindings.forEach((node) => {
    const key = node.getAttribute('data-member');
    if (!key) {
      return;
    }

    if (key === 'displayName') {
      node.textContent = publicName;
      return;
    }

    const value = foundingMember[key];
    if (value !== undefined && value !== null) {
      node.textContent = String(value);
    }
  });

  const pageTitle = `${publicName} is a Founding Member of SoHum`;
  document.title = pageTitle;
  const description = `${publicName} helped bring SoHum into the world - a device for stillness, sound, and presence.`;
  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag) {
    descriptionTag.setAttribute('content', description);
  }

  const progressBar = document.querySelector('.wall-progress');
  const progressFill = document.querySelector('.wall-progress-fill');
  const progressPercentage = Math.min(
    100,
    Math.max(0, (foundingMember.wallProgress / foundingMember.wallGoal) * 100)
  );

  if (progressBar) {
    progressBar.setAttribute('aria-valuemax', String(foundingMember.wallGoal));
    progressBar.setAttribute('aria-valuenow', String(foundingMember.wallProgress));
  }

  if (progressFill) {
    progressFill.style.width = `${progressPercentage}%`;
  }

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
    'I\'m proud to be a Founding Member of SoHum - a new sound meditation device designed for stillness, vibration, and presence.';

  const tryNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pageTitle,
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
    if (!button) {
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
      console.log('Download certificate placeholder');
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
}

