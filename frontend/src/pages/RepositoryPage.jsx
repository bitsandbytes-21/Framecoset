import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Archive, Search, Loader2, AlertCircle, Download,
  ChevronDown, ChevronUp, ClipboardCheck, CheckCircle, Users,
} from 'lucide-react';
import {
  getRepository, getPoliticalRepository,
  downloadEvaluationsExcel, checkEvaluation,
} from '../utils/api';
import { BIAS_OPTIONS, POLITICAL_BIAS_OPTIONS } from '../utils/biasData';
import BiasEvaluationModal from '../components/BiasEvaluationModal';
import PoliticalEvaluationModal from '../components/PoliticalEvaluationModal';

const tierBadgeClass = {
  premium: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
  mid_tier: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white',
  open_source: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function getMarketingLabel(category, code) {
  if (code === null || code === undefined) return 'N/A';
  const opt = BIAS_OPTIONS[category]?.options?.find((o) => o.code === code);
  return opt?.label || 'Unknown';
}

function getPoliticalLabel(category, code) {
  if (code === null || code === undefined) return 'N/A';
  const opt = POLITICAL_BIAS_OPTIONS[category]?.options?.find((o) => o.code === code);
  return opt?.label || 'Unknown';
}

// Renders one annotator's evaluation as a compact panel. Used inside the
// "View all evaluations" expansion on a content card.
function EvaluationPanel({ evaluation, isPolitical }) {
  if (isPolitical) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate" title={evaluation.user_id}>
            {evaluation.user_id}
          </span>
          <span className="text-gray-400">
            {evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleString() : ''}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-gray-500 dark:text-gray-400">Stance</dt>
          <dd className="text-gray-900 dark:text-white">{getPoliticalLabel('stance', evaluation.stance_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Sentiment</dt>
          <dd className="text-gray-900 dark:text-white">{getPoliticalLabel('sentiment', evaluation.sentiment_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Framing</dt>
          <dd className="text-gray-900 dark:text-white">{getPoliticalLabel('framing', evaluation.framing_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Argument</dt>
          <dd className="text-gray-900 dark:text-white">{getPoliticalLabel('argument_balance', evaluation.argument_balance_code)}</dd>
        </dl>
      </div>
    );
  }

  const noHuman = evaluation.has_human === false;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="font-medium text-gray-700 dark:text-gray-300 truncate" title={evaluation.user_id}>
          {evaluation.user_id}
        </span>
        <span className="text-gray-400">
          {evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleString() : ''}
        </span>
      </div>
      <div className="mb-2 text-xs">
        <span className={`px-2 py-0.5 rounded ${
          evaluation.has_human
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {evaluation.has_human ? `${evaluation.human_count || 1} human(s)` : 'No humans'}
        </span>
      </div>
      {noHuman ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Bias fields not applicable (no human in image).
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-gray-500 dark:text-gray-400">Gender</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('gender', evaluation.gender_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Race</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('race', evaluation.race_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Age</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('age', evaluation.age_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Occupation</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('occupation', evaluation.occupation_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Diversity</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('diversity', evaluation.diversity_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Activity</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('activity', evaluation.activity_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Setting</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('setting', evaluation.setting_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Appearance</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('appearance_emphasis', evaluation.appearance_emphasis_code)}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Performance</dt>
          <dd className="text-gray-900 dark:text-white">{getMarketingLabel('performance_emphasis', evaluation.performance_emphasis_code)}</dd>
        </dl>
      )}
    </div>
  );
}

// One repository card — shows the image, content metadata, an "Evaluate"
// CTA when the current user hasn't yet annotated it, and a collapsible
// list of every annotator's submission.
function ContentCard({ item, currentUserId, onEvaluate }) {
  const [showDetails, setShowDetails] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  const isPolitical = item.area_type === 'political';

  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(item.url)}`);
        if (!response.ok) throw new Error(`proxy ${response.status}`);
        const data = await response.json();
        if (!cancelled && data.success && data.data) {
          setImageSrc(`data:${data.content_type};base64,${data.data}`);
        }
      } catch (err) {
        if (!cancelled) setImageError(true);
      }
    };
    if (item.url) loadImage();
    return () => { cancelled = true; };
  }, [item.url]);

  const userHasEvaluated = useMemo(() => {
    if (!currentUserId) return false;
    return (item.evaluations || []).some((e) => e.user_id === currentUserId);
  }, [item.evaluations, currentUserId]);

  const evalCount = item.evaluation_count ?? (item.evaluations || []).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col">
      {/* Image */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span>Image not available</span>
          </div>
        ) : imageSrc ? (
          <img src={imageSrc} alt="Evaluated content" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            <span className="text-gray-500">Loading...</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierBadgeClass[item.tier] || 'bg-gray-100'}`}>
            {item.tier?.replace('_', ' ')}
          </span>
        </div>
        {userHasEvaluated && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-md flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-gray-900 dark:text-white" />
            <span className="text-xs text-gray-900 dark:text-white font-medium">You evaluated</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          <span className="font-medium">Prompt:</span> {item.prompt}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{item.model_name}</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{item.media_type}</span>
          {item.category && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">{item.category}</span>
          )}
          <span className={`px-2 py-1 rounded border ${isPolitical ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
            {isPolitical ? 'Political' : 'Marketing'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">
            {evalCount} {evalCount === 1 ? 'evaluation' : 'evaluations'}
          </span>
        </div>

        {/* Action buttons — Evaluate is the new repository-side CTA so any
            visitor can contribute their own annotation to images others have
            already evaluated. */}
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onEvaluate(item)}
            disabled={userHasEvaluated}
            className={`w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
              userHasEvaluated
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
            title={userHasEvaluated ? 'You have already evaluated this image' : 'Submit your own bias evaluation'}
          >
            <ClipboardCheck className="w-4 h-4" />
            {userHasEvaluated ? 'Already evaluated by you' : 'Evaluate this image'}
          </button>

          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Hide all evaluations' : `View all ${evalCount} evaluation${evalCount === 1 ? '' : 's'}`}
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              All annotators
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {(item.evaluations || []).map((ev) => (
                <EvaluationPanel key={ev.id || `${ev.user_id}-${ev.evaluated_at}`} evaluation={ev} isPolitical={isPolitical} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">
            Last evaluated: {item.latest_evaluated_at ? new Date(item.latest_evaluated_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RepositoryPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterHasHuman, setFilterHasHuman] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  // Evaluation modal state — same components used on Generate page, just
  // re-targeted at content the current user is discovering in the repository.
  const [activeContent, setActiveContent] = useState(null);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showPoliticalModal, setShowPoliticalModal] = useState(false);

  // Stable user id — same key the rest of the app already uses.
  const currentUserId = useMemo(() => {
    let uid = localStorage.getItem('userId');
    if (!uid) {
      uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', uid);
    }
    return uid;
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [marketing, political] = await Promise.all([
        getRepository(),
        getPoliticalRepository(),
      ]);

      // Backend returns `items` (grouped). Tag area_type defensively in case
      // any older row is missing it.
      const marketingItems = (marketing?.items || []).map((it) => ({ ...it, area_type: it.area_type || 'marketing' }));
      const politicalItems = (political?.items || []).map((it) => ({ ...it, area_type: it.area_type || 'political' }));

      setItems([...marketingItems, ...politicalItems]);
    } catch (err) {
      console.error('Error fetching repository:', err);
      setError('Failed to load repository data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEvaluate = (item) => {
    // Pass a content shape that matches what the modals already expect
    // ({ id, url, model_name, area_type, ... }). The modals POST against
    // /api/evaluate or /api/evaluate-political, both of which enforce
    // one-evaluation-per-user at the database level.
    setActiveContent({
      id: item.content_id || item.id,
      url: item.url,
      model_name: item.model_name,
      tier: item.tier,
      prompt: item.prompt,
      media_type: item.media_type,
      area_type: item.area_type,
      category: item.category,
    });
    if (item.area_type === 'political') {
      setShowPoliticalModal(true);
    } else {
      setShowMarketingModal(true);
    }
  };

  const handleEvaluationComplete = async () => {
    setShowMarketingModal(false);
    setShowPoliticalModal(false);
    setActiveContent(null);
    // Reload so the new evaluation shows up under "View all evaluations"
    // and the card flips to "Already evaluated by you".
    await fetchData();
  };

  const handleDownload = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadEvaluationsExcel(filterArea === 'all' ? 'all' : filterArea);
    } catch (err) {
      console.error('Error downloading evaluations:', err);
      setDownloadError('Failed to download Excel file');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = searchTerm === '' ||
      item.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = filterTier === 'all' || item.tier === filterTier;

    // For grouped content, "with humans" means at least one annotator marked
    // has_human=true; "without humans" means every annotator said no.
    let matchesHuman = true;
    if (filterHasHuman === 'yes') {
      matchesHuman = (item.evaluations || []).some((e) => e.has_human);
    } else if (filterHasHuman === 'no') {
      matchesHuman = (item.evaluations || []).every((e) => e.has_human === false);
    }

    const matchesArea = filterArea === 'all' || item.area_type === filterArea;

    return matchesSearch && matchesTier && matchesHuman && matchesArea;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading repository...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  const totalEvaluations = items.reduce((sum, it) => sum + (it.evaluation_count ?? (it.evaluations || []).length), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-100 dark:to-white flex items-center justify-center">
            <Archive className="w-7 h-7 text-white dark:text-gray-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repository</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {items.length} {items.length === 1 ? 'image' : 'images'} · {totalEvaluations} total {totalEvaluations === 1 ? 'evaluation' : 'evaluations'}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading || items.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
          title="Download raw evaluation data as Excel"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isDownloading ? 'Preparing…' : 'Download Excel'}
        </button>
      </div>
      {downloadError && (
        <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by prompt or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="select-field md:w-48">
            <option value="all">All Tiers</option>
            <option value="premium">Premium</option>
            <option value="mid_tier">Mid-Tier</option>
            <option value="open_source">Open Source</option>
          </select>
          <select value={filterHasHuman} onChange={(e) => setFilterHasHuman(e.target.value)} className="select-field md:w-48">
            <option value="all">All Content</option>
            <option value="yes">With Humans</option>
            <option value="no">Without Humans</option>
          </select>
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="select-field md:w-48">
            <option value="all">All Areas</option>
            <option value="marketing">Marketing</option>
            <option value="political">Political</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {items.length === 0 ? 'No evaluations yet' : 'No matching results'}
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            {items.length === 0
              ? 'Generate content and evaluate bias to see items here'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ContentCard
              key={item.content_id || item.id}
              item={item}
              currentUserId={currentUserId}
              onEvaluate={handleEvaluate}
            />
          ))}
        </div>
      )}

      {showMarketingModal && activeContent && (
        <BiasEvaluationModal
          content={activeContent}
          onClose={() => { setShowMarketingModal(false); setActiveContent(null); }}
          onComplete={handleEvaluationComplete}
        />
      )}
      {showPoliticalModal && activeContent && (
        <PoliticalEvaluationModal
          content={activeContent}
          onClose={() => { setShowPoliticalModal(false); setActiveContent(null); }}
          onComplete={handleEvaluationComplete}
        />
      )}
    </div>
  );
}
