// Scroll choreography for the landing page. No libraries: each pinned scene gets a 0→1 progress
// value from its position, written to a CSS custom property; CSS does the rest.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v) => Math.min(1, Math.max(0, v));

  // Split text into word spans (hero headline and the "why offline" paragraph).
  for (const el of $$(".split, .words")) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(" ");
  }
  requestAnimationFrame(() => document.body.classList.add("ready"));

  // Heat map cells for the "Where it went" panel — fixed pattern so it looks the same every load.
  const heat = $(".heat");
  if (heat) heat.innerHTML = Array.from({ length: 28 }, (_, i) =>
    `<i style="--a:${(0.12 + ((i * 37) % 11) / 13).toFixed(2)}"></i>`).join("");

  // Count-ups and fades when they enter the viewport.
  const countUp = (el) => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (reduce || end === 0) { el.textContent = end + suffix; return; }
    const t0 = performance.now();
    const tick = (t) => {
      const k = clamp((t - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e) + suffix;
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

  if (reduce) return;

  const nav = $(".nav"), root = document.documentElement;
  const scenes = $$("[data-scene]");
  const steps = $$(".steps li"), dots = $$(".dots span"), panes = $$(".pane");
  const words = $$(".words .w");
  const track = $(".track");
  const typed = $(".typed");
  let step = -1;

  // Progress of a tall section whose child is position: sticky — 0 when it pins, 1 when it unpins.
  const progress = (sec) => {
    const r = sec.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  const setStep = (i) => {
    if (i === step) return;
    step = i;
    steps.forEach((el, j) => el.classList.toggle("on", j === i));
    dots.forEach((el, j) => el.classList.toggle("on", j === i));
    panes.forEach((el, j) => el.classList.toggle("on", j === i));
    if (i === 1 && typed) typeOut(typed);
  };

  let typing;
  const typeOut = (el) => {
    clearInterval(typing);
    const text = el.dataset.text; let n = 0;
    el.textContent = "";
    typing = setInterval(() => {
      el.textContent = text.slice(0, ++n);
      if (n >= text.length) clearInterval(typing);
    }, 55);
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
