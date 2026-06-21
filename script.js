// ════════════════════════════════════════════════════════════════════════
// ECOTRACK AI — Vanilla JS Application Logic
// ════════════════════════════════════════════════════════════════════════

// ───── CONSTANTS ─────

const CO2_FACTORS = {
  transport: { bike: 0, car: 0.21, bus: 0.089, train: 0.041, ev: 0.053 },
  food: { vegan: 1.5, vegetarian: 2.5, nonveg: 5.5 },
  electricity: 0.82,
  water: 0.0003,
  shopping: { low: 1.5, medium: 4.0, high: 8.5 },
  waste: { low: 0.5, medium: 1.2, high: 2.8 },
};

const BADGES = [
  { id: "first_calc", name: "First Step", icon: "🌱" },
  { id: "week_streak", name: "Consistent", icon: "🔥" },
  { id: "low_day", name: "Green Day", icon: "🍃" },
  { id: "challenge_3", name: "Go-Getter", icon: "⚡" },
  { id: "share", name: "Evangelist", icon: "📣" },
  { id: "eco_hero", name: "Eco Hero", icon: "🏆" },
];

const CHALLENGES = [
  { id: 1, title: "Zero Plastic Day", desc: "Use no single-use plastics today", points: 50, icon: "♻️", co2: 0.3 },
  { id: 2, title: "Public Transport", desc: "Use bus, train or metro instead of car", points: 40, icon: "🚌", co2: 2.1 },
  { id: 3, title: "Meatless Meal", desc: "Have at least one plant-based meal", points: 35, icon: "🥗", co2: 1.5 },
  { id: 4, title: "5-Min Shower", desc: "Keep shower under 5 minutes", points: 30, icon: "🚿", co2: 0.8 },
  { id: 5, title: "Power Saver", desc: "Unplug all devices before sleeping", points: 25, icon: "⚡", co2: 0.5 },
  { id: 6, title: "Bike Commute", desc: "Cycle for any errand or commute", points: 45, icon: "🚲", co2: 1.8 },
];

const LEADERBOARD = [
  { name: "Priya S.", score: 1240, level: "Eco Hero", avatar: "🧑‍🌾" },
  { name: "Arjun M.", score: 980, level: "Green Warrior", avatar: "👨‍💻" },
  { name: "Sunita K.", score: 850, level: "Green Warrior", avatar: "👩‍🔬" },
  { name: "Rahul V.", score: 720, level: "Eco Starter", avatar: "👨‍🎓" },
  { name: "Neha P.", score: 640, level: "Eco Starter", avatar: "👩‍🎨" },
];

const TIPS = [
  "Switching to LED bulbs saves ~75% electricity vs incandescent.",
  "A plant-based diet reduces food emissions by up to 50%.",
  "Air-drying clothes instead of a dryer saves ~2.4 kg CO₂ per load.",
  "Cycling 10 km instead of driving saves ~2.1 kg CO₂ each way.",
  "Fixing a dripping tap saves 3,000+ liters of water per year.",
  "Composting food waste can cut household emissions by ~0.5 tonnes/year.",
];

const CHART_COLORS = ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"];

// ───── STORAGE HELPERS ─────

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

// ───── APP STATE ─────

let state = {
  dark: store.get("dark", false),
  footprintResult: store.get("footprint", null),
  points: store.get("points", 0),
  completedChallenges: store.get("challenges", []),
  earnedBadges: store.get("badges", []),
  calcForm: {
    transport: "car", distance: 20, food: "nonveg",
    electricity: 5, water: 150, shopping: "medium", waste: "medium",
  },
};

let charts = {}; // hold Chart.js instances so we can destroy/recreate

// ───── CO2 CALCULATION ─────

