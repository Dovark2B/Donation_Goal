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
        svg.style.left = '0%';
      } else {
        svg.classList.remove('complete');
        svg.style.left = `${leftPercent}%`;
      }
    });
}

// ----- 1bis) Anti-doublon -----
const seenDonations = new Map(); // key -> timestamp (ms)
const DEDUPE_WINDOW_MS = 10_000;

function isDuplicateDonation(key) {
  const now = Date.now();
  for (const [k, t] of seenDonations) {
    if (now - t > DEDUPE_WINDOW_MS) seenDonations.delete(k);
  }
  if (seenDonations.has(key)) return true;
  seenDonations.set(key, now);
  return false;
}

function makeDonationKey(payload, amount) {
  const src  = payload?.event?.source || '';
  const type = payload?.event?.type || '';
  const id =
    payload?.data?.transactionId ||
    payload?.data?.id ||
    payload?.data?.paymentId ||
    payload?.data?.uuid ||
    '';
  const who =
    payload?.data?.username ||
    payload?.data?.name ||
    payload?.data?.email ||
    '';
  const amt = Number.parseFloat(amount).toFixed(2);
  return `${src}|${type}|${id}|${who}|${amt}`;
}

// ----- 2) Variables assignées au chargement -----
let DONATION_GOAL, displayedAmount, objAmount;
let AUTO_INCREASE = false;
let INCREASE_AMOUNT = 50;
let initialGoal = 0;

// ----- 3) Handler commun -----
function handleDonation(amount) {
  console.log('→ handleDonation:', amount);
  const old = displayedAmount;
  const neu = old + amount;
  displayedAmount = neu;

  if (AUTO_INCREASE && neu >= DONATION_GOAL) {
    const newGoal = neu + INCREASE_AMOUNT;

    animateNumber(objAmount, old, neu, 1000, DONATION_GOAL);
    updateLiquidWave(neu, DONATION_GOAL);

    setTimeout(() => {
      DONATION_GOAL = newGoal;
      console.log(`🎯 Goal atteint ! Nouveau goal : ${DONATION_GOAL}€`);
      animateNumber(objAmount, neu, neu, 1000, DONATION_GOAL);
      updateLiquidWave(neu, DONATION_GOAL);
    }, 1500);
  } else {
    animateNumber(objAmount, old, neu, 1000, DONATION_GOAL);
    updateLiquidWave(neu, DONATION_GOAL);
  }

  console.log(`🎉 +${amount}€ → total ${displayedAmount}€ / ${DONATION_GOAL}€`);
}

// ----- 4) DOMContentLoaded -----
window.addEventListener('DOMContentLoaded', () => {
  // Params et DOM
  DONATION_GOAL   = getParam('goal', 100);
  initialGoal     = DONATION_GOAL;
  displayedAmount = getParam('amount', 0);
  AUTO_INCREASE   = getParam('autoIncrease', 'false') === 'true';
  INCREASE_AMOUNT = getParam('increaseAmount', 50);
  objAmount       = document.getElementById('GoalAmount');

  console.log(`📊 Goal initial: ${DONATION_GOAL}€`);
  console.log(`🔄 Auto-increase: ${AUTO_INCREASE ? 'Activé' : 'Désactivé'}`);
  if (AUTO_INCREASE) console.log(`⬆️ Montant d'augmentation: ${INCREASE_AMOUNT}€`);

  // Affichage initial
  if (objAmount) {
    objAmount.innerHTML =
      `${displayedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` +
      `&nbsp;/&nbsp;${DONATION_GOAL.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;€`;
  }

  // Vague initiale
  updateLiquidWave(displayedAmount, DONATION_GOAL);

  // Texte & police
  const goalTextParam = getParam('goaltext', 'Donation Goal <br> Nouveau micro');
  const fontParam     = getParam('font', 'Cinzel, Helvetica, sans-serif');
  const goalTextEl    = document.querySelector('.GoalText');
  if (goalTextEl) {
    goalTextEl.innerHTML = goalTextParam.replace(/<br\s*\/?>/gi, '<br>');
    goalTextEl.style.fontFamily = fontParam;
  }

  // ----- 5) WebSocket → on ne garde QUE les Custom -----
  const client = new StreamerbotClient({
    host: "127.0.0.1",
    port: 8080,
    subscribe: "*",
    onConnect: () => console.log("✨ Connecté à Streamer.bot"),
    onDisconnect: () => console.log("❌ Déconnecté de Streamer.bot"),
    onData: (payload) => {
      if (!payload?.event) return;

      // Log debug
      console.log("Données reçues:", payload);

      // On ignore TOUT sauf: General → Custom
      if (!(payload.event.source === "General" && payload.event.type === "Custom")) return;

      const data = payload.data || {};
      const typeStr = (data.type || '').toLowerCase();

      // On ne traite que les customs de type don
      if (
        typeStr.includes('don') ||
        typeStr.includes('donation') ||
        typeStr.includes('tip')
      ) {
        // Le champ "amount" peut venir sous diverses formes (string "5" / "5,00" / nombre)
        const amount = parseFloat(String(data.amount).replace(',', '.')) || 0;
        if (amount > 0) {
          const key = makeDonationKey(payload, amount);
          if (!isDuplicateDonation(key)) {
            handleDonation(amount);
          } else {
            console.log('⛔ Donation doublon ignorée:', key);
          }
        } else {
          console.warn('⚠️ Custom Donation reçu sans montant valide:', data.amount);
        }
      }
    }
  });
});
