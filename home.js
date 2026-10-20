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

// The film plays silently until the visitor chooses to hear the bowl.
const film = document.querySelector('#film');
const listen = document.querySelector('#listen');

if (film && listen) {
  const label = listen.querySelector('.listen-label');

  listen.addEventListener('click', () => {
    film.muted = !film.muted;
    if (!film.muted) {
      film.volume = 0.8;
      film.play();
    }
    listen.setAttribute('aria-pressed', String(!film.muted));
    label.textContent = film.muted ? 'Listen' : 'Listening';
  });

  // Mute again when the film scrolls out of view.
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && !film.muted) {
      listen.click();
    }
  }).observe(film);
}