function calculateCO2(inputs) {
  const transport = (inputs.distance || 0) * (CO2_FACTORS.transport[inputs.transport] || 0);
  const food = CO2_FACTORS.food[inputs.food] || 0;
  const electricity = (inputs.electricity || 0) * CO2_FACTORS.electricity;
  const water = (inputs.water || 0) * CO2_FACTORS.water;
  const shopping = CO2_FACTORS.shopping[inputs.shopping] || 0;
  const waste = CO2_FACTORS.waste[inputs.waste] || 0;
  const total = transport + food + electricity + water + shopping + waste;
  return {
    total: +total.toFixed(2),
    breakdown: {
      Transport: +transport.toFixed(2),
      Food: +food.toFixed(2),
      Electricity: +electricity.toFixed(2),
      Water: +water.toFixed(2),
      Shopping: +shopping.toFixed(2),
      Waste: +waste.toFixed(2),
    },
  };
}

function getLevel(points) {
  if (points >= 1000) return { name: "Eco Hero", icon: "🏆", next: null };
  if (points >= 500) return { name: "Green Warrior", icon: "⚔️", next: 1000 };
  if (points >= 200) return { name: "Eco Starter", icon: "🌿", next: 500 };
  return { name: "Beginner", icon: "🌱", next: 200 };
}

// ───── TOAST ─────

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

// ───── TAB NAVIGATION ─────

function setupTabs() {
  const buttons = document.querySelectorAll(".nav-btn, .mtab");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".mtab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.toggle("active", s.id === `tab-${tab}`));

  const titles = {
    dashboard: ["🏠 Dashboard", "Your sustainability overview at a glance"],
    calculator: ["🔢 Calculator", "Calculate your daily carbon footprint"],
    challenges: ["🎯 Challenges", "Complete eco-challenges and earn points"],
    analytics: ["📊 Analytics", "Deep dive into your emissions data"],
  };
  document.getElementById("pageTitle").textContent = titles[tab][0];
  document.getElementById("pageSubtitle").textContent = titles[tab][1];

  // Render charts lazily when their tab becomes visible (canvas needs to be visible to size correctly)
  if (tab === "dashboard") renderDashboardCharts();
  if (tab === "analytics") renderAnalyticsCharts();
  if (tab === "calculator" && state.footprintResult) renderCalculatorCharts(state.footprintResult);
}

// ───── DARK MODE ─────

function setupDarkMode() {
  if (state.dark) document.body.classList.add("dark");
  document.getElementById("darkToggle").textContent = state.dark ? "☀️" : "🌙";
  document.getElementById("darkToggle").addEventListener("click", () => {
    state.dark = !state.dark;
    document.body.classList.toggle("dark", state.dark);
    document.getElementById("darkToggle").textContent = state.dark ? "☀️" : "🌙";
    store.set("dark", state.dark);
    // Re-render charts so colors/grid match new theme
    renderDashboardCharts();
    renderAnalyticsCharts();
    if (state.footprintResult) renderCalculatorCharts(state.footprintResult);
  });
}

// ───── DASHBOARD RENDER ─────

function renderDashboard() {
  document.getElementById("statFootprint").textContent = state.footprintResult ? `${state.footprintResult.total} kg` : "—";
  document.getElementById("statPoints").textContent = state.points;
  document.getElementById("statBadges").textContent = state.earnedBadges.length;
  document.getElementById("statChallenges").textContent = state.completedChallenges.length;

  const level = getLevel(state.points);
  document.getElementById("statLevel").textContent = level.name;
  document.getElementById("levelTitle").textContent = `${level.icon} ${level.name} — Level Progress`;

  const pct = level.next ? Math.min((state.points / level.next) * 100, 100) : 100;
  document.getElementById("levelProgress").style.width = pct + "%";
  document.getElementById("levelText").textContent = level.next ? `${state.points} / ${level.next} pts` : "Max Level!";
  document.getElementById("levelSubtext").textContent = level.next
    ? `${level.next - state.points} points to next level`
    : "🎉 You've reached the highest level!";

  // Badges grid
  const badgesGrid = document.getElementById("badgesGrid");
  badgesGrid.innerHTML = "";
  BADGES.forEach(b => {
    const earned = state.earnedBadges.includes(b.id);
    const div = document.createElement("div");
    div.className = "badge-item" + (earned ? " earned" : "");
    div.innerHTML = `<div class="badge-icon">${b.icon}</div><div class="badge-name">${b.name}</div>`;
    badgesGrid.appendChild(div);
  });

  // Tip of the day
  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];
  document.getElementById("tipText").textContent = tip;
}

