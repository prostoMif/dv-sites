// Поведение переданного сайта без фреймворка: всё берётся из HTML, поэтому правки из admin.php сразу работают.
(function () {
  "use strict";
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var rub = function (n) { return Number(n).toLocaleString("ru-RU") + " ₽"; };

  // появление блоков при прокрутке
  var reveal = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveal.forEach(function (el) { io.observe(el); });
  } else reveal.forEach(function (el) { el.classList.add("in"); });

  // галерея: просмотр на весь экран
  var shots = $$(".gal button");
  if (shots.length) {
    var lb = document.createElement("div");
    lb.className = "lb"; lb.hidden = true; lb.style.display = "none";
    lb.setAttribute("data-runtime", ""); // не сохраняется редактором
    lb.innerHTML = '<img alt=""><button class="lb-nav" style="left:12px" aria-label="Назад">‹</button>' +
      '<button class="lb-nav" style="right:12px" aria-label="Вперёд">›</button><button class="lb-close" aria-label="Закрыть">×</button>';
    document.body.appendChild(lb);
    var img = $("img", lb), cur = 0;
    var show = function (i) { cur = (i + shots.length) % shots.length; img.src = $("img", shots[cur]).src; lb.hidden = false; lb.style.display = "flex"; };
    var hide = function () { lb.hidden = true; lb.style.display = "none"; };
    shots.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); });
    var nav = $$(".lb-nav", lb);
    nav[0].addEventListener("click", function (e) { e.stopPropagation(); show(cur - 1); });
    nav[1].addEventListener("click", function (e) { e.stopPropagation(); show(cur + 1); });
    img.addEventListener("click", function (e) { e.stopPropagation(); });
    lb.addEventListener("click", hide);
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") hide();
      if (e.key === "ArrowRight") show(cur + 1);
      if (e.key === "ArrowLeft") show(cur - 1);
    });
  }

  // до / после
  $$(".ba").forEach(function (ba) {
    var r = $("input", ba);
    if (r) r.addEventListener("input", function () { ba.style.setProperty("--pos", r.value + "%"); });
  });

  // калькулятор: цены берутся из карточек услуг (data-prices)
  var calc = $("[data-calc]");
  var CLS = [["sedan", "Седан"], ["suv", "Кроссовер"], ["large", "Внедорожник"]];
  function buildCalc() {
    if (!calc) return;
    var items = $$('[data-item="service"]').map(function (c) {
      var p = {}; try { p = JSON.parse(c.getAttribute("data-prices") || "{}"); } catch (e) {}
      return { title: ($("h3", c) || {}).textContent || "", p: p };
    }).filter(function (x) { return x.p.sedan || x.p.suv || x.p.large; });
    if (!items.length) { calc.innerHTML = ""; return; }
    var cls = "sedan", sel = [0];
    function render() {
      var total = 0;
      sel.forEach(function (i) { total += Number(items[i].p[cls] || 0); });
      calc.innerHTML = '<div class="calc reveal in"><div><h3>Рассчитайте стоимость</h3>' +
        '<p class="muted" style="font-size:14.5px;margin:6px 0 14px">Выберите класс машины и услуги — покажем цену «от».</p>' +
        '<div class="seg" role="group">' + CLS.map(function (c) {
          return '<button type="button" data-cls="' + c[0] + '" aria-pressed="' + (c[0] === cls) + '">' + c[1] + "</button>";
        }).join("") + '</div><div class="calc-list">' + items.map(function (it, i) {
          var v = it.p[cls];
          return '<label><input type="checkbox" data-i="' + i + '"' + (sel.indexOf(i) >= 0 ? " checked" : "") +
            '><span></span><b>' + (v ? rub(v) : "—") + "</b></label>";
        }).join("") + '</div></div><div class="calc-total"><div><span class="muted">Итого от</span><br><b>' + rub(total) +
        '</b></div><p class="muted" style="font-size:14px">Цена «от». Итоговую сумму называет студия.</p>' +
        '<a class="btn btn-accent" href="#book">Записаться</a></div></div>';
      $$(".calc-list span", calc).forEach(function (s, i) { s.textContent = items[i].title; }); // текст — без HTML
      $$("[data-cls]", calc).forEach(function (b) { b.onclick = function () { cls = b.getAttribute("data-cls"); render(); }; });
      $$("[data-i]", calc).forEach(function (cb) {
        cb.onchange = function () {
          var i = Number(cb.getAttribute("data-i"));
          sel = cb.checked ? sel.concat(i) : sel.filter(function (x) { return x !== i; });
          render();
        };
      });
    }
    render();
  }
  buildCalc();
  window.siteCalc = buildCalc; // редактор пересобирает калькулятор после правки цен

  // запись: если в config.js задан бот владельца, заявка уходит ему в Telegram напрямую;
  // иначе (или при ошибке) открываем мессенджер студии с готовым текстом
  var CFG = window.SITE_CONFIG || {};
  $$("[data-book]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (n) { var el = f.elements.namedItem(n); return el ? el.value.trim() : ""; };
      var t = "Здравствуйте! Хочу записаться в «" + (f.getAttribute("data-name") || "") + "».\nИмя: " + v("name") +
        "\nТелефон: " + v("phone") + (v("car") ? "\nАвто: " + v("car") : "") +
        "\nУслуга: " + v("svc") + (v("when") ? "\nКогда: " + v("when") : "") + (v("msg") ? "\n" + v("msg") : "");
      var wa = f.getAttribute("data-wa"), tg = f.getAttribute("data-tg"), ph = f.getAttribute("data-phone");
      function fallback() {
        if (wa) window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(t), "_blank");
        else if (tg) { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function () {}); window.open(tg, "_blank"); }
        else if (ph) location.href = "tel:" + ph;
        f.innerHTML = '<div class="ok">Отправьте сообщение в открывшемся чате — и мы свяжемся с вами.</div>';
      }
      if (CFG.tgBotToken && CFG.tgChatId) {
        fetch("https://api.telegram.org/bot" + CFG.tgBotToken + "/sendMessage", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CFG.tgChatId, text: "Новая заявка с сайта\n\n" + t })
        }).then(function (r) {
          if (!r.ok) throw 0;
          f.innerHTML = '<div class="ok">Заявка отправлена. Мы свяжемся с вами в ближайшее время.</div>';
        }).catch(fallback);
      } else fallback();
    });
  });

  // ?clean — чистый вид для превью в сообщении: без демо-плашки
  if (/[?&]clean/.test(location.search)) $$(".demo").forEach(function (d) { d.remove(); });

  // закрыть плашку (если осталась)
  $$(".demo button").forEach(function (b) { b.addEventListener("click", function () { b.parentNode.remove(); }); });
})();
