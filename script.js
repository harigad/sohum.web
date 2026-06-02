const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const header = document.querySelector('.site-header');
const experienceSection = document.querySelector('#experience');

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

