// Поведение сайта: просмотр фото, карта, виджет бронирования, демо-админка.
// Всё, что добавляется здесь, помечено data-runtime и не попадает в сохранённую страницу.
(function () {
  "use strict";
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var editing = function () { return document.documentElement.hasAttribute("data-editing"); };

  // ---------- фото на весь экран ----------
  function lightbox(list, i) {
    var box = document.createElement("div");
    box.className = "lb"; box.setAttribute("data-runtime", "");
    box.innerHTML = '<img alt=""><button class="x" aria-label="Закрыть">×</button>' +
      (list.length > 1 ? '<button class="p" aria-label="Назад">‹</button><button class="n" aria-label="Дальше">›</button>' : "");
    var img = box.querySelector("img");
    var show = function (k) { i = (k + list.length) % list.length; img.src = list[i]; };
    show(i);
    var close = function () { box.remove(); document.removeEventListener("keydown", key); };
    var key = function (e) { if (e.key === "Escape") close(); if (e.key === "ArrowRight") show(i + 1); if (e.key === "ArrowLeft") show(i - 1); };
    box.addEventListener("click", function (e) {
      if (e.target.classList.contains("p")) show(i - 1);
      else if (e.target.classList.contains("n")) show(i + 1);
      else if (e.target !== img) close();
    });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", key);
    document.body.appendChild(box);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".ph");
    if (!b || editing()) return;
    var group = b.closest("[data-photos], .gal");
    var all = $$(".ph", group);
    lightbox(all.map(function (x) { return x.getAttribute("data-full") || x.querySelector("img").src; }), all.indexOf(b));
  });

  // ---------- карта: подгружается, когда до неё долистали ----------
  $$("[data-map]").forEach(function (m) {
    var load = function () {
      if (m.querySelector("iframe")) return;
      var ll = m.getAttribute("data-map");
      var f = document.createElement("iframe");
      f.src = "https://yandex.ru/map-widget/v1/?ll=" + ll + "&z=14&pt=" + ll + ",pm2rdm";
      f.loading = "lazy"; f.title = "Карта"; f.setAttribute("data-runtime", "");
      m.appendChild(f);
    };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: "400px" });
      io.observe(m);
    } else load();
  });

  // ---------- виджет бронирования: код лежит в widget.html, редактор его не трогает ----------
  var w = document.querySelector("[data-widget]");
  if (w) {
    fetch("widget.html", { cache: "no-cache" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
      if (!html) return;
      var box = document.createElement("div");
      box.setAttribute("data-runtime", "");
      box.innerHTML = html;
      // скрипты из innerHTML не запускаются — пересоздаём
      $$("script", box).forEach(function (old) {
        var s = document.createElement("script");
        Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
        s.text = old.text;
        old.parentNode.replaceChild(s, old);
      });
      w.appendChild(box);
    }).catch(function () {});
  }

  // ---------- демо-админка: ?admin=demo ----------
  if (/[?&]admin=demo\b/.test(location.search)) {
    window.ADM = { demo: true };
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "assets/editor.css"; css.setAttribute("data-adm", "");
    document.head.appendChild(css);
    var s = document.createElement("script");
    s.src = "assets/editor.js"; s.setAttribute("data-adm", "");
    document.body.appendChild(s);
  }
})();
