import { useState } from 'react';
import { api } from '../../api/client.js';

/**
 * Bannière intelligente de fin d'année : apparaît quand l'année courante
 * approche de sa fin (paramètre auto_advance_days). L'école voit un aperçu
 * de ce que la bascule fera (promotions, diplômés) et la valide en un clic.
 */
export default function YearAdvanceBanner({ status }) {
  const [preview, setPreview] = useState(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadPreview = async () => {
    setOpen(!open);
    if (!preview) {
      try {
        const d = await api('/reports/year/advance/preview');
        setPreview(d);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  const doAdvance = async () => {
    if (!window.confirm(
      `Clôturer l'année ${status.year.label} et créer ${status.nextLabel} ?\n\n` +
      'Les élèves actifs seront promus vers la classe supérieure, les élèves de classe terminale seront marqués diplômés. ' +
      'Les impayés ne sont PAS reportés automatiquement (exportez la liste avant si besoin).'
    )) return;
    setBusy(true);
    setError('');
    try {
      const d = await api('/reports/year/advance', { method: 'POST', body: {} });
      setResult(d);
      window.location.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ borderColor: '#f59e0b', background: '#fffbeb', marginBottom: 16 }}>
      <div className="flex between wrap" style={{ gap: 10, alignItems: 'center' }}>
        <div>
          <b>🎓 Fin d'année scolaire {status.year.label} dans {status.daysLeft} jour(s)</b>
          <div className="mini" style={{ marginTop: 2 }}>
            {status.nextYearExists
              ? `L'année ${status.nextLabel} existe déjà — vous pouvez la définir comme année courante depuis l'admin.`
              : `Préparez ${status.nextLabel} : promotion des élèves, nouvelles échéances, frais ajustables.`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={loadPreview} disabled={status.nextYearExists}>
            {open ? 'Masquer l\'aperçu' : 'Voir ce qui sera fait'}
          </button>
          {!status.nextYearExists && (
            <button className="btn primary" onClick={doAdvance} disabled={busy}>
              {busy ? <span className="spinner" /> : `Passer à ${status.nextLabel}`}
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}
      {result && <div className="alert success" style={{ marginTop: 10 }}>{result.message}</div>}
      {open && preview && (
        <div style={{ marginTop: 14 }}>
          <b className="mini">APERÇU DE LA BASCULE {status.year.label} → {status.nextLabel}</b>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th>Classe</th><th>Niveau</th><th>Élèves actifs</th><th>Après la bascule</th></tr></thead>
              <tbody>
                {preview.preview?.classes?.map((c) => (
                  <tr key={c.name}>
                    <td><b>{c.name}</b></td>
                    <td>{c.level}</td>
                    <td>{c.students}</td>
                    <td>
                      {c.is_terminal
                        ? <span className="pill info">Diplômés ({c.students})</span>
                        : <span className="pill ok">→ {c.promotesTo || c.name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mini" style={{ marginTop: 8 }}>
            ⚠ Les paiements et impayés de {status.year.label} restent archivés et consultables. Les échéances de {status.nextLabel} sont créées aux mêmes montants — ajustez-les ensuite depuis Admin → Échéances.
          </p>
        </div>
      )}
    </div>
  );
}