function renderDashboardCharts() {
  const trendData = [
    { day: "Mon", co2: 9.2 }, { day: "Tue", co2: 8.7 }, { day: "Wed", co2: 10.1 },
    { day: "Thu", co2: 7.5 }, { day: "Fri", co2: 8.0 }, { day: "Sat", co2: 6.8 },
    { day: "Sun", co2: state.footprintResult ? state.footprintResult.total : 7.2 },
  ];
  const gridColor = getCSSVar("--border");
  const textColor = getCSSVar("--text-2");

  destroyChart("trendChart");
  charts.trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels: trendData.map(d => d.day),
      datasets: [{
        label: "CO₂ (kg)",
        data: trendData.map(d => d.co2),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.1)",
        borderWidth: 2.5,
        pointBackgroundColor: "#22c55e",
        pointRadius: 4,
        tension: 0.3,
        fill: true,
      }],
    },
    options: baseChartOptions(gridColor, textColor),
  });
}

// ───── CALCULATOR ─────

function setupCalculator() {
  // Segment controls
  ["transport", "food", "shopping", "waste"].forEach(key => {
    const container = document.getElementById(`seg-${key}`);
    container.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.calcForm[key] = btn.dataset.value;
        if (key === "food") updateFoodInfo();
      });
    });
  });

  // Sliders
  const sliders = [
    { id: "distanceSlider", valueId: "distanceValue", key: "distance", unit: "km" },
    { id: "electricitySlider", valueId: "electricityValue", key: "electricity", unit: "kWh" },
    { id: "waterSlider", valueId: "waterValue", key: "water", unit: "L" },
  ];
  sliders.forEach(s => {
    const el = document.getElementById(s.id);
    el.value = state.calcForm[s.key];
    document.getElementById(s.valueId).textContent = `${el.value} ${s.unit}`;
    el.addEventListener("input", () => {
      state.calcForm[s.key] = +el.value;
      document.getElementById(s.valueId).textContent = `${el.value} ${s.unit}`;
    });
  });

  updateFoodInfo();

  document.getElementById("calcBtn").addEventListener("click", calculateAndShowResult);

  // If a result already exists (from previous session), show it
  if (state.footprintResult) {
    showCalculatorResult(state.footprintResult, false);
  }
}

function updateFoodInfo() {
  const food = state.calcForm.food;
  const box = document.getElementById("foodInfo");
  if (food === "vegan") box.textContent = "✅ Excellent! Lowest carbon diet";
  else if (food === "vegetarian") box.textContent = "👍 Good choice — moderate impact";
  else box.textContent = "🔴 Highest impact — consider plant-based days";
}

function calculateAndShowResult() {
  const result = calculateCO2(state.calcForm);
  state.footprintResult = result;
  store.set("footprint", result);

  // Badge logic
  let newBadge = false;
  if (!state.earnedBadges.includes("first_calc")) {
    state.earnedBadges.push("first_calc");
    newBadge = true;
  }
  if (result.total < 5 && !state.earnedBadges.includes("low_day")) {
    state.earnedBadges.push("low_day");
    newBadge = true;
  }
  if (newBadge) {
    store.set("badges", state.earnedBadges);
    showToast("🏅 New badge earned!");
  }

  showCalculatorResult(result, true);
  renderDashboard();
  renderDashboardCharts();
  showToast(`✅ Footprint calculated: ${result.total} kg CO₂ today`);
}

