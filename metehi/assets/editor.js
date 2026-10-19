// Редактор поверх сайта. Клик по тексту или цене — правка; у карточек — «Копия», «Удалить»; у фото — «Заменить», «Удалить».
// Настоящий сайт: сохраняет через admin/index.php (пароль, резервные копии). Демо (ADM.demo): всё в браузере, без сохранения.
(function () {
  "use strict";
  var ADM = window.ADM || {};
  var DEMO = !!ADM.demo;
  var EP = ADM.endpoint || "admin/index.php";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var dirty = false;
  document.documentElement.setAttribute("data-editing", "");

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text) e.textContent = text;
    e.setAttribute("data-adm", "");
    return e;
  }
  function changed() { dirty = true; save.disabled = false; save.textContent = DEMO ? "Сохранить (демо)" : "Сохранить"; }
  function toast(t, ms) { status.textContent = t; status.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { status.classList.remove("on"); }, ms || 4000); }
  function api(action, body, headers) {
    if (DEMO) return Promise.resolve({ ok: true, demo: true });
    return fetch(EP + "?a=" + action, {
      method: "POST", body: body, credentials: "same-origin",
      headers: Object.assign({ "X-CSRF": ADM.csrf }, headers || {}),
    }).then(function (r) { return r.json().catch(function () { return { ok: false, error: "Ошибка сервера" }; }); });
  }

  // ---------- панель ----------
  var bar = el("div", { class: "adm-bar" });
  var save = el("button", { class: "adm-btn adm-primary" }, DEMO ? "Сохранить (демо)" : "Сохранено");
  save.disabled = !DEMO;
  var btnContacts = el("button", { class: "adm-btn" }, "Контакты");
  var btnUndo = el("button", { class: "adm-btn" }, DEMO ? "Сбросить правки" : "Отменить последнее сохранение");
  var btnPass = el("button", { class: "adm-btn" }, "Сменить пароль");
  var btnOut = el("a", { class: "adm-btn", href: DEMO ? location.pathname : EP + "?a=logout" }, DEMO ? "Выйти из админки" : "Выйти");
  var status = el("div", { class: "adm-toast", role: "status" });
  [save, btnContacts, btnUndo].concat(DEMO ? [] : [btnPass]).concat([btnOut]).forEach(function (x) { bar.appendChild(x); });
  document.body.appendChild(bar);
  document.body.appendChild(status);
  if (!DEMO && !ADM.backups) btnUndo.style.display = "none";

  if (DEMO) {
    var tip = el("div", { class: "adm-tip" });
    tip.innerHTML = "<div><b>Это админка, как её увидит владелец.</b><br>Нажмите на любой текст или цену — и просто исправьте. " +
      "У фото есть кнопки «Заменить» и «Удалить», у домиков и вопросов — «Копия» и «Удалить».<br>" +
      "В демо ничего не сохраняется: обновите страницу — всё вернётся.</div>";
    var ok = el("button", { class: "adm-btn adm-primary" }, "Понятно");
    ok.addEventListener("click", function () { tip.remove(); });
    tip.appendChild(ok);
    document.body.appendChild(tip);
  }

  // ---------- тексты ----------
  function editable(t) {
    try { t.contentEditable = "plaintext-only"; } catch (e) { t.contentEditable = "true"; }
    if (t.contentEditable !== "plaintext-only") t.contentEditable = "true";
    t.spellcheck = true;
    t.addEventListener("input", changed);
    t.addEventListener("paste", function (e) {
      e.preventDefault();
      document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
    });
    t.addEventListener("keydown", function (e) { if (e.key === "Enter" && t.tagName !== "P") { e.preventDefault(); t.blur(); } });
  }
  $$("[data-e]").forEach(editable);
  $$("summary").forEach(function (s) { s.addEventListener("click", function (e) { if (e.target.hasAttribute("data-e")) e.preventDefault(); }); });
  $$("details").forEach(function (d) { d.open = true; });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (a && !a.hasAttribute("data-adm") && !a.closest("[data-adm]")) e.preventDefault();
  }, true);

  // ---------- фото ----------
  function shrink(file) {
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      var c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(ok, "image/webp", 0.82); });
    });
  }
  function pickImage(cb) {
    var inp = el("input", { type: "file", accept: "image/*" });
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      toast("Загружаем фото…");
      shrink(f).then(function (blob) {
        if (DEMO) return { ok: true, url: URL.createObjectURL(blob) };
        var fd = new FormData(); fd.append("file", blob, "photo.webp");
        return api("upload", fd);
      }).then(function (r) {
        if (!r.ok) return toast(r.error || "Не загрузилось");
        cb(r.url); changed(); toast(DEMO ? "Фото на месте (в демо — до обновления страницы)" : "Фото загружено — не забудьте сохранить");
      }).catch(function () { toast("Не загрузилось"); });
    };
    inp.click();
  }
  function tools(target, buttons, cls) {
    var box = el("div", { class: "adm-tools" + (cls ? " " + cls : "") });
    buttons.forEach(function (b) {
      var x = el("button", { class: "adm-mini" }, b[0]);
      x.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); b[1](); });
      box.appendChild(x);
    });
    if (getComputedStyle(target).position === "static") { target.style.position = "relative"; target.setAttribute("data-adm-pos", ""); }
    target.appendChild(box);
    return box;
  }
  function newPhoto(u) {
    var b = document.createElement("button");
    b.className = "ph"; b.setAttribute("data-item", "photo"); b.setAttribute("data-full", u); b.setAttribute("aria-label", "Фото");
    var i = document.createElement("img"); i.src = u; i.alt = ""; i.loading = "lazy";
    b.appendChild(i); photoTools(b);
    return b;
  }
  function photoTools(b) {
    tools(b, [
      ["Заменить", function () { pickImage(function (u) { $("img", b).src = u; b.setAttribute("data-full", u); }); }],
      ["Удалить", function () { b.remove(); changed(); }],
    ]);
  }
  $$('[data-item="photo"]').forEach(photoTools);
  $$("[data-photos], .gal").forEach(function (box) {
    var add = el("button", { class: "adm-btn adm-add" }, "+ Добавить фото");
    add.addEventListener("click", function () { pickImage(function (u) { box.insertBefore(newPhoto(u), box.firstChild); box.scrollLeft = 0; }); });
    box.parentNode.insertBefore(add, box.nextSibling);
  });
  var hero = $('[data-img="hero"]');
  if (hero) tools(hero.parentNode, [["Заменить главное фото", function () { pickImage(function (u) { hero.src = u; }); }]], "adm-hero");

  // ---------- карточки и строки цен ----------
  function wire(root) {
    $$("[data-e]", root).forEach(editable);
    $$('[data-item="photo"]', root).forEach(photoTools);
  }
  function itemTools(item) {
    var kind = item.getAttribute("data-item");
    var list = [];
    if (kind !== "price" && kind !== "tick") list.push(["Копия", function () {
      var copy = item.cloneNode(true);
      $$("[data-adm]", copy).forEach(function (x) { x.remove(); });
      item.parentNode.insertBefore(copy, item.nextSibling);
      wire(copy); itemTools(copy); changed();
    }]);
    list.push([kind === "price" ? "×" : "Удалить", function () {
      if (kind === "price" || confirm("Удалить этот блок?")) { item.remove(); changed(); }
    }]);
    tools(item, list, kind === "price" || kind === "tick" ? "adm-row" : "");
  }
  $$('[data-item="unit"],[data-item="faq"],[data-item="rule"],[data-item="ptable"],[data-item="price"],[data-item="tick"]').forEach(itemTools);
  $$("dl.prices").forEach(function (dl) {
    var add = el("button", { class: "adm-btn adm-add" }, "+ Строка цены");
    add.addEventListener("click", function () {
      var row = document.createElement("div"); row.className = "row"; row.setAttribute("data-item", "price");
      row.innerHTML = "<dt data-e>Название</dt><dd data-e>0 ₽</dd>";
      dl.appendChild(row); wire(row); itemTools(row); changed();
      $("dt", row).focus();
    });
    dl.parentNode.insertBefore(add, dl.nextSibling);
  });

  // ---------- контакты ----------
  btnContacts.addEventListener("click", function () {
    var tel = $('a[href^="tel:"]');
    var wa = $('a[href*="wa.me/"]');
    var tg = $('a[href^="https://t.me/"]');
    var cur = {
      phone: tel ? tel.getAttribute("href").slice(4) : "",
      wa: wa ? (wa.getAttribute("href").match(/wa\.me\/(\d+)/) || [])[1] || "" : "",
      tg: tg ? tg.getAttribute("href") : "",
    };
    var m = el("div", { class: "adm-modal" });
    m.innerHTML = '<form><b>Контакты на всём сайте</b>' +
      '<label>Телефон<input name="phone" inputmode="tel" placeholder="+7 914 000-00-00"></label>' +
      '<label>WhatsApp — номер цифрами<input name="wa" inputmode="numeric" placeholder="79140000000"></label>' +
      '<label>Telegram — ссылка<input name="tg" placeholder="https://t.me/имя"></label>' +
      '<div class="adm-row-btns"><button type="button" class="adm-btn" data-x>Отмена</button><button class="adm-btn adm-primary">Готово</button></div></form>';
    var f = $("form", m);
    f.phone.value = cur.phone; f.wa.value = cur.wa; f.tg.value = cur.tg;
    $("[data-x]", m).onclick = function () { m.remove(); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var phone = f.phone.value.trim(), w = f.wa.value.replace(/\D/g, ""), t = f.tg.value.trim();
      if (t && !/^https:\/\/t\.me\//i.test(t)) { alert("Ссылка на Telegram начинается с https://t.me/"); return; }
      var fmt = function (p) { var d = p.replace(/\D/g, ""); return d.length === 11 ? "+7 " + d.slice(1, 4) + " " + d.slice(4, 7) + "-" + d.slice(7, 9) + "-" + d.slice(9) : p; };
      if (cur.phone && phone) $$('a[href^="tel:' + cur.phone + '"]').forEach(function (a) {
        a.setAttribute("href", "tel:" + phone.replace(/[^\d+]/g, ""));
        if (a.children.length === 0 && /\d{3}/.test(a.textContent)) a.textContent = fmt(phone);
        var b = $("b", a); if (b && /\d{3}/.test(b.textContent)) b.textContent = fmt(phone);
      });
      if (cur.wa) $$('a[href*="wa.me/' + cur.wa + '"]').forEach(function (a) { if (w) a.setAttribute("href", "https://wa.me/" + w); else a.remove(); });
      if (cur.tg) $$('a[href="' + cur.tg + '"]').forEach(function (a) { if (t) a.setAttribute("href", t); else a.remove(); });
      m.remove(); changed(); toast("Контакты обновлены на всём сайте");
    };
    document.body.appendChild(m);
    f.phone.focus();
  });

  // ---------- сохранение ----------
  function serialize() {
    var doc = document.documentElement.cloneNode(true);
    doc.removeAttribute("data-editing");
    $$("[data-adm],[data-runtime]", doc).forEach(function (x) { x.remove(); });
    $$("[contenteditable]", doc).forEach(function (x) { x.removeAttribute("contenteditable"); x.removeAttribute("spellcheck"); });
    $$("[data-adm-pos]", doc).forEach(function (x) {
      x.style.removeProperty("position"); x.removeAttribute("data-adm-pos");
      if (!x.getAttribute("style")) x.removeAttribute("style");
    });
    $$("details", doc).forEach(function (d, i) { if (i) d.removeAttribute("open"); });
    return "<!DOCTYPE html>\n" + doc.outerHTML;
  }
  window.__admSerialize = serialize;     // для автопроверки
  save.addEventListener("click", function () {
    if (DEMO) { toast("Это демо, поэтому изменения не сохраняются. На вашем сайте эта кнопка сразу обновит страницу для всех.", 6500); return; }
    save.disabled = true; save.textContent = "Сохраняем…";
    api("save", serialize(), { "Content-Type": "text/html; charset=utf-8" }).then(function (r) {
      if (!r.ok) { save.disabled = false; save.textContent = "Сохранить"; return toast(r.error || "Не сохранилось"); }
      dirty = false; save.textContent = "Сохранено"; btnUndo.style.display = ""; toast("Сохранено — сайт обновлён");
    });
  });
  btnUndo.addEventListener("click", function () {
    if (DEMO) { dirty = false; location.reload(); return; }
    if (!confirm("Вернуть сайт к версии до последнего сохранения?")) return;
    api("undo", "").then(function (r) { if (r.ok) { dirty = false; location.reload(); } else toast(r.error); });
  });
  btnPass.addEventListener("click", function () {
    var old = prompt("Текущий пароль"); if (!old) return;
    var nw = prompt("Новый пароль (минимум 8 символов)"); if (!nw) return;
    api("password", JSON.stringify({ old: old, new: nw }), { "Content-Type": "application/json" })
      .then(function (r) { toast(r.ok ? "Пароль изменён" : r.error); });
  });
  window.addEventListener("beforeunload", function (e) { if (dirty && !DEMO) { e.preventDefault(); e.returnValue = ""; } });
})();
