/**
 * Anime la valeur d'un élément de start à end en duration ms,
 * en affichant "courant / objectif €".
 */
function animateNumber(obj, start, end, duration, goal) {
  let startTs = null;
  const goalFormatted = goal.toLocaleString('fr-FR');
  const step = (ts) => {
    if (!startTs) startTs = ts;
    const progress = Math.min((ts - startTs) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    const currentFormatted = currentValue.toLocaleString('fr-FR');
    obj.innerHTML = `${currentFormatted}&nbsp;/&nbsp;${goalFormatted}&nbsp;€`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function updateLiquidWave(currentAmount, goalAmount) {
  const percent = Math.min(currentAmount / goalAmount, 1);
  const minLeft = -4, maxLeft = 98;
  const leftPercent = minLeft + (maxLeft - minLeft) * percent;

  document.querySelectorAll('.liquid-svg-1, .liquid-svg-2')
    .forEach(svg => svg.style.left = `${leftPercent}%`);
  document.querySelector('.ProgressionLiquid')
    .style.clipPath = `inset(0 calc(100% - ${leftPercent + 1}%) 0 0)`;
}

function getParam(name, fallback) {
  const u = new URL(window.location.href);
  const v = u.searchParams.get(name);
  if (v === null) return fallback;
  return (typeof fallback === 'number') ? parseFloat(v) : v;
}

let DONATION_GOAL   = getParam('goal',   100);
let currentAmount   = getParam('amount', 0);
let displayedAmount = currentAmount;

const objAmount = document.getElementById('GoalAmount');
// Affichage initial avec "/ goal €"
if (objAmount) {
  objAmount.innerHTML =
    `${displayedAmount.toLocaleString('fr-FR')}` +
    `&nbsp;/&nbsp;${DONATION_GOAL.toLocaleString('fr-FR')}&nbsp;€`;
}

// WS comme avant
const WS_URL = 'ws://127.0.0.1:8080';
const ws     = new WebSocket(WS_URL);

ws.addEventListener('open', () => {
  console.log(`✨ WS connecté à ${WS_URL}`);
  ws.send(JSON.stringify({
    request: "Subscribe",
    id:      "sub_custom",
    events: { "General": ["Custom"] }
  }));
});

ws.addEventListener('message', ({ data }) => {
  let payload;
  try { payload = JSON.parse(data); }
  catch { return; }
  if (payload.request === "Hello") return;

  const ev = payload.event;
  if (ev?.source === "General" && ev?.type === "Custom") {
    const d = payload.data;
    const amount = parseFloat(String(d.amount).replace(',', '.')) || 0;
    if (amount > 0) {
      const old = displayedAmount;
      const neu = displayedAmount + amount;
      displayedAmount = neu;

      // Anime le nombre courant sur 1s (1000ms)
      animateNumber(objAmount, old, neu, 1000, DONATION_GOAL);

      // Et la vague en parallèle
      updateLiquidWave(displayedAmount, DONATION_GOAL);

      console.log(`🎉 +${amount} reçu → total ${displayedAmount}`);
    }
  }
});

// Initialisation de la vague
updateLiquidWave(displayedAmount, DONATION_GOAL);

// Texte et police (inchangé)
document.querySelector('.GoalText').innerHTML =
  getParam('goaltext', 'Donation Goal').replace(/<br\s*\/?>/gi, '<br>');
document.querySelector('.GoalText').style.fontFamily =
  decodeURIComponent(getParam('font', 'Cinzel, Helvetica, sans-serif'));