function showCalculatorResult(result, animate) {
  document.getElementById("resultsSection").style.display = "grid";
  document.getElementById("resDaily").textContent = result.total;
  document.getElementById("resWeekly").textContent = (result.total * 7).toFixed(1);
  document.getElementById("resMonthly").textContent = (result.total * 30).toFixed(0);

  const dailyColor = result.total < 5 ? "#22c55e" : result.total < 10 ? "#eab308" : "#ef4444";
  document.getElementById("resDaily").style.color = dailyColor;

  const msgBox = document.getElementById("resultMessage");
  if (result.total < 5) {
    msgBox.textContent = "🌟 Excellent! You're well below average.";
    msgBox.style.background = "rgba(34,197,94,0.1)";
    msgBox.style.border = "1px solid #22c55e44";
  } else if (result.total < 10) {
    msgBox.textContent = "⚠️ Average — room to improve.";
    msgBox.style.background = "rgba(234,179,8,0.1)";
    msgBox.style.border = "1px solid #eab30844";
  } else {
    msgBox.textContent = "🔴 High footprint — let's reduce it together!";
    msgBox.style.background = "rgba(239,68,68,0.1)";
    msgBox.style.border = "1px solid #ef444444";
  }

  renderCalculatorCharts(result);
}

function renderCalculatorCharts(result) {
  const entries = Object.entries(result.breakdown).filter(([, v]) => v > 0);
  const gridColor = getCSSVar("--border");
  const textColor = getCSSVar("--text-2");

  destroyChart("pieChart");
  charts.pieChart = new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: CHART_COLORS,
        borderWidth: 2,
        borderColor: getCSSVar("--surface"),
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: textColor, font: { size: 11 }, boxWidth: 10 } },
      },
    },
  });

  destroyChart("barChart");
  const allEntries = Object.entries(result.breakdown);
  charts.barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: allEntries.map(([k]) => k),
      datasets: [{
        label: "kg CO₂",
        data: allEntries.map(([, v]) => v),
        backgroundColor: "#22c55e",
        borderRadius: 6,
      }],
    },
    options: baseChartOptions(gridColor, textColor, false),
  });
}

// ───── CHALLENGES ─────

function renderChallenges() {
  const grid = document.getElementById("challengesGrid");
  grid.innerHTML = "";
  CHALLENGES.forEach(ch => {
    const done = state.completedChallenges.includes(ch.id);
    const div = document.createElement("div");
    div.className = "challenge-card" + (done ? " done" : "");
    div.innerHTML = `
      ${done ? `<div class="challenge-done-badge">✓ Done</div>` : ""}
      <div class="challenge-icon">${ch.icon}</div>
      <div class="challenge-title">${ch.title}</div>
      <div class="challenge-desc">${ch.desc}</div>
      <div class="challenge-tags">
        <span class="challenge-tag-pts">+${ch.points} pts</span>
        <span class="challenge-tag-co2">-${ch.co2} kg CO₂</span>
      </div>
      ${done ? "" : `<button class="challenge-btn" data-id="${ch.id}">Mark Complete</button>`}
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll(".challenge-btn").forEach(btn => {
    btn.addEventListener("click", () => completeChallenge(+btn.dataset.id));
  });

  renderLeaderboard();
}

function completeChallenge(id) {
  const ch = CHALLENGES.find(c => c.id === id);
  if (!ch || state.completedChallenges.includes(id)) return;

  state.completedChallenges.push(id);
  state.points += ch.points;
  store.set("challenges", state.completedChallenges);
  store.set("points", state.points);

  let newBadge = false;
  if (state.completedChallenges.length >= 3 && !state.earnedBadges.includes("challenge_3")) {
    state.earnedBadges.push("challenge_3");
    newBadge = true;
  }
  if (state.points >= 1000 && !state.earnedBadges.includes("eco_hero")) {
    state.earnedBadges.push("eco_hero");
    newBadge = true;
  }
  if (newBadge) store.set("badges", state.earnedBadges);

  document.getElementById("pointsDisplay").textContent = state.points;
  showToast(`🎉 +${ch.points} points! "${ch.title}" completed`);

  renderChallenges();
  renderDashboard();
}

function renderLeaderboard() {
  const level = getLevel(state.points);
  const list = [{ name: "You", score: state.points, level: level.name, avatar: "😊" }, ...LEADERBOARD]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const container = document.getElementById("leaderboardList");
  container.innerHTML = "";
  list.forEach((u, i) => {
    const isYou = u.name === "You";
    const rankDisplay = i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`;
    const row = document.createElement("div");
    row.className = "leaderboard-row" + (isYou ? " you" : "");
    row.innerHTML = `
      <div class="lb-rank ${i < 3 ? "top" : ""}">${rankDisplay}</div>
      <div class="lb-avatar">${u.avatar}</div>
      <div class="lb-info">
        <div class="lb-name">${u.name}</div>
        <div class="lb-level">${u.level}</div>
      </div>
      <div class="lb-score">${u.score} pts</div>
    `;
    container.appendChild(row);
  });
}

