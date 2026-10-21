// The film plays silently until the visitor turns the sound on.
const film = document.querySelector('#film');
const listen = document.querySelector('#listen');
const watch = document.querySelector('#watch');

if (film && listen) {
  const label = listen.querySelector('.sound-toggle-label');

  const setSound = (on) => {
    film.muted = !on;
    if (on) {
      film.volume = 0.8;
      film.play();
    }
    listen.setAttribute('aria-pressed', String(on));
    label.textContent = on ? 'Sound off' : 'Sound on';
  };

  listen.addEventListener('click', () => setSound(film.muted));

  if (watch) {
    watch.addEventListener('click', () => {
      film.scrollIntoView({ behavior: 'smooth', block: 'center' });
      film.currentTime = 0;
      setSound(true);
    });
  }

  // Mute again when the film scrolls out of view.
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && !film.muted) {
      setSound(false);
    }
  }).observe(film);
}

// Each option goes to its own Stripe Payment Link. An option without a link
// yet is shown as available soon.
const CHECKOUT_LINKS = {
  base: 'https://book.stripe.com/8x23cwetEdEQ4mKaBl9bO00',
  baseBowl: '',
};

document.querySelectorAll('[data-checkout]').forEach((button) => {
  const link = CHECKOUT_LINKS[button.getAttribute('data-checkout')];
  const soon = button.parentElement.querySelector('.option-soon');

  if (link) {
    button.href = link;
  } else {
    button.removeAttribute('href');
    button.setAttribute('aria-disabled', 'true');
    if (soon) {
      soon.hidden = false;
    }
  }
});
