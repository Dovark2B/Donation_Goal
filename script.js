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
    const progress = Math.min((ts - startTs) / duration, 1);
    const val = progress * (end - start) + start;
    const valFmt = val.toLocaleString('fr-FR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    obj.innerHTML = `${valFmt}&nbsp;/&nbsp;${goalFmt}&nbsp;€`;
    if (progress < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

function updateLiquidWave(current, goal) {
  const percent = Math.min(current / goal, 1);
  const leftPercent = current >= goal ? 0 : (1 - percent) * -100 - 15;
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

// ----- Tout dans DOMContentLoaded -----
window.addEventListener('DOMContentLoaded', () => {
  // Récup des params et DOM
  DONATION_GOAL = getParam('goal', 100);
  displayedAmount = getParam('amount', 0);
  objAmount = document.getElementById('GoalAmount');

  // Affichage initial
  if (objAmount) {
    objAmount.innerHTML =
      `${displayedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` +
      `&nbsp;/&nbsp;${DONATION_GOAL.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;€`;
  }

  //  Init de la vague au chargement
  updateLiquidWave(displayedAmount, DONATION_GOAL);

  const goalTextParam = getParam('goaltext', 'Donation Goal <br> Nouveau micro');
   const fontParam = getParam('font', 'Cinzel, Helvetica, sans-serif');
   const goalTextEl = document.querySelector('.GoalText');
   if (goalTextEl) {
       // remplacer les <br> s’ils sont encodés
         goalTextEl.innerHTML    = goalTextParam.replace(/<br\s*\/?>/gi, '<br>');
       goalTextEl.style.fontFamily = fontParam;
     }


  const client = new StreamerbotClient({
    host: "127.0.0.1",
    port: 8080,
    subscribe: {
      // on garde le Custom-test pour simuler les dons
      "General": ["Custom"],
      // on ne s'abonne plus à TipeeeStream, on forward tout en Custom
      // (ou si tu veux toujours écouter les vraies, tu peux laisser TipeeeStream: ["Donation"])
    },
    onConnect: () => console.log("✨ Connecté à Streamer.bot"),
    onDisconnect: () => console.warn("⚠️ Déconnecté de Streamer.bot"),
    onData: (payload) => {
      if (!payload.event) return;
      const { source, type } = payload.event;

      // --- cas du test-trigger Handmade ---
      if (source === "General" && type === "Custom") {
        // on ne traite que si payload.data.amount existe (don test)
        const raw = payload.data?.amount;
        if (raw != null) {
          const amt = parseFloat(String(raw).replace(",", ".")) || 0;
          if (amt > 0) handleDonation(amt);
        }
        return;
      }

      // (éventuellement d'autres cas…)
    }
  });
});