// ───── ANALYTICS ─────

function renderAnalyticsCharts() {
  const gridColor = getCSSVar("--border");
  const textColor = getCSSVar("--text-2");

  // Monthly trend
  const monthly = [
    { month: "Jan", co2: 285 }, { month: "Feb", co2: 260 }, { month: "Mar", co2: 290 },
    { month: "Apr", co2: 240 }, { month: "May", co2: 220 },
    { month: "Jun", co2: state.footprintResult ? state.footprintResult.total * 30 : 210 },
  ];
  destroyChart("monthlyChart");
  charts.monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "line",
    data: {
      labels: monthly.map(d => d.month),
      datasets: [{
        label: "kg CO₂",
        data: monthly.map(d => d.co2),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.1)",
        borderWidth: 2.5,
        pointBackgroundColor: "#22c55e",
        pointRadius: 4,
        tension: 0.3,
        fill: true,
      }],
    },
    options: baseChartOptions(gridColor, textColor),
  });

  // Savings by action (horizontal bar)
  const savings = [
    { action: "Public Transport", saved: 18.4 }, { action: "Vegetarian Days", saved: 12.0 },
    { action: "LED Lights", saved: 8.5 }, { action: "Short Showers", saved: 4.2 },
    { action: "Less Shopping", saved: 6.0 },
  ];
  destroyChart("savingsChart");
  charts.savingsChart = new Chart(document.getElementById("savingsChart"), {
    type: "bar",
    data: {
      labels: savings.map(s => s.action),
      datasets: [{ label: "kg CO₂ saved", data: savings.map(s => s.saved), backgroundColor: "#22c55e", borderRadius: 6 }],
    },
    options: { ...baseChartOptions(gridColor, textColor, false), indexAxis: "y" },
  });

  // Goal completion (doughnut style for simplicity)
  const goals = [{ name: "Transport", value: 72 }, { name: "Food", value: 85 }, { name: "Energy", value: 60 }, { name: "Water", value: 90 }];
  destroyChart("goalChart");
  charts.goalChart = new Chart(document.getElementById("goalChart"), {
    type: "polarArea",
    data: {
      labels: goals.map(g => g.name),
      datasets: [{ data: goals.map(g => g.value), backgroundColor: CHART_COLORS }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { color: textColor, font: { size: 11 }, boxWidth: 10 } } },
      scales: { r: { ticks: { display: false }, grid: { color: gridColor } } },
    },
  });

  // Compare numbers
  document.getElementById("compareYou").textContent = state.footprintResult ? (state.footprintResult.total * 30).toFixed(0) : "—";
}

// ───── CHART HELPERS ─────

function getCSSVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function baseChartOptions(gridColor, textColor, showLegend = true) {
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
    },
  };
}

// ───── AI CHAT ─────

let chatMessages = [
  { role: "assistant", text: "Hi! I'm your EcoTrack AI assistant 🌿 Ask me anything about carbon footprints, sustainability tips, or how to reduce your impact!" },
];

