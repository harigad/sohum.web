const nav = document.querySelector('#nav');
const hero = document.querySelector('.hero');

if (nav && hero) {
  const syncNav = () => {
    nav.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < nav.offsetHeight * 2);
  };

  syncNav();
  window.addEventListener('scroll', syncNav, { passive: true });
}

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
);

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
