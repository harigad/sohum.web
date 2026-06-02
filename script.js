const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const header = document.querySelector('.site-header');
const experienceSection = document.querySelector('#experience');
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

