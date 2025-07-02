// ----- 1) Helpers -----
function getParam(name, fallback) {
  const u = new URL(window.location.href);
  const v = u.searchParams.get(name);
  return v === null
    ? fallback
    : (typeof fallback === 'number' ? parseFloat(v) : v);
}

function animateNumber(obj, start, end, duration, goal) {
  let startTs = null;
  const goalFmt = goal.toLocaleString('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  function step(ts) {
    if (!startTs) startTs = ts;
    const progress = Math.min((ts - startTs)/duration, 1);
    const val = progress*(end - start) + start;
    const valFmt = val.toLocaleString('fr-FR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    obj.innerHTML = `${valFmt}&nbsp;/&nbsp;${goalFmt}&nbsp;€`;
    if (progress < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

function updateLiquidWave(current, goal) {
  const percent = Math.min(current/goal, 1);
  const leftPercent = current >= goal ? 0 : (1 - percent)*-100 - 15;
  document.querySelectorAll('.liquid-svg-1, .liquid-svg-2')
    .forEach(svg => {
      if (current >= goal) {
      svg.classList.add('complete');
    } else {
      svg.classList.remove('complete');
    }
    
    svg.style.left = `${leftPercent}%`;
    });
}

// ----- 2) Variables qui seront assignées au chargement -----
let DONATION_GOAL, displayedAmount, objAmount;

// ----- 3) Handler commun -----
function handleDonation(amount) {
  console.log('→ handleDonation:', amount);
  const old = displayedAmount;
  const neu = old + amount;
  displayedAmount = neu;
  animateNumber(objAmount, old, neu, 1000, DONATION_GOAL);
  updateLiquidWave(displayedAmount, DONATION_GOAL);
  console.log(`🎉 +${amount} → total ${displayedAmount}`);
}

// ----- 4) Tout dans DOMContentLoaded -----
window.addEventListener('DOMContentLoaded', () => {
  // 4a) Récup des params et DOM
  DONATION_GOAL   = getParam('goal', 100);
  displayedAmount = getParam('amount', 0);
  objAmount       = document.getElementById('GoalAmount');
  
  // 4b) Affichage initial
  if (objAmount) {
    objAmount.innerHTML =
      `${displayedAmount.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}` +
      `&nbsp;/&nbsp;${DONATION_GOAL.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}&nbsp;€`;
  }
  
  // 4c) Init de la vague au chargement
  updateLiquidWave(displayedAmount, DONATION_GOAL);

  // 4d) Création du client Streamerbot (comme ton script d’alertes)
  const client = new StreamerbotClient({
    host: "127.0.0.1", port: 8080,
    subscribe: "*",
    onConnect:    () => console.log("✨ Connecté à Streamer.bot"),
    onDisconnect: () => console.warn("⚠️ Déconnecté de Streamer.bot"),
    onData: (payload) => {
      if (!payload || !payload.event || !payload.data) return;
      console.log("WS →", payload.event.source, payload.event.type, payload.data);
      const { source, type } = payload.event;

      // test-trigger Custom
      if (source === "General" && type === "Custom") {
        const amt = parseFloat(String(payload.data.amount).replace(",", ".")) || 0;
        if (amt > 0) handleDonation(amt);
        return;
      }
      // vraies donations
      if (source === "TipeeeStream" && type === "Donation") {
        const amt = parseFloat(String(payload.data.amount).replace(",", ".")) || 0;
        if (amt > 0) handleDonation(amt);
      }
    }
  });
});
