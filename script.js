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
                // La vague reste au max si on a atteint le goal
                svg.style.left = '0%';
            } else {
                svg.classList.remove('complete');
                svg.style.left = `${leftPercent}%`;
            }
        });
}

// ----- 2) Variables qui seront assignées au chargement -----
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
    
    // Si on dépasse le goal actuel
    if (AUTO_INCREASE && neu >= DONATION_GOAL) {
        // Le nouveau goal est le montant total + INCREASE_AMOUNT
        const newGoal = neu + INCREASE_AMOUNT;
        
        // On anime d'abord jusqu'au goal actuel
        animateNumber(objAmount, old, neu, 1000, DONATION_GOAL);
        updateLiquidWave(neu, DONATION_GOAL);
        
        // Puis on augmente le goal
        setTimeout(() => {
            DONATION_GOAL = newGoal; // Goal = montant reçu + INCREASE_AMOUNT
            console.log(`🎯 Goal atteint ! Nouveau goal : ${DONATION_GOAL}€`);
            
            // Et on met à jour l'affichage avec le nouveau goal
            animateNumber(objAmount, neu, neu, 1000, DONATION_GOAL);
            updateLiquidWave(neu, DONATION_GOAL);
        }, 1500);
    } else {
        // Comportement normal si on n'atteint pas le goal
        animateNumber(objAmount, old, neu, 1000, DONATION_GOAL);
        updateLiquidWave(neu, DONATION_GOAL);
    }
    
    console.log(`🎉 +${amount}€ → total ${displayedAmount}€ / ${DONATION_GOAL}€`);
}

// ----- Tout dans DOMContentLoaded -----
window.addEventListener('DOMContentLoaded', () => {
  // Récup des params et DOM
  DONATION_GOAL = getParam('goal', 100);
  initialGoal = DONATION_GOAL; // Garde en mémoire le goal initial
  displayedAmount = getParam('amount', 0);
  AUTO_INCREASE = getParam('autoIncrease', 'false') === 'true';
  INCREASE_AMOUNT = getParam('increaseAmount', 50);
  objAmount = document.getElementById('GoalAmount');

  // Log les paramètres
  console.log(`📊 Goal initial: ${DONATION_GOAL}€`);
  console.log(`🔄 Auto-increase: ${AUTO_INCREASE ? 'Activé' : 'Désactivé'}`);
  if (AUTO_INCREASE) {
      console.log(`⬆️ Montant d'augmentation: ${INCREASE_AMOUNT}€`);
  }

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


  // Remplace le listener WebSocket actuel par celui-ci
  const client = new StreamerbotClient({
    host: "127.0.0.1",
    port: 8080,
    subscribe: "*",
    onConnect: () => console.log("✨ Connecté à Streamer.bot"),
    onDisconnect: () => console.log("❌ Déconnecté de Streamer.bot"),
    onData: (payload) => {
        if (!payload.event) return;
        
        // Log pour debug
        console.log("Données reçues:", payload);

        // 1) Event standard (donation TipeeeStream)
        if (payload.event.source === "TipeeeStream" && payload.event.type === "Donation") {
            const amount = parseFloat(String(payload.data.amount).replace(',', '.')) || 0;
            if (amount > 0) {
                handleDonation(amount);
            }
            return;
        }

        // 2) Event Custom (pour les tests et autres sources de dons)
        if (payload.event.source === "General" && payload.event.type === "Custom") {
            const data = payload.data;
            // Support de tous les formats possibles
            if (data.type?.toLowerCase().includes('don') || 
                data.type?.toLowerCase().includes('donation') || 
                data.type?.toLowerCase().includes('tip')) {
                
                const amount = parseFloat(String(data.amount).replace(',', '.')) || 0;
                if (amount > 0) {
                    handleDonation(amount);
                }
            }
        }
    }
  });
});
