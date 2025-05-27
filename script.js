/**
 * Fait monter la vague selon le pourcentage d'argent reçu.
 * @param {number} currentAmount - Montant reçu actuellement.
 * @param {number} goalAmount - Objectif de dons.
 */
function updateLiquidWave(currentAmount, goalAmount) {
    const percent = Math.min(currentAmount / goalAmount, 1);
    const minLeft = -4, maxLeft = 98;
    const leftPercent = minLeft + (maxLeft - minLeft) * percent;

    document.querySelectorAll('.liquid-svg-1, .liquid-svg-2')
        .forEach(svg => svg.style.left = `${leftPercent}%`);
    document.querySelector('.ProgressionLiquid')
        .style.clipPath = `inset(0 calc(100% - ${leftPercent + 1}%) 0 0)`;

    const goalDiv = document.getElementById('GoalAmount');
    if (goalDiv) {
        goalDiv.innerHTML =
            `${currentAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` +
            `&nbsp;/&nbsp;` +
            `${goalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` +
            `&nbsp;€`;
    }
}

function getParam(name, fallback) {
    const u = new URL(window.location.href);
    const v = u.searchParams.get(name);
    if (v === null) return fallback;
    return (typeof fallback === 'number') ? parseFloat(v) : v;
}

let DONATION_GOAL = getParam('goal', 100);
let currentAmount = getParam('amount', 0);

const WS_URL = 'ws://127.0.0.1:8080';
const ws     = new WebSocket(WS_URL);

ws.addEventListener('open', () => {
  console.log(`✨ WS connecté à ${WS_URL}`);

  // On s'abonne aux événements Custom (catégorie General)
  ws.send(JSON.stringify({
    request: "Subscribe",
    id:      "sub_custom",
    events: {
      "General": ["Custom"]
    }
  }));
});

ws.addEventListener('message', ({ data }) => {
  let payload;
  try {
    payload = JSON.parse(data);
  } catch {
    return; // ignore non-JSON
  }

  // ignore le handshake initial
  if (payload.request === "Hello") return;

  const ev = payload.event;
  if (ev?.source === "General" && ev?.type === "Custom") {
    const d = payload.data;
    // d.username, d.amount, etc. sont là
    const amount = parseFloat(String(d.amount).replace(',', '.')) || 0;
    if (amount > 0) {
      currentAmount += amount;
      updateLiquidWave(currentAmount, DONATION_GOAL);
      console.log(`🎉 +${amount} reçu → total ${currentAmount}`);
    }
  }
});



// Affichage initial
updateLiquidWave(currentAmount, DONATION_GOAL);

// Texte et police depuis l’URL
document.querySelector('.GoalText').innerHTML =
    getParam('goaltext', 'Donation Goal')
        .replace(/<br\s*\/?>/gi, '<br>');
document.querySelector('.GoalText').style.fontFamily =
    decodeURIComponent(getParam('font', 'Cinzel, Helvetica, sans-serif'));