function setupChat() {
  const overlay = document.getElementById("chatOverlay");
  const openChat = () => {
    overlay.classList.add("open");
    renderChatMessages();
  };
  document.getElementById("aiFab").addEventListener("click", openChat);
  document.getElementById("aiHeaderBtn").addEventListener("click", openChat);
  document.getElementById("chatClose").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  document.getElementById("chatSend").addEventListener("click", sendChatMessage);
  document.getElementById("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });
}

function renderChatMessages() {
  const container = document.getElementById("chatMessages");
  container.innerHTML = "";
  chatMessages.forEach(m => {
    const row = document.createElement("div");
    row.className = `chat-msg-row ${m.role}`;
    row.innerHTML = `<div class="chat-bubble ${m.role}">${escapeHtml(m.text)}</div>`;
    container.appendChild(row);
  });
  container.scrollTop = container.scrollHeight;
}

function showTyping(show) {
  const container = document.getElementById("chatMessages");
  let typing = document.getElementById("typingIndicator");
  if (show) {
    if (!typing) {
      typing = document.createElement("div");
      typing.id = "typingIndicator";
      typing.className = "chat-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      container.appendChild(typing);
      container.scrollTop = container.scrollHeight;
    }
  } else if (typing) {
    typing.remove();
  }
}

function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const q = input.value.trim();
  if (!q) return;
  input.value = "";

  chatMessages.push({ role: "user", text: q });
  renderChatMessages();
  showTyping(true);

  // NOTE: This uses a local rule-based responder since calling the Anthropic
  // API directly from a static HTML page would expose your API key publicly.
  // To use real AI responses, set up a backend (see README.md) and replace
  // this function with a fetch() call to your own /api/chat endpoint.
  setTimeout(() => {
    showTyping(false);
    const reply = localEcoReply(q);
    chatMessages.push({ role: "assistant", text: reply });
    renderChatMessages();
  }, 700 + Math.random() * 500);
}

function localEcoReply(q) {
  const text = q.toLowerCase();
  if (text.includes("bike") || text.includes("cycle")) {
    return "Great choice! 🚲 Cycling instead of driving a car for the same distance can save roughly 0.21 kg CO₂ per km. Over 20 km daily, that's about 4.2 kg CO₂ saved every day — over 125 kg per month!";
  }
  if (text.includes("car") || text.includes("vehicle")) {
    return "Cars are one of the biggest contributors to personal carbon footprint — about 0.21 kg CO₂ per km. Try carpooling, public transport, or an EV to cut this by 60-90%. 🚗➡️🚌";
  }
  if (text.includes("food") || text.includes("diet") || text.includes("meat") || text.includes("vegan") || text.includes("vegetarian")) {
    return "Food choices matter a lot! 🥗 A non-vegetarian diet produces ~5.5 kg CO₂/day, vegetarian ~2.5 kg, and vegan ~1.5 kg. Swapping a few meals a week to plant-based can meaningfully cut your footprint.";
  }
  if (text.includes("electricity") || text.includes("power") || text.includes("energy")) {
    return "Electricity use contributes ~0.82 kg CO₂ per kWh on the Indian grid. Switching to LEDs, unplugging idle devices, and using natural light can cut daily electricity emissions by 20-30%. ⚡";
  }
  if (text.includes("water")) {
    return "Water has a smaller direct CO₂ footprint, but treatment & heating add up. Fixing leaks and shorter showers can save thousands of liters a year. 💧";
  }
  if (text.includes("what is") && text.includes("carbon footprint")) {
    return "Your carbon footprint is the total greenhouse gases (mainly CO₂) produced by your daily activities — travel, food, electricity, shopping, and waste. Tracking it helps you see exactly where to cut back. 🌍";
  }
  if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
    return "Hey there! 🌿 Ask me about transport, food, electricity, or water habits and I'll tell you how to lower your carbon footprint!";
  }
  return "Good question! 🌿 Try asking about bike commuting, food choices, electricity, or water usage — I have specific CO₂-saving tips for those!";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ───── INIT ─────

function init() {
  setupTabs();
  setupDarkMode();
  setupCalculator();
  setupChat();

  document.getElementById("pointsDisplay").textContent = state.points;

  renderDashboard();
  renderChallenges();
  renderDashboardCharts(); // dashboard tab is active by default
}

document.addEventListener("DOMContentLoaded", init);