import { useState } from 'react';
import { api } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

/**
 * Bannière intelligente de fin d'année : l'école voit un aperçu
 * de ce que la bascule fera (promotions, diplômés) et la valide en un clic.
 */
export default function YearAdvanceBanner({ status }) {
  const { t } = useLang();
  const [preview, setPreview] = useState(null);
  const [open, setOpen] = useState(false);
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
    if (!window.confirm(`${status.year.label} → ${status.nextLabel} ?`)) return;
    setBusy(true);
    setError('');
    try {
      await api('/reports/year/advance', { method: 'POST', body: {} });
      window.location.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ borderColor: '#f59e0b', background: 'var(--warning-bg)', marginBottom: 16 }}>
      <div className="flex between wrap" style={{ gap: 10, alignItems: 'center' }}>
        <div>
          <b>🎓 {t('year.banner')} {status.year.label} : {status.daysLeft} {t('year.days')}</b>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={loadPreview} disabled={status.nextYearExists}>
            {open ? t('year.hidePreview') : t('year.seePreview')}
          </button>
          {!status.nextYearExists && (
            <button className="btn primary sm" onClick={doAdvance} disabled={busy}>
              {busy ? <span className="spinner" /> : `${t('year.advance')} ${status.nextLabel}`}
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}
      {open && preview && (
        <div style={{ marginTop: 14 }}>
          <b className="mini">{t('year.preview')} {status.year.label} → {status.nextLabel}</b>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="responsive-table">
              <thead><tr><th>{t('payments.classCol')}</th><th>{t('year.level')}</th><th>{t('year.studentsCol')}</th><th>{t('year.afterCol')}</th></tr></thead>
              <tbody>
                {preview.preview?.classes?.map((c) => (
                  <tr key={c.name}>
                    <td data-label={t('payments.classCol')}><b>{c.name}</b></td>
                    <td data-label={t('year.level')}>{c.level}</td>
                    <td data-label={t('year.studentsCol')}>{c.students}</td>
                    <td data-label={t('year.afterCol')}>
                      {c.is_terminal
                        ? <span className="pill info">{t('year.graduates')} ({c.students})</span>
                        : <span className="pill ok">→ {c.promotesTo || c.name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
