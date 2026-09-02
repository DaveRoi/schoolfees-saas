import crypto from 'node:crypto';

/**
 * SIMULATION des API MTN MoMo et Orange Money (mode sandbox).
 * En production : remplacer par les appels HTTP réels vers :
 *  - MTN : https://momodeveloper.mtn.com (Collections API)
 *  - Orange : https://developer.orange.com (Orange Money Web Payment)
 *
 * Flow simulé identique au vrai :
 *  1. initiatePayment -> demande USSD push sur le téléphone du client
 *  2. Le client valide avec son code secret (ici : code fictif "1234")
 *  3. checkStatus -> succès (95%), échec aléatoire (5%) pour tester les cas d'erreur
 */
export function initiatePayment({ method, phone, amount, reference }) {
  const provider = method === 'mtn_momo' ? 'MTN-MOMO' : 'ORANGE-MONEY';
  const providerRef = `${provider}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  console.log(`[momo:simulate] ${provider} : demande de ${amount} FCFA sur ${phone} (ref: ${reference || providerRef})`);
  return {
    providerRef,
    ussdPrompt: `Une demande de paiement de ${amount} FCFA a été envoyée sur ${phone}. Composez votre code secret pour valider.`,
  };
}

export function checkStatus({ providerRef, method }) {
  // 95% de succès, 5% d'échec pour tester la robustesse (insuffisant / refusé)
  const success = crypto.randomInt(0, 100) < 95;
  return {
    providerRef,
    status: success ? 'success' : 'failed',
    reason: success ? null : 'Fonds insuffisants sur le compte Mobile Money.',
  };
}

export const PAYMENT_METHODS = [
  { id: 'mtn_momo', label: 'MTN Mobile Money', prefix: '6' },
  { id: 'orange_money', label: 'Orange Money', prefix: '69' },
];
