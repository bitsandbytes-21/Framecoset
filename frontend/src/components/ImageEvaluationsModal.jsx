import React, { useEffect, useState } from 'react';
import { X, Loader2, Users, ClipboardCheck } from 'lucide-react';
import { BIAS_OPTIONS, POLITICAL_BIAS_OPTIONS } from '../utils/biasData';
import { getContentEvaluations } from '../utils/api';

// Modal that lists every annotator's evaluation of a single image. Opened
// from the Stats page when a researcher clicks an image card to drill in.
//
// Two render modes:
//   - marketing: shows representation + attribute bias columns, with N/A
//     filled into bias rows where the annotator marked has_human=false
//     (matches the Excel export behavior so on-screen and download agree).
//   - political: shows stance / sentiment / framing / argument columns.
//
// ``initialEvaluations`` lets the parent skip the network round-trip when
// it already has the rows in hand (e.g. from the prompt-filtered stats
// payload). If omitted, the modal fetches via /api/content/<id>/evaluations.

function getMarketingLabel(category, code) {
  if (code === null || code === undefined) return null;
  const opt = BIAS_OPTIONS[category]?.options?.find((o) => o.code === code);
  return opt?.label || `Code ${code}`;
}

function getPoliticalLabel(category, code) {
  if (code === null || code === undefined) return null;
  const opt = POLITICAL_BIAS_OPTIONS[category]?.options?.find((o) => o.code === code);
  return opt?.label || `Code ${code}`;
}

