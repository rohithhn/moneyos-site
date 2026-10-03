// Scroll choreography for the landing page. No libraries: each pinned scene gets a 0→1 progress
// value from its position, written to a CSS custom property; CSS does the rest.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const inr = (n) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Split text into word spans (hero headline and the "why offline" paragraph).
  for (const el of $$(".split, .words")) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(" ");
  }
  requestAnimationFrame(() => document.body.classList.add("ready"));

  // ── Heat map: October 2026 from the app's own tour demo ledger (daily limit ₹1,500, "today" = 18th).
  const CAT = {
    food: ["#ff9f0a", "food", "Food"], coffee: ["#ac8e68", "cup", "Coffee"], fuel: ["#30b0c7", "fuel", "Fuel"],
    groceries: ["#30d158", "cart", "Groceries"], travel: ["#0a84ff", "plane", "Travel"],
    subscriptions: ["#64d2ff", "repeat", "Subscriptions"], medical: ["#ff453a", "cross", "Medical"],
    shopping: ["#ff375f", "bag", "Shopping"], utilities: ["#ffd60a", "bolt", "Utilities"],
  };
  const DAYS = {
    1: ["Swiggy", "food", 480, "UPI", "8:42 PM"], 2: ["Blue Tokai", "coffee", 320, "Card", "9:15 AM"],
    3: ["BPCL", "fuel", 2200, "Card", "6:30 PM"], 4: ["BigBasket", "groceries", 1840, "UPI", "11:05 AM"],
    5: ["Uber", "travel", 310, "UPI", "9:48 AM"], 6: ["Netflix", "subscriptions", 649, "Card", "12:00 AM"],
    8: ["Apollo", "medical", 890, "Cash", "7:20 PM"], 9: ["Zomato", "food", 520, "UPI", "9:10 PM"],
    11: ["Decathlon", "shopping", 2490, "Card", "5:45 PM"], 12: ["Auto", "travel", 90, "Cash", "10:02 AM"],
    13: ["Chai Point", "coffee", 180, "UPI", "4:30 PM"], 14: ["Electricity", "utilities", 1420, "UPI", "8:00 PM"],
    18: ["Chai", "coffee", 320, "UPI", "8:42 AM"],
  };
  const PACE = 1500, TODAY = 18, FIRST_DOW = 3; // 1 Oct 2026 is a Thursday; grid starts on Monday
  const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th");
  const shade = (amt) => {
    const r = amt / PACE;
    return r <= 1 ? `rgba(48,209,88,${(0.8 - 0.48 * r).toFixed(2)})` : `rgba(255,69,58,${(0.34 + 0.55 * Math.min(r - 1, 1)).toFixed(2)})`;
  };
  const grid = $(".hm-grid");
  const cells = [];
  if (grid) {
    let html = "<i class='blank'></i>".repeat(FIRST_DOW);
    for (let d = 1; d <= 31; d++) html += `<i class="${d > TODAY ? "future" : ""}">${d}</i>`;
    grid.innerHTML = html;
    cells.push(...$$("i:not(.blank)", grid));
  }
  let shownDay = 0;
  const showDay = (day) => {
    if (day === shownDay) return;
    shownDay = day;
    cells.forEach((c, i) => {
      const d = i + 1, t = DAYS[d];
      const on = d <= day && t;
      c.style.background = on ? shade(t[2]) : "";
      c.classList.toggle("lit", !!on);
      c.classList.toggle("now", d === day);
    });
    const t = DAYS[day];
    const label = `${ord(day)} · ${WD[(FIRST_DOW + day - 1) % 7]}`;
    $("[data-day]").textContent = `Oct ${day}`;
    $("[data-daytotal]").textContent = t ? inr(t[2]) : "No spends";
    $("[data-dayhead]").textContent = label;
    $("[data-dayheadtotal]").textContent = inr(t ? t[2] : 0);
    const row = $("[data-row]");
    row.style.visibility = t ? "visible" : "hidden";
    if (t) {
      const [color, icon] = CAT[t[1]];
      const cat = $(".cat", row);
      cat.style.setProperty("--c", color);
      $("use", cat).setAttribute("href", `#i-${icon}`);
      $("[data-m]", row).textContent = t[0];
      $("[data-t]", row).textContent = t[4];
      const p = $("[data-p]", row);
      p.textContent = t[3]; p.className = `pay ${t[3].toLowerCase()}`;
      $("[data-a]", row).textContent = inr(t[2]);
    }
  };

  // Count-ups and fades when they enter the viewport.
  const countUp = (el) => {
    const end = +el.dataset.count, pre = el.dataset.prefix || "";
    if (reduce || end === 0) { el.textContent = pre + end; return; }
    const t0 = performance.now();
    const tick = (t) => {
      const k = clamp((t - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + Math.round(end * e);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("in");
      const n = $("[data-count]", en.target);
      if (n) countUp(n);
      io.unobserve(en.target);
    }
  }, { threshold: 0.35 });
  $$(".stat, .fade").forEach((el) => io.observe(el));

  // ── Currency side sheet: the app's curated list (CurrencyFormatView.swift), in its order. Each
  // example is ₹1,40,000 worth of digits formatted the way that locale writes money, like the app's picker.
  const CURRENCIES = [
    ["en-IN", "India", "INR", "IN"], ["en-US", "United States", "USD", "US"], ["en-GB", "United Kingdom", "GBP", "GB"],
    ["de-DE", "Eurozone", "EUR", "EU"], ["en-AE", "UAE", "AED", "AE"], ["en-SA", "Saudi Arabia", "SAR", "SA"],
    ["en-SG", "Singapore", "SGD", "SG"], ["en-AU", "Australia", "AUD", "AU"], ["en-NZ", "New Zealand", "NZD", "NZ"],
    ["en-CA", "Canada", "CAD", "CA"], ["ja-JP", "Japan", "JPY", "JP"], ["zh-CN", "China", "CNY", "CN"],
    ["zh-HK", "Hong Kong", "HKD", "HK"], ["ko-KR", "South Korea", "KRW", "KR"], ["en-MY", "Malaysia", "MYR", "MY"],
    ["th-TH", "Thailand", "THB", "TH"], ["id-ID", "Indonesia", "IDR", "ID"], ["en-PH", "Philippines", "PHP", "PH"],
    ["vi-VN", "Vietnam", "VND", "VN"], ["en-PK", "Pakistan", "PKR", "PK"], ["en-BD", "Bangladesh", "BDT", "BD"],
    ["si-LK", "Sri Lanka", "LKR", "LK"], ["ne-NP", "Nepal", "NPR", "NP"], ["de-CH", "Switzerland", "CHF", "CH"],
    ["sv-SE", "Sweden", "SEK", "SE"], ["nb-NO", "Norway", "NOK", "NO"], ["da-DK", "Denmark", "DKK", "DK"],
    ["pl-PL", "Poland", "PLN", "PL"], ["tr-TR", "Türkiye", "TRY", "TR"], ["ru-RU", "Russia", "RUB", "RU"],
    ["he-IL", "Israel", "ILS", "IL"], ["en-ZA", "South Africa", "ZAR", "ZA"], ["en-NG", "Nigeria", "NGN", "NG"],
    ["en-KE", "Kenya", "KES", "KE"], ["ar-EG", "Egypt", "EGP", "EG"], ["pt-BR", "Brazil", "BRL", "BR"],
    ["es-MX", "Mexico", "MXN", "MX"], ["es-AR", "Argentina", "ARS", "AR"], ["es-CL", "Chile", "CLP", "CL"],
  ];
  const flag = (r) => String.fromCodePoint(...[...r].map((c) => 127397 + c.charCodeAt(0)));
  const example = (loc, cur) => {
    try { return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(140000); }
    catch { return `${cur} 140,000`; }
  };
  const sheet = $("#currencies"), backdrop = $(".sheet-backdrop");
  if (sheet) {
    const list = $(".cur-list", sheet), search = $(".sheet-search", sheet), empty = $(".sheet-empty", sheet);
    list.innerHTML = CURRENCIES.map(([loc, name, code, reg]) =>
      `<li data-q="${(name + " " + code).toLowerCase()}"><span class="flag" aria-hidden="true">${flag(reg)}</span>` +
      `<span class="name">${name}<small>${code}</small></span><span class="ex" dir="ltr">${example(loc, code)}</span></li>`).join("");
    const rows = $$("li", list);
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      rows.forEach((r) => { const on = !q || r.dataset.q.includes(q); r.hidden = !on; shown += on; });
      empty.hidden = shown > 0;
    });

    let opener = null, closeTimer;
    const open = (e) => {
      opener = e?.currentTarget || $("[data-open-cur]");
      clearTimeout(closeTimer);
      sheet.hidden = backdrop.hidden = false;
      document.body.classList.add("cur-lock");
      requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("cur-open")));
      setTimeout(() => search.focus({ preventScroll: true }), 50);
    };
    const close = () => {
      document.body.classList.remove("cur-open", "cur-lock");
      closeTimer = setTimeout(() => { sheet.hidden = backdrop.hidden = true; }, reduce ? 0 : 350);
      opener?.focus({ preventScroll: true });
    };
    $$("[data-open-cur]").forEach((b) => b.addEventListener("click", open));
    $$("[data-close-cur]").forEach((b) => b.addEventListener("click", close));
    if (location.hash === "#currencies") open(); // deep link, e.g. from the blog
    addEventListener("keydown", (e) => {
      if (sheet.hidden) return;
      if (e.key === "Escape") return close();
      if (e.key === "Tab") { // keep focus inside the sheet
        const f = $$("button, input", sheet), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  if (reduce) { showDay(TODAY); return; }

  const nav = $(".nav"), root = document.documentElement;
  const scenes = $$("[data-scene]");
  const steps = $$(".steps li"), dots = $$(".dots span"), panes = $$(".pane");
  const words = $$(".words .w");
  const track = $(".track");
  const typed = $(".typed"), smart = $(".smart");
  let step = -1;

  // Progress of a tall section whose child is position: sticky — 0 when it pins, 1 when it unpins.
  const progress = (sec) => {
    const r = sec.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  let typing;
  const typeOut = () => {
    clearInterval(typing);
    const text = typed.dataset.text; let n = 0;
    typed.textContent = ""; smart.classList.remove("done");
    typing = setInterval(() => {
      typed.textContent = text.slice(0, ++n);
      if (n >= text.length) { clearInterval(typing); smart.classList.add("done"); }
    }, 50);
  };

  const setStep = (i) => {
    if (i === step) return;
    step = i;
    steps.forEach((el, j) => el.classList.toggle("on", j === i));
    dots.forEach((el, j) => el.classList.toggle("on", j === i));
    panes.forEach((el, j) => el.classList.toggle("on", j === i));
    if (i === 1 && typed) typeOut();
  };

  const frame = () => {
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty("--page", (scrollY / max).toFixed(4));
    nav.classList.toggle("solid", scrollY > 40);

    for (const sec of scenes) {
      const p = progress(sec);
      sec.style.setProperty("--p", p.toFixed(4));
      switch (sec.dataset.scene) {
        case "add":
          setStep(Math.min(steps.length - 1, Math.floor(p * steps.length)));
          break;
        case "heat":
          // reach "today" at 85% so the finished month holds for a moment before unpinning
          showDay(Math.max(1, Math.min(TODAY, Math.ceil(clamp(p / 0.85) * TODAY))));
          break;
        case "rail": {
          const dist = track.scrollWidth - innerWidth;
          // hold still for the first and last 8% so the rail settles before it moves and after it stops
          const k = clamp((p - 0.08) / 0.84);
          track.style.setProperty("--x", `${-dist * k}px`);
          break;
        }
        case "words": {
          const lit = Math.floor(clamp(p * 1.15) * words.length);
          words.forEach((w, i) => w.classList.toggle("lit", i < lit));
          break;
        }
      }
    }
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; frame(); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  frame();
})();
