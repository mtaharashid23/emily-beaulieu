gsap.registerPlugin(ScrollTrigger);

/* ============ LENIS SMOOTH SCROLL ============ */
const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ============ PRELOADER -> HERO ENTRANCE (single continuous timeline) ============ */
window.addEventListener('DOMContentLoaded', () => {

  const preloader = document.getElementById('preloader');
  const bar = preloader ? preloader.querySelector('.pre-bar i') : null;

  const master = gsap.timeline();

  if (preloader) {
    master.to(bar, { width: '100%', duration: 1.1, ease: 'power2.inOut' })
      .to(preloader, { yPercent: -100, duration: .9, ease: 'power4.inOut' }, '-=.15')
      .set(preloader, { display: 'none' });
  }

  const heroLines = document.querySelectorAll('.hero-copy h1 .line');
  if (heroLines.length) {
    master.from(heroLines, {
      yPercent: 110, duration: 1, stagger: .08, ease: 'power4.out'
    }, preloader ? '-=.45' : 0);
  }
  master.from('.hero-copy p, .hero-cta', {
    y: 24, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out'
  }, '-=.5');
  master.from('.hero-visual', {
    x: 40, opacity: 0, duration: 1, ease: 'power3.out'
  }, '-=.9');
  master.from('.hero-badge', {
    scale: 0, opacity: 0, duration: .6, ease: 'back.out(2)'
  }, '-=.4');

  master.add(() => ScrollTrigger.refresh());

  initHeaderScroll();
  initSplitTypeHeadings();
  initRevealAnimations();
  initGridBatches();
  initAlmonds();
  initScrollProgress();

  const imgs = Array.from(document.images);
  let pending = imgs.filter(img => !img.complete).length;
  if (pending === 0) {
    ScrollTrigger.refresh();
  } else {
    imgs.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => { pending -= 1; if (pending <= 0) ScrollTrigger.refresh(); }, { once: true });
        img.addEventListener('error', () => { pending -= 1; if (pending <= 0) ScrollTrigger.refresh(); }, { once: true });
      }
    });
  }
});

window.addEventListener('load', () => ScrollTrigger.refresh());

/* ============ HEADER ON SCROLL ============ */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  ScrollTrigger.create({
    start: 80,
    onUpdate: (self) => { header.classList.toggle('scrolled', self.scroll() > 80); }
  });
}

/* ============ MOBILE DRAWER ============ */
const navToggle = document.querySelector('.nav-toggle');
const drawer = document.querySelector('.mobile-drawer');
const overlay = document.querySelector('.drawer-overlay');
const drawerClose = document.querySelector('.drawer-close');

function openDrawer() {
  if (!drawer) return;
  drawer.classList.add('open');
  overlay.classList.add('show');
  lenis.stop();
}
function closeDrawer() {
  if (!drawer) return;
  drawer.classList.remove('open');
  overlay.classList.remove('show');
  lenis.start();
}
if (navToggle) navToggle.addEventListener('click', openDrawer);
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (overlay) overlay.addEventListener('click', closeDrawer);
document.querySelectorAll('.mobile-drawer a').forEach(a => a.addEventListener('click', closeDrawer));

/* ============ SCROLL REVEAL — single source of truth ============
   Every element that should fade/slide in just needs class="reveal-up".
   No element is ever targeted by more than one tween — that was the bug
   causing sections (like the CTA strip) to stay stuck at opacity:0. */
function initRevealAnimations() {
  /* book/blog/store cards are handled separately by initGridBatches()
     below (so they can reveal in a staggered wave per row). Excluding
     them here stops the double-tween bug that left elements stuck
     invisible earlier. */
  gsap.utils.toArray('.reveal-up:not(.book-card):not(.blog-card):not(.store-card)').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onComplete: () => {
        /* The .reveal-up CSS rule (opacity:0; transform:translateY(50px))
           was still active after this tween finished, since the class
           itself was never removed — clearProps('transform') was simply
           handing control back to that same CSS rule, which snapped the
           element straight back down to translateY(50px) while opacity
           stayed at the inline 1 GSAP had set. Removing the class first
           means there's nothing left to fight the cleared inline style. */
        el.classList.remove('reveal-up');
        gsap.set(el, { clearProps: 'all' });
      }
    });
  });

  gsap.utils.toArray('.split').forEach((sp) => {
    const copy = sp.querySelector('.split-copy');
    if (copy && copy.children.length) {
      /* skip headings with [data-split] — SplitType already animates
         their words individually. Animating the parent too caused the
         heading to sit at opacity:0 until a second, later trigger fired,
         which is why some headings/text never appeared to reveal. */
      const children = Array.from(copy.children).filter(child => !child.hasAttribute('data-split'));
      if (children.length) {
        gsap.from(children, {
          opacity: 0, y: 30, duration: .8, stagger: .08, ease: 'power3.out',
          scrollTrigger: { trigger: sp, start: 'top 75%' }
        });
      }
    }
  });
}