function MarketingTable({ evaluations }) {
  const headers = [
    'Annotator', 'Evaluated at', 'Has human', 'Count',
    'Gender', 'Race', 'Age', 'Occupation', 'Diversity',
    'Activity', 'Setting', 'Appearance', 'Performance',
  ];

  const cell = (label, noHuman) => {
    if (noHuman) return 'N/A';
    return label ?? '—';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {headers.map((h) => (
              <th key={h} className="py-2 px-2 font-medium border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evaluations.map((ev) => {
            const noHuman = ev.has_human === false;
            return (
              <tr key={ev.id || `${ev.user_id}-${ev.evaluated_at}`} className="border-b border-gray-100 dark:border-gray-700/60">
                <td className="py-2 px-2 text-gray-900 dark:text-white max-w-[140px] truncate" title={ev.user_id}>{ev.user_id}</td>
                <td className="py-2 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {ev.evaluated_at ? new Date(ev.evaluated_at).toLocaleString() : '—'}
                </td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{ev.has_human ? 'Yes' : 'No'}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{noHuman ? 'N/A' : (ev.human_count ?? '—')}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('gender', ev.gender_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('race', ev.race_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('age', ev.age_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('occupation', ev.occupation_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('diversity', ev.diversity_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('activity', ev.activity_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('setting', ev.setting_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('appearance_emphasis', ev.appearance_emphasis_code), noHuman)}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-white">{cell(getMarketingLabel('performance_emphasis', ev.performance_emphasis_code), noHuman)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PoliticalTable({ evaluations }) {
  const headers = ['Annotator', 'Evaluated at', 'Stance', 'Sentiment', 'Framing', 'Argument balance'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {headers.map((h) => (
              <th key={h} className="py-2 px-2 font-medium border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evaluations.map((ev) => (
            <tr key={ev.id || `${ev.user_id}-${ev.evaluated_at}`} className="border-b border-gray-100 dark:border-gray-700/60">
              <td className="py-2 px-2 text-gray-900 dark:text-white max-w-[140px] truncate" title={ev.user_id}>{ev.user_id}</td>
              <td className="py-2 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {ev.evaluated_at ? new Date(ev.evaluated_at).toLocaleString() : '—'}
              </td>
              <td className="py-2 px-2 text-gray-900 dark:text-white">{getPoliticalLabel('stance', ev.stance_code) ?? '—'}</td>
              <td className="py-2 px-2 text-gray-900 dark:text-white">{getPoliticalLabel('sentiment', ev.sentiment_code) ?? '—'}</td>
              <td className="py-2 px-2 text-gray-900 dark:text-white">{getPoliticalLabel('framing', ev.framing_code) ?? '—'}</td>
              <td className="py-2 px-2 text-gray-900 dark:text-white">{getPoliticalLabel('argument_balance', ev.argument_balance_code) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImageEvaluationsModal({
  content,
  initialEvaluations,
  isPolitical = false,
  onClose,
  onEvaluate,
  currentUserId,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [evaluations, setEvaluations] = useState(initialEvaluations || []);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(content.url)}`);
        if (!res.ok) throw new Error(`proxy ${res.status}`);
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setImageSrc(`data:${data.content_type};base64,${data.data}`);
        }
      } catch (err) {
        if (!cancelled) setImageError(true);
      }
    };
    if (content.url) load();
    return () => { cancelled = true; };
  }, [content.url]);

  // If we weren't given the rows up front, fetch them now. Even when we are,
  // it's worth refreshing in the background so a card opened from a stale
  // stats payload still shows the latest evaluations.
  useEffect(() => {
    let cancelled = false;
    const refetch = async () => {
      setLoadingExtra(true);
      setFetchError(null);
      try {
        const data = await getContentEvaluations(
          content.content_id || content.id,
          isPolitical ? 'political' : 'marketing'
        );
        if (!cancelled) setEvaluations(data.evaluations || []);
      } catch (err) {
        console.error('Failed to fetch content evaluations:', err);
        if (!cancelled && (!initialEvaluations || initialEvaluations.length === 0)) {
          setFetchError('Could not load all evaluations.');
        }
      } finally {
        if (!cancelled) setLoadingExtra(false);
      }
    };
    refetch();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.content_id, content.id, isPolitical]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              All evaluations for this image
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {evaluations.length} {evaluations.length === 1 ? 'annotator' : 'annotators'}
              {loadingExtra && <Loader2 className="w-3 h-3 animate-spin" />}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col md:flex-row">
            {/* Image preview */}
            <div className="md:w-2/5 p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-lg flex items-center justify-center min-h-[260px]">
                {imageError ? (
                  <div className="w-full h-[260px] flex items-center justify-center text-gray-400">
                    <span>Failed to load image</span>
                  </div>
                ) : imageSrc ? (
                  <img src={imageSrc} alt="Evaluated content" className="max-h-[60vh] w-auto object-contain" />
                ) : (
                  <div className="w-full h-[260px] flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                    <span className="text-gray-500">Loading...</span>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Model</span>
                  <p className="text-gray-900 dark:text-white">{content.model_name}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Tier</span>
                  <p className="text-gray-900 dark:text-white">{(content.tier || '').replace('_', ' ')}</p>
                </div>
                {content.category && (
                  <div>
                    <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</span>
                    <p className="text-gray-900 dark:text-white">{content.category}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Prompt</span>
                  <p className="text-gray-900 dark:text-white">{content.prompt}</p>
                </div>
              </div>
              {onEvaluate && (() => {
                const userHasEvaluated = currentUserId
                  ? evaluations.some((e) => e.user_id === currentUserId)
                  : false;
                return (
                  <button
                    type="button"
                    onClick={() => onEvaluate(content)}
                    disabled={userHasEvaluated}
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                      userHasEvaluated
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                    title={userHasEvaluated ? 'You have already evaluated this image' : 'Submit your own bias evaluation'}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {userHasEvaluated ? 'Already evaluated by you' : 'Evaluate this image'}
                  </button>
                );
              })()}
            </div>

            {/* Evaluations table */}
            <div className="md:w-3/5 p-6 space-y-4">
              {fetchError && (
                <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
                  {fetchError}
                </div>
              )}
              {evaluations.length === 0 && !loadingExtra ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No evaluations recorded for this image yet.
                </div>
              ) : isPolitical ? (
                <PoliticalTable evaluations={evaluations} />
              ) : (
                <MarketingTable evaluations={evaluations} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
