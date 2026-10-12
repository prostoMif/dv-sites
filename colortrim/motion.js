// Анимации сайта на GSAP (ScrollTrigger + SplitText). Подключается после gsap.min.js и плагинов.
// В редакторе (admin.php) не запускается: SplitText меняет разметку текста, а редактор сохраняет HTML как есть.
(function () {
  "use strict";
  if (window.ADM || !window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var g = window.gsap;
  g.registerPlugin(window.ScrollTrigger);
  var canSplit = !!window.SplitText;
  if (canSplit) g.registerPlugin(window.SplitText);
  document.documentElement.classList.add("gsap");

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- первый экран ----------
  var hero = $(".hero");
  if (hero) {
    var tl = g.timeline({ defaults: { ease: "power3.out" } });
    var bg = $(".hero-bg img", hero);
    if (bg) {
      tl.fromTo(bg, { scale: 1.18 }, { scale: 1, duration: 2.4, ease: "power2.out" }, 0);
      g.to(bg, { yPercent: 14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    }
    var photo = $(".hero-photo", hero);
    if (photo && getComputedStyle(photo).display !== "none") {
      tl.from(photo, { clipPath: "inset(100% 0 0 0 round 30px)", duration: 1.2, ease: "power4.inOut" }, 0.1);
    }
    tl.from($$(".kicker", hero), { y: 14, autoAlpha: 0, duration: 0.6 }, 0.15);
    var h1 = $("h1", hero);
    if (h1 && canSplit) {
      window.SplitText.create(h1, {
        type: "lines,words", mask: "lines", autoSplit: true,
        onSplit: function (self) {
          return tl.from(self.lines, { yPercent: 110, duration: 0.9, stagger: 0.09, ease: "power4.out" }, 0.25);
        },
      });
    } else if (h1) {
      tl.from(h1, { y: 30, autoAlpha: 0, duration: 0.8 }, 0.25);
    }
    tl.from($$(".lead", hero), { y: 18, autoAlpha: 0, duration: 0.7 }, 0.55)
      .from($$(".hero-cta > *", hero), { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.7)
      .from($$(".chip", hero), { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.07 }, 0.85);
  }

  // ---------- заголовки разделов: слова поднимаются из-под маски ----------
  if (canSplit) {
    $$("section:not(.hero) h2").forEach(function (h) {
      window.SplitText.create(h, {
        type: "words", mask: "words", autoSplit: true,
        onSplit: function (self) {
          return g.from(self.words, {
            yPercent: 105, duration: 0.8, stagger: 0.05, ease: "power4.out",
            scrollTrigger: { trigger: h, start: "top 88%", once: true },
          });
        },
      });
    });
  }

  // ---------- блоки появляются пачками при прокрутке ----------
  var blocks = $$(".reveal").filter(function (el) { return !el.closest(".hero"); });
  g.set(blocks, { autoAlpha: 0, y: 40 });
  window.ScrollTrigger.batch(blocks, {
    start: "top 90%", once: true,
    onEnter: function (batch) { g.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out", overwrite: true }); },
  });

  // ---------- галерея: фото «открываются» снизу вверх ----------
  var shots = $$(".gal button");
  if (shots.length) {
    g.from(shots, {
      clipPath: "inset(100% 0% 0% 0%)", duration: 1, stagger: 0.07, ease: "power4.inOut",
      scrollTrigger: { trigger: ".gal", start: "top 85%", once: true },
    });
    shots.forEach(function (b) {
      var img = $("img", b);
      if (img) g.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: b, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  // ---------- рейтинг считается от нуля ----------
  $$(".chip b, .rating-big b").forEach(function (b) {
    var target = parseFloat(b.textContent.replace(",", "."));
    if (!target) return;
    var o = { v: 0 };
    g.to(o, {
      v: target, duration: 1.4, ease: "power2.out",
      scrollTrigger: { trigger: b, start: "top 95%", once: true },
      onUpdate: function () { b.textContent = o.v.toFixed(1).replace(".", ","); },
    });
  });

  // ---------- бегущая строка ускоряется от прокрутки ----------
  var track = $(".marquee-track");
  if (track) {
    var anims = track.getAnimations ? track.getAnimations() : [];
    window.ScrollTrigger.create({
      onUpdate: function (self) {
        var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 600, 4);
        anims.forEach(function (a) { a.playbackRate = boost; });
        g.to(anims, { playbackRate: 1, duration: 1.2, ease: "power2.out", overwrite: true, delay: 0.1 });
      },
    });
  }

  window.addEventListener("load", function () { window.ScrollTrigger.refresh(); });
})();
