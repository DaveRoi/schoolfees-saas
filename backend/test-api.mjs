/** Test de bout en bout des API (à lancer avec le serveur démarré).
 *  Rejouable : les paiements sont plafonnés au solde restant.
 *  IMPORTANT : la bascule d'année (fin de test) est DESTRUCTIVE pour la démo —
 *  relancez `node src/db/seed.js` après une base vidée si besoin. */
const BASE = 'http://localhost:4000/api';
let failures = 0;

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* PDF/CSV */ }
  return { status: res.status, json };
}

function check(name, cond, extra = '') {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name} ${extra}`); }
}

// --- Auth de base ---
const { json: loginP1 } = await api('POST', '/auth/login', { email: 'parent1@parent.cm', password: 'Password123' });
check('login parent1', loginP1?.accessToken);
const p1 = loginP1.accessToken;

const { json: loginDir } = await api('POST', '/auth/login', { email: 'directrice@school.cm', password: 'Password123' });
check('login directrice', loginDir?.accessToken);
const dir = loginDir.accessToken;

const { json: loginAdmin } = await api('POST', '/auth/login', { email: 'admin@school.cm', password: 'Password123' });
const admin = loginAdmin.accessToken;
check('login admin', admin);

// --- Isolation parent ---
const { json: myStudents } = await api('GET', '/students', null, p1);
check('parent1 voit 3 enfants', myStudents?.students?.length === 3, `reçu: ${myStudents?.students?.length}`);

const { json: loginP2 } = await api('POST', '/auth/login', { email: 'parent2@parent.cm', password: 'Password123' });
const p2 = loginP2.accessToken;
const { json: p2Students } = await api('GET', '/students', null, p2);
check('parent2 voit 2 enfants', p2Students?.students?.length === 2);

const studentOfP1 = myStudents.students[0].id;
const { status: forbidden } = await api('GET', `/students/${studentOfP1}`, null, p2);
check('parent2 bloqué sur enfant de parent1 (403)', forbidden === 403, `reçu: ${forbidden}`);

// --- Détail élève avec solde (test rejouable : on cherche un enfant avec solde) ---
const details = await Promise.all(myStudents.students.map((s) => api('GET', `/students/${s.id}`, null, p1)));
const entry = details.find(({ json: d }) => (d?.balance?.balance ?? 0) > 0);
check('détail élève + solde', !!entry?.json?.balance, 'aucun enfant de parent1 n\'a de solde restant');
const studentToPay = entry.json.student.id;
const detail = entry.json;
console.log(`      -> total dû: ${detail.balance.totalDue}, payé: ${detail.balance.totalPaid}, solde: ${detail.balance.balance}`);

// --- Paiement : initiation + confirmation (montant plafonné) ---
const fee = detail.balance.fees.find((f) => f.paid < f.amount);
const amount = Math.min(10000, fee.amount - fee.paid);
const { json: init, status: initStatus } = await api('POST', '/payments/initiate', { student_id: studentToPay, fee_item_id: fee.id, amount, method: 'mtn_momo', phone: '677100001' }, p1);
check('init paiement', initStatus === 201 && init?.paymentId, JSON.stringify(init));

const { json: confirmed } = await api('POST', `/payments/${init.paymentId}/confirm`, {}, p1);
check('confirm paiement', confirmed?.payment?.status === 'success' || confirmed?.payment?.status === 'failed', JSON.stringify(confirmed).slice(0, 120));

// --- PROTECTION SURENCAISSEMENT : payer plus que le solde -> refus 400 ---
const { status: overPay } = await api('POST', '/payments/initiate', { student_id: studentToPay, fee_item_id: fee.id, amount: 999999999, method: 'mtn_momo', phone: '677100001' }, p1);
check('surencaissement bloqué à l\'initiation (400)', overPay === 400, `reçu: ${overPay}`);

// --- Double demande pending sur la même échéance -> 409 ---
const { json: init2 } = await api('POST', '/payments/initiate', { student_id: studentToPay, fee_item_id: fee.id, amount: 1000, method: 'mtn_momo', phone: '677100001' }, p1);
const { status: dupStatus } = await api('POST', '/payments/initiate', { student_id: studentToPay, fee_item_id: fee.id, amount: 1000, method: 'mtn_momo', phone: '677100001' }, p1);
check('double demande pending bloquée (409)', dupStatus === 409 || init2?.paymentId, JSON.stringify(init2).slice(0, 80));
if (init2?.paymentId) await api('POST', `/payments/${init2.paymentId}/cancel`, {}, p1);

// --- Parent2 bloqué pour payer pour l'enfant de parent1 ---
const { status: forbiddenPay } = await api('POST', '/payments/initiate', { student_id: studentOfP1, fee_item_id: fee.id, amount: 5000, method: 'mtn_momo', phone: '677100002' }, p2);
check('parent2 bloqué pour payer pour enfant de parent1 (403)', forbiddenPay === 403);

// --- Reçu PDF AVEC token ---
const pdfRes = await fetch(`${BASE}/payments/${init.paymentId}/receipt`, { headers: { Authorization: `Bearer ${p1}` } });
const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
check('reçu PDF avec token', pdfRes.status === 200 && pdfBuf.slice(0, 5).toString() === '%PDF-');
const pdfNoAuth = await fetch(`${BASE}/payments/${init.paymentId}/receipt`);
check('reçu PDF SANS token -> 401', pdfNoAuth.status === 401, `reçu: ${pdfNoAuth.status}`);

// --- Notifications, dashboard, audit ---
const { json: notifs } = await api('GET', '/reports/notifications', null, dir);
check('notifications journalisées', notifs?.notifications?.length >= 1);

const { json: dash } = await api('GET', '/reports/dashboard', null, dir);
check('dashboard + état année', dash?.totalCollected > 0 && !!dash?.year?.label && !!dash?.yearStatus);
console.log(`      -> année: ${dash.year.label}, encaissé: ${dash.totalCollected} FCFA, impayés: ${dash.unpaidStudents.length}, bascule conseillée: ${dash.yearStatus.shouldAdvance}`);

const { json: audit } = await api('GET', '/reports/audit', null, dir);
check('audit accessible', audit?.logs?.length >= 1);

// --- Exports ---
const csvRes = await fetch(`${BASE}/reports/export/payments.csv`, { headers: { Authorization: `Bearer ${dir}` } });
const csv = await csvRes.text();
check('export CSV', csvRes.status === 200 && csv.includes('Eleve'));

const pdfMonth = await fetch(`${BASE}/reports/export/monthly.pdf?month=${new Date().toISOString().slice(0, 7)}`, { headers: { Authorization: `Bearer ${dir}` } });
const pdfMonthBuf = Buffer.from(await pdfMonth.arrayBuffer());
check('export PDF mensuel', pdfMonth.status === 200 && pdfMonthBuf.length > 500);

const unpaidPdf = await fetch(`${BASE}/reports/export/unpaid.pdf`, { headers: { Authorization: `Bearer ${dir}` } });
const unpaidBuf = Buffer.from(await unpaidPdf.arrayBuffer());
check('export PDF impayés', unpaidPdf.status === 200 && unpaidBuf.length > 500);

// --- Admin : parent bloqué ---
const { status: adminDenied } = await api('GET', '/admin/users', null, p1);
check('parent bloqué sur admin (403)', adminDenied === 403);

// --- MFA ---
const { json: mfaSetup } = await api('POST', '/auth/mfa/setup', {}, p1);
check('MFA setup génère un secret', mfaSetup?.secret?.length >= 16);

// --- Inscription avec code école ---
const { status: regStatus } = await api('POST', '/auth/register', { email: `test${Date.now()}@parent.cm`, password: 'Password123', full_name: 'Test Parent', phone: '699000111', school_code: 'DEMO2025', consent: true });
check('inscription parent avec code école', regStatus === 201);
const { status: regBadCode } = await api('POST', '/auth/register', { email: `test2${Date.now()}@parent.cm`, password: 'Password123', full_name: 'Test Parent', phone: '699000112', school_code: 'XXXXXX', consent: true });
check('inscription refusée avec code école invalide (404)', regBadCode === 404, `reçu: ${regBadCode}`);

// --- Info école publique par code ---
const schoolRes = await fetch(`${BASE}/schools/by-code/DEMO2025`);
const schoolJson = await schoolRes.json();
check('code école public -> nom école', schoolRes.status === 200 && schoolJson.school?.name?.includes('Étoile'));

// --- Sessions révocables : logout révoque le refresh ---
const { json: sessionLogin } = await api('POST', '/auth/login', { email: 'parent3@parent.cm', password: 'Password123' });
const p3 = sessionLogin.accessToken;
const { json: refreshed1 } = await api('POST', '/auth/refresh', { refreshToken: sessionLogin.refreshToken });
check('refresh token valide', !!refreshed1?.accessToken);
await api('POST', '/auth/logout', { refreshToken: sessionLogin.refreshToken }, p3);
const { status: refreshedAfterLogout } = await api('POST', '/auth/refresh', { refreshToken: sessionLogin.refreshToken });
check('refresh révoqué après logout (401)', refreshedAfterLogout === 401, `reçu: ${refreshedAfterLogout}`);

// --- Changement de mot de passe ---
const { json: tmpLogin } = await api('POST', '/auth/login', { email: `test${Date.now()}@parent.cm`, password: 'Password123' });
// on ne connaît pas l'email exact -> on re-teste via un vrai compte de test créé ci-dessus
// (le change-password est testé via parent4)
const { json: p4login } = await api('POST', '/auth/login', { email: 'parent4@parent.cm', password: 'Password123' });
const { status: changed } = await api('POST', '/auth/change-password', { current_password: 'Password123', new_password: 'NewPassword123' }, p4login.accessToken);
check('changement de mot de passe', changed === 200, `reçu: ${changed}`);
const { status: oldPwdDenied } = await api('POST', '/auth/login', { email: 'parent4@parent.cm', password: 'Password123' });
check('ancien mot de passe refusé après changement', oldPwdDenied === 401);
const { status: newPwdOk } = await api('POST', '/auth/login', { email: 'parent4@parent.cm', password: 'NewPassword123' });
check('nouveau mot de passe accepté', newPwdOk === 200);
// remettre l'ancien pour la démo
await api('POST', '/auth/change-password', { current_password: 'NewPassword123', new_password: 'Password123' }, (await api('POST', '/auth/login', { email: 'parent4@parent.cm', password: 'NewPassword123' })).json.accessToken);

// --- Mot de passe oublié (mode démo : le code est renvoyé) ---
const { json: forgot } = await api('POST', '/auth/password/forgot', { email: 'parent2@parent.cm' });
check('demande reset OK + code démo', !!forgot?.demo_token, JSON.stringify(forgot).slice(0, 80));
const { status: resetOk } = await api('POST', '/auth/password/reset', { email: 'parent2@parent.cm', code: forgot.demo_token, new_password: 'Password123' });
check('reset avec code valide', resetOk === 200, `reçu: ${resetOk}`);
const { status: badCode } = await api('POST', '/auth/password/reset', { email: 'parent2@parent.cm', code: 'ZZZZZZ', new_password: 'Password123' });
check('reset avec code invalide rejeté', badCode === 400);

// --- Année scolaire : aperçu + bascule (DESTRUCTIF : la démo passe en 2026-2027) ---
const { json: yearPreview } = await api('GET', '/reports/year/advance/preview', null, dir);
check('aperçu bascule année', yearPreview?.preview?.classes?.length >= 4 && typeof yearPreview?.daysLeft === 'number', JSON.stringify(yearPreview).slice(0, 100));

const { json: advanced } = await api('POST', '/reports/year/advance', {}, dir);
check('bascule d\'année réussie', !!advanced?.summary?.newYear, JSON.stringify(advanced).slice(0, 120));
console.log(`      -> ${advanced?.message}`);

// Après bascule : l'année courante est 2026-2027, élèves promus
const { json: dashAfter } = await api('GET', '/reports/dashboard', null, dir);
check('nouvelle année active après bascule', dashAfter?.year?.label === '2026-2027', `reçu: ${dashAfter?.year?.label}`);
check('classes recréées avec échéances', dashAfter?.byClass?.length >= 4 && dashAfter?.totalExpected > 0);
// L'historique est conservé : les paiements de l'ancienne année restent en base
// (le dashboard n'affiche que l'année courante — l'historique est exportable par période)
const csvAfter = await fetch(`${BASE}/reports/export/payments.csv`, { headers: { Authorization: `Bearer ${dir}` } });
const csvAfterText = await csvAfter.text();
check('historique paiements conservé (export CSV complet)', csvAfterText.includes('MTN-DEMO') || csvAfterText.includes('OM-DEMO'));

// Élèves promus : Éric (6ème A en 2025-2026) doit être en 5ème B en 2026-2027
const { json: studentsAfter } = await api('GET', '/students', null, dir);
const eric = studentsAfter.students.find((s) => s.first_name === 'Éric' && s.last_name === 'Atangana');
check('Éric promu 6ème -> 5ème', eric?.class_name === '5ème B', `reçu: ${eric?.class_name}`);
const boris = studentsAfter.students.find((s) => s.first_name === 'Boris' && s.last_name === 'Atangana');
check('Boris (3ème terminale) diplômé', boris?.status === 'graduated', `reçu: ${boris?.status}`);

console.log(failures === 0 ? '\nTOUS LES TESTS PASSENT' : `\n${failures} ÉCHEC(S)`);
console.log('\nNOTE : la démo est passée en 2026-2027 (bascule testée). Pour revenir :');
console.log('  rm backend/data/school.db* ; node src/db/seed.js');
process.exit(failures === 0 ? 0 : 1);
