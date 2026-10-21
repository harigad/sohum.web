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

// Reserving opens a choice between the base and the base with a bowl, then
// hands over to that option's Stripe Payment Link. An option without a link
// yet is shown as available soon.
const CHECKOUT_LINKS = {
  base: 'https://book.stripe.com/8x23cwetEdEQ4mKaBl9bO00',
  baseBowl: '',
};

const chooser = document.querySelector('#chooser');

if (chooser && typeof chooser.showModal === 'function') {
  const options = chooser.querySelectorAll('input[name="edition"]');
  const continueButton = chooser.querySelector('#chooser-continue');

  options.forEach((option) => {
    const isAvailable = Boolean(CHECKOUT_LINKS[option.value]);
    option.disabled = !isAvailable;
    option.closest('.chooser-option').querySelector('.chooser-option-soon').hidden = isAvailable;
  });

  const selectAvailable = () => {
    const checked = chooser.querySelector('input[name="edition"]:checked');
    if (!checked || checked.disabled) {
      const firstAvailable = Array.from(options).find((option) => !option.disabled);
      if (firstAvailable) {
        firstAvailable.checked = true;
      }
    }
    continueButton.disabled = !chooser.querySelector('input[name="edition"]:checked:not(:disabled)');
  };

  document.querySelectorAll('[data-reserve]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      selectAvailable();
      chooser.showModal();
    });
  });

  // A click on the backdrop closes the dialog.
  chooser.addEventListener('click', (event) => {
    if (event.target === chooser) {
      chooser.close();
    }
  });

  continueButton.addEventListener('click', () => {
    const checked = chooser.querySelector('input[name="edition"]:checked:not(:disabled)');
    if (checked) {
      window.location.href = CHECKOUT_LINKS[checked.value];
    }
  });
}
