/**
 * Fait monter la vague selon le pourcentage d'argent reçu, même si la barre est responsive.
 * @param {number} currentAmount - Montant reçu actuellement.
 * @param {number} goalAmount - Objectif de dons.
 */
function updateLiquidWave(currentAmount, goalAmount) {
    const percent = Math.min(currentAmount / goalAmount, 1);

    const minLeft = -4;
    const maxLeft = 98;
    const leftPercent = minLeft + (maxLeft - minLeft) * percent;

    document.querySelectorAll('.liquid-svg-1, .liquid-svg-2').forEach(svg => {
        svg.style.left = `${leftPercent}%`;
    });

    document.querySelector('.ProgressionLiquid').style.clipPath = `inset(0 calc(100% - ${leftPercent + 1}%) 0 0)`;

    // MAJ du compteur dynamique
    const goalAmountDiv = document.getElementById('GoalAmount');
    if (goalAmountDiv) {
        goalAmountDiv.innerHTML = `${currentAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}&nbsp;/&nbsp;${goalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}&nbsp;€`;
    }
}

function getParam(name, fallback) {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(name);
    if (value === null) return fallback;
    if (!isNaN(fallback)) return parseFloat(value); // Si le fallback est un nombre, parseFloat
    return value; // Sinon, retourne la chaîne (pour le texte)
}

let DONATION_GOAL = getParam('goal', 100); // Objectif en euros
let currentAmount = getParam('amount', 0);

// Connexion au WebSocket Streamer.bot
const ws = new WebSocket('ws://localhost:8080'); // Change le port si besoin

ws.onopen = () => {
    console.log('Connecté à Streamer.bot WebSocket');
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        if (data.event === "donation") {
            // Si Streamer.bot t'envoie le total cumulé
            if (typeof data.total === "number") {
                currentAmount = data.total;
            } else if (typeof data.amount === "number") {
                currentAmount += data.amount;
            }
            updateLiquidWave(currentAmount, DONATION_GOAL);
        }
    } catch (e) {
        // Ignore les messages non JSON
    }
};

// Appel initial pour afficher la barre au démarrage
updateLiquidWave(currentAmount, DONATION_GOAL);

const goalText = getParam('goaltext', 'Donation Goal : Nouveau micro');
document.querySelector('.GoalText').textContent = goalText;