/* ============ GRID BATCHES — book / blog / store cards ============
   Cards start hidden via the shared .reveal-up CSS rule (opacity:0,
   translateY(50px)) so there's no flash-then-hide jump once JS runs.
   ScrollTrigger.batch groups cards that enter the viewport together so
   a whole row animates in as one smooth, staggered wave. */
function initGridBatches() {
  ScrollTrigger.batch('.book-card.reveal-up, .blog-card.reveal-up, .store-card.reveal-up', {
    start: 'top 92%',
    onEnter: (batch) => {
      batch.forEach(card => card.classList.add('is-revealing'));
      gsap.to(batch, {
        y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .12,
        overwrite: true,
        onComplete: () => batch.forEach(card => {
          /* same fix as initRevealAnimations: drop the .reveal-up class
             (which still holds transform:translateY(50px)) before
             clearing inline styles, otherwise the card snaps back down
             the moment the inline transform is removed. */
          card.classList.remove('is-revealing', 'reveal-up');
          gsap.set(card, { clearProps: 'all' });
        })
      });
    },
    once: true
  });
}

/* ============ SPLIT TYPE — section headings ============ */
function initSplitTypeHeadings() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const st = new SplitType(el, { types: 'lines,words', lineClass: 'split-line' });
    gsap.from(st.words, {
      yPercent: 110, opacity: 0, duration: .9, stagger: .02, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
}

/* ============ ALMONDS THE CAT — walking mascot + paw trail ============ */
function initAlmonds() {
  const wrap = document.querySelector('.almonds-trail');
  if (!wrap) return;
  const cat = wrap.querySelector('.almonds-cat');
  if (!cat) return;

  function walkAcross() {
    const vw = window.innerWidth;
    const y = window.innerHeight - (60 + Math.random() * (window.innerHeight * 0.45));
    gsap.set(cat, { y, x: -100, opacity: 1, scaleX: 1 });

    let lastPaw = 0;
    function dropPaw() {
      const now = Date.now();
      if (now - lastPaw < 260) return;
      lastPaw = now;
      const rect = cat.getBoundingClientRect();
      const paw = document.createElement('img');
      paw.src = 'images/paw.svg';
      paw.className = 'paw';
      paw.style.left = (rect.left + 24) + 'px';
      paw.style.top = (rect.top + 50) + 'px';
      wrap.appendChild(paw);
      gsap.fromTo(paw, { opacity: .55, scale: .6 }, {
        opacity: 0, scale: 1, duration: 2.2, ease: 'power1.out',
        onComplete: () => paw.remove()
      });
    }

    gsap.to(cat, {
      x: vw + 100, duration: 9, ease: 'none',
      onUpdate: dropPaw,
      onComplete: () => setTimeout(walkAcross, 14000 + Math.random() * 12000)
    });
  }
  setTimeout(walkAcross, 3500);
}

/* ============ SCROLL PROGRESS BAR ============ */
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  const toTop = document.querySelector('.to-top');
  if (!bar) return;
  ScrollTrigger.create({
    start: 0, end: 'max', onUpdate: (self) => {
      bar.style.width = (self.progress * 100) + '%';
      if (toTop) toTop.classList.toggle('show', self.scroll() > 600);
    }
  });
  if (toTop) {
    toTop.addEventListener('click', () => lenis.scrollTo(0, { duration: 1.2 }));
  }
}

/* ============ BLOG FILTER ============ */
document.addEventListener('click', (e) => {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  const cat = pill.dataset.filter;
  document.querySelectorAll('.blog-card').forEach(card => {
    const show = cat === 'all' || card.dataset.cat === cat;
    gsap.to(card, {
      opacity: show ? 1 : 0, scale: show ? 1 : .92, duration: .35,
      onStart: () => { if (show) card.style.display = 'block'; },
      onComplete: () => { if (!show) card.style.display = 'none'; }
    });
  });
});

/* ============ CONTACT FORM (front-end only) ============ */
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type=submit]');
    const original = btn.innerHTML;
    btn.innerHTML = '<span>Message sent! 🌿</span>';
    contactForm.reset();
    setTimeout(() => { btn.innerHTML = original; }, 3000);
  });
}

/* ============ SMOOTH ANCHOR LINKS ============ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) {
      e.preventDefault();
      lenis.scrollTo(id, { duration: 1.1 });
    }
  });
});
