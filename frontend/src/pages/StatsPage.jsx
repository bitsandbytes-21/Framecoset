import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Loader2, AlertCircle, RefreshCw, Scale, Download, MessageSquare, X } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStats, getPoliticalStats, downloadEvaluationsExcel } from '../utils/api';
import { MARKETING_CATEGORIES, POLITICAL_CATEGORIES } from '../utils/biasData';
import ImageEvaluationsModal from '../components/ImageEvaluationsModal';

const COLORS = ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'];

function StatCard({ title, value, subtitle, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'from-gray-800 to-gray-900 dark:from-gray-100 dark:to-white',
    purple: 'from-gray-700 to-gray-800 dark:from-gray-200 dark:to-gray-100',
    green: 'from-gray-600 to-gray-700 dark:from-gray-300 dark:to-gray-200',
    amber: 'from-gray-500 to-gray-600 dark:from-gray-400 dark:to-gray-300',
    red: 'from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-400'
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white dark:text-gray-900" />
        </div>
      </div>
    </div>
  );
}

function DistributionChart({ title, data, colors = COLORS }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarChartComponent({ title, data, colors = COLORS }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" width={100} stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Renders a compact stat block for ONE category. Used in the per-category
// breakdown section so reviewers can compare distributions across categories.
function CategoryBreakdownCard({ category, stats, isPolitical }) {
  if (!stats || !stats.total_evaluations) {
    return (
      <div className="stat-card">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{category}</h4>
        <p className="text-sm text-gray-400">No evaluations yet.</p>
      </div>
    );
  }

  const distributions = isPolitical
    ? [
        { title: 'Stance', data: stats.stance_distribution },
        { title: 'Sentiment', data: stats.sentiment_distribution },
        { title: 'Framing', data: stats.framing_distribution },
        { title: 'Argument Balance', data: stats.argument_balance_distribution },
      ]
    : [
        { title: 'Gender', data: stats.gender_distribution },
        { title: 'Race', data: stats.race_distribution },
        { title: 'Age', data: stats.age_distribution },
        { title: 'Setting', data: stats.setting_distribution },
      ];

  return (
    <div className="stat-card">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">{category}</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {stats.total_evaluations} {stats.total_evaluations === 1 ? 'eval' : 'evals'}
        </span>
      </div>
      <div className="space-y-3">
        {distributions.map(({ title, data }) => {
          const entries = Object.entries(data || {});
          if (entries.length === 0) {
            return (
              <div key={title}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-xs text-gray-400">—</p>
              </div>
            );
          }
          const total = entries.reduce((sum, [, v]) => sum + v, 0);
          return (
            <div key={title}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
              <div className="space-y-1">
                {entries.map(([label, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-700 dark:text-gray-200 w-28 truncate">{label}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <div
                          className="h-full bg-gray-700 dark:bg-gray-300 rounded"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 w-10 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Lists distinct prompts used inside a single category. Clicking a prompt
// drills the main stats view down to evaluations of that exact prompt.
function PromptsForCategorySection({ prompts, category, activePrompt, onSelectPrompt }) {
  if (!prompts || prompts.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Prompts in {category}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click a prompt to filter the stats above to evaluations of that prompt only.
          </p>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {prompts.map(({ prompt, count }) => {
          const isActive = activePrompt === prompt;
          return (
            <button
              key={prompt || '__blank__'}
              type="button"
              onClick={() => onSelectPrompt(isActive ? null : prompt)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                isActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-400 dark:hover:border-primary-500'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className={`text-xs font-medium uppercase tracking-wider ${
                  isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {isActive ? 'Active filter' : 'Prompt'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {count} {count === 1 ? 'eval' : 'evals'}
                </span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
                {prompt || <span className="italic text-gray-400">(blank prompt)</span>}
              </p>
              <p className={`text-xs mt-2 ${
                isActive ? 'text-primary-700 dark:text-primary-300' : 'text-primary-600 dark:text-primary-400'
              }`}>
                {isActive ? 'Click again to clear' : 'View this prompt’s stats →'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// Aggregates the rows for a single content_id into the shape consumed by
// PromptImageCard. Now that the same image can be evaluated by many
// annotators, the prompt-detail gallery shows one card per unique content
// (with an N-evaluators badge and a click-through to the breakdown modal)
// instead of one card per evaluation row.
function groupEvaluationsByContent(evaluations) {
  const grouped = new Map();
  for (const ev of evaluations || []) {
    const cid = ev.content_id;
    if (!cid) continue;
    let bucket = grouped.get(cid);
    if (!bucket) {
      bucket = {
        content_id: cid,
        content_url: ev.content_url,
        prompt: ev.prompt,
        model_name: ev.model_name,
        tier: ev.tier,
        media_type: ev.media_type,
        category: ev.category,
        evaluations: [],
        latest_evaluated_at: ev.evaluated_at || '',
      };
      grouped.set(cid, bucket);
    }
    bucket.evaluations.push(ev);
    if ((ev.evaluated_at || '') > (bucket.latest_evaluated_at || '')) {
      bucket.latest_evaluated_at = ev.evaluated_at;
    }
  }
  return Array.from(grouped.values()).sort(
    (a, b) => (b.latest_evaluated_at || '').localeCompare(a.latest_evaluated_at || '')
  );
}

// One image card in the prompt-detail gallery — represents a single image
// (content_id) with the count of evaluators that annotated it. Clicking
// opens a modal that lists every annotator's full evaluation.
function PromptImageCard({ group, isPolitical, onOpen }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(group.content_url)}`);
        if (!res.ok) throw new Error(`proxy ${res.status}`);
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setImageSrc(`data:${data.content_type};base64,${data.data}`);
        }
      } catch (e) {
        if (!cancelled) setImageError(true);
      }
    };
    if (group.content_url) load();
    return () => { cancelled = true; };
  }, [group.content_url]);

  const tierBadge = {
    premium: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    mid_tier: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white',
    open_source: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }[group.tier] || 'bg-gray-100 text-gray-700';

  const evalCount = group.evaluations.length;

  return (
    <button
      type="button"
      onClick={() => onOpen(group)}
      className="text-left bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg transition-all duration-200 group"
      title="Click to see how every annotator evaluated this image"
    >
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            Image unavailable
          </div>
        ) : imageSrc ? (
          <img src={imageSrc} alt={`Image generated by ${group.model_name}`} className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 loading-shimmer" />
        )}
        <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${tierBadge}`}>
          {(group.tier || 'unknown').replace('_', ' ')}
        </span>
        <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-900 dark:text-white flex items-center gap-1">
          <Users className="w-3 h-3" />
          {evalCount} {evalCount === 1 ? 'annotator' : 'annotators'}
        </span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {group.model_name}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {group.latest_evaluated_at ? new Date(group.latest_evaluated_at).toLocaleDateString() : ''}
          </span>
        </div>
        <p className="text-xs text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
          View all evaluations →
        </p>
      </div>
    </button>
  );
}

// Renders distribution data as a plain counts table. No charts — at small N
// the bare numbers communicate more honestly than a pie chart.
function RawCountsTable({ distributions }) {
  const sections = distributions.filter(({ data }) => data && Object.keys(data).length > 0);
  if (sections.length === 0) {
    return (
      <div className="stat-card text-sm text-gray-500 dark:text-gray-400">
        No coded annotations yet for this prompt.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(({ title, data }) => {
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        return (
          <div key={title} className="stat-card">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Label</th>
                  <th className="pb-2 font-medium text-right">Count</th>
                  <th className="pb-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).map(([label, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <tr key={label} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="py-1.5 text-gray-800 dark:text-gray-200">{label}</td>
                      <td className="py-1.5 text-right text-gray-900 dark:text-white tabular-nums">{count}</td>
                      <td className="py-1.5 text-right text-gray-500 dark:text-gray-400 tabular-nums">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// View shown when the user has drilled down to a single prompt: gallery of the
// generated images on top, raw counts below. Replaces the pie-chart grid which
// is misleading at small N.
function PromptDetailView({ stats, isPolitical }) {
  const evaluations = stats.evaluations || [];
  // Collapse the eval rows down to one entry per generated image. Each entry
  // carries every annotator's submission; clicking opens the breakdown modal.
  const groups = React.useMemo(() => groupEvaluationsByContent(evaluations), [evaluations]);
  const [openGroup, setOpenGroup] = useState(null);

  const distributions = isPolitical
    ? [
        { title: 'Stance', data: stats.stance_distribution },
        { title: 'Sentiment', data: stats.sentiment_distribution },
        { title: 'Framing', data: stats.framing_distribution },
        { title: 'Argument Balance', data: stats.argument_balance_distribution },
        { title: 'By Tier', data: stats.by_tier },
      ]
    : [
        { title: 'Gender', data: stats.gender_distribution },
        { title: 'Race', data: stats.race_distribution },
        { title: 'Age', data: stats.age_distribution },
        { title: 'Occupation', data: stats.occupation_distribution },
        { title: 'Diversity', data: stats.diversity_distribution },
        { title: 'Activity', data: stats.activity_distribution },
        { title: 'Setting', data: stats.setting_distribution },
        { title: 'Appearance Emphasis', data: stats.appearance_emphasis_distribution },
        { title: 'Performance Emphasis', data: stats.performance_emphasis_distribution },
        { title: 'By Tier', data: stats.by_tier },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Generated images for this prompt ({groups.length})
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Each card represents one generated image. Click an image to see how every annotator evaluated it.
        </p>
      </div>
      {groups.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 stat-card">
          No evaluations match this prompt yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <PromptImageCard
              key={group.content_id}
              group={group}
              isPolitical={isPolitical}
              onOpen={setOpenGroup}
            />
          ))}
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Raw counts</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Distributions across {stats.total_evaluations || 0} evaluation{stats.total_evaluations === 1 ? '' : 's'} ({groups.length} {groups.length === 1 ? 'image' : 'images'}) matching this prompt.
        </p>
      </div>
      <RawCountsTable distributions={distributions} />

      {openGroup && (
        <ImageEvaluationsModal
          content={{
            content_id: openGroup.content_id,
            url: openGroup.content_url,
            model_name: openGroup.model_name,
            tier: openGroup.tier,
            prompt: openGroup.prompt,
            category: openGroup.category,
          }}
          initialEvaluations={openGroup.evaluations}
          isPolitical={isPolitical}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}


function CategoryBreakdownSection({ breakdown, isPolitical }) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;
  const categories = Object.keys(breakdown).sort();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {isPolitical ? 'Per-Topic Breakdown' : 'Per-Category Breakdown'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Distribution of bias evaluations grouped by {isPolitical ? 'political topic' : 'marketing category'}.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <CategoryBreakdownCard
            key={cat}
            category={cat}
            stats={breakdown[cat]}
            isPolitical={isPolitical}
          />
        ))}
      </div>
    </div>
  );
}

function MarketingStatsView({ stats }) {
  return (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Evaluations"
          value={stats.total_evaluations}
          icon={BarChart3}
          color="primary"
        />
        <StatCard
          title="With Humans"
          value={`${stats.has_human_percentage}%`}
          subtitle="of images contain humans"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Media Types"
          value={Object.keys(stats.by_media_type || {}).length}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Categories"
          value={Object.keys(stats.by_category || {}).length}
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Gender Distribution"
          data={stats.gender_distribution}
        />
        <DistributionChart
          title="Race Distribution"
          data={stats.race_distribution}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Age Distribution"
          data={stats.age_distribution}
        />
        <DistributionChart
          title="Activity Distribution"
          data={stats.activity_distribution}
        />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Occupation Distribution"
          data={stats.occupation_distribution}
        />
        <DistributionChart
          title="Diversity Distribution"
          data={stats.diversity_distribution}
        />
      </div>

      {/* Charts Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Appearance Emphasis"
          data={stats.appearance_emphasis_distribution}
        />
        <DistributionChart
          title="Performance Emphasis"
          data={stats.performance_emphasis_distribution}
        />
      </div>

      {/* Charts Row 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent
          title="By Tier"
          data={stats.by_tier}
        />
        <BarChartComponent
          title="By Category"
          data={stats.by_category}
        />
      </div>

      {/* Setting Distribution */}
      <div className="grid grid-cols-1">
        <BarChartComponent
          title="Setting/Environment Distribution"
          data={stats.setting_distribution}
        />
      </div>
    </>
  );
}

function PoliticalStatsView({ stats }) {
  return (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Evaluations"
          value={stats.total_evaluations}
          icon={BarChart3}
          color="primary"
        />
        <StatCard
          title="Topics"
          value={Object.keys(stats.by_category || {}).length}
          icon={Scale}
          color="red"
        />
        <StatCard
          title="Media Types"
          value={Object.keys(stats.by_media_type || {}).length}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Frames Used"
          value={Object.keys(stats.framing_distribution || {}).length}
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Stance Distribution"
          data={stats.stance_distribution}
        />
        <DistributionChart
          title="Sentiment Distribution"
          data={stats.sentiment_distribution}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Framing Distribution"
          data={stats.framing_distribution}
        />
        <DistributionChart
          title="Argument Balance"
          data={stats.argument_balance_distribution}
        />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent
          title="By Tier"
          data={stats.by_tier}
        />
        <BarChartComponent
          title="By Topic"
          data={stats.by_category}
        />
      </div>
    </>
  );
}

export default function StatsPage() {
  const [areaType, setAreaType] = useState('marketing');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [promptFilter, setPromptFilter] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const catArg = categoryFilter !== 'all' ? categoryFilter : undefined;
      // Prompt only applies inside a category — defensive guard.
      const promptArg = catArg ? promptFilter || undefined : undefined;
      const data = areaType === 'political'
        ? await getPoliticalStats(catArg, promptArg)
        : await getStats(catArg, promptArg);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const catArg = categoryFilter !== 'all' ? categoryFilter : undefined;
      const promptArg = catArg ? promptFilter || undefined : undefined;
      await downloadEvaluationsExcel(areaType, catArg, promptArg);
    } catch (err) {
      console.error('Error downloading evaluations:', err);
      setDownloadError('Failed to download Excel file');
    } finally {
      setIsDownloading(false);
    }
  };

  // Reset category filter when switching marketing <-> political so we don't
  // accidentally filter by a category that doesn't exist in the new area.
  useEffect(() => {
    setCategoryFilter('all');
    setPromptFilter(null);
  }, [areaType]);

  // A prompt filter is meaningful only inside a single category — clear it
  // whenever the category changes (or is cleared).
  useEffect(() => {
    setPromptFilter(null);
  }, [categoryFilter]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaType, categoryFilter, promptFilter]);

  const categoryOptions = areaType === 'political' ? POLITICAL_CATEGORIES : MARKETING_CATEGORIES;

  const headerSubtitle = areaType === 'political'
    ? 'Political bias evaluation analytics'
    : 'Marketing bias evaluation analytics';

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-100 dark:to-white flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-white dark:text-gray-900" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h2>
          <p className="text-gray-500 dark:text-gray-400">{headerSubtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={areaType}
          onChange={(e) => setAreaType(e.target.value)}
          className="select-field md:w-40"
        >
          <option value="marketing">Marketing</option>
          <option value="political">Political</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="select-field md:w-48"
          aria-label={areaType === 'political' ? 'Topic filter' : 'Category filter'}
        >
          <option value="all">{areaType === 'political' ? 'All Topics' : 'All Categories'}</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={fetchStats} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
          title="Download raw evaluation data as Excel"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isDownloading ? 'Preparing…' : 'Download Excel'}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
            <button onClick={fetchStats} className="btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyBreakdown = stats && stats.by_category_breakdown && Object.keys(stats.by_category_breakdown).length > 0;
  if (!stats || (!stats.total_evaluations && !hasAnyBreakdown)) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No statistics yet
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            Generate and evaluate {areaType} content to see statistics here
          </p>
        </div>
      </div>
    );
  }

  // If filtering produced no rows but other categories DO have data, render
  // just the breakdown section + a small notice instead of the full views.
  if (!stats.total_evaluations && hasAnyBreakdown) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        {downloadError && (
          <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          No evaluations yet for{' '}
          <span className="font-medium text-gray-900 dark:text-white">{categoryFilter}</span>
          {promptFilter ? (
            <>
              {' '}with the selected prompt.{' '}
              <button
                onClick={() => setPromptFilter(null)}
                className="underline text-primary-600 dark:text-primary-400 hover:opacity-80"
              >
                Clear prompt
              </button>
            </>
          ) : (
            <>
              .{' '}
              <button
                onClick={() => setCategoryFilter('all')}
                className="underline text-primary-600 dark:text-primary-400 hover:opacity-80"
              >
                Clear filter
              </button>{' '}to see all stats.
            </>
          )}
        </div>
        {categoryFilter !== 'all' && stats.prompts_for_category && (
          <PromptsForCategorySection
            prompts={stats.prompts_for_category}
            category={categoryFilter}
            activePrompt={promptFilter}
            onSelectPrompt={setPromptFilter}
          />
        )}
        <CategoryBreakdownSection
          breakdown={stats.by_category_breakdown}
          isPolitical={areaType === 'political'}
        />
      </div>
    );
  }

  const isPolitical = areaType === 'political';
  const isSmallSample = stats.total_evaluations > 0 && stats.total_evaluations < 5;

  return (
    <div className="space-y-6">
      {renderHeader()}
      {downloadError && (
        <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}
      {categoryFilter !== 'all' && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing stats filtered by <span className="font-medium text-gray-900 dark:text-white">{categoryFilter}</span>.
          {' '}
          <button
            onClick={() => setCategoryFilter('all')}
            className="underline text-primary-600 dark:text-primary-400 hover:opacity-80"
          >
            Clear filter
          </button>
        </div>
      )}
      {promptFilter && (
        <div className="flex items-start gap-2 text-sm bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/40 text-primary-900 dark:text-primary-100 p-3 rounded-lg">
          <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Showing stats for prompt:</span>{' '}
            <span className="italic">“{promptFilter}”</span>
          </div>
          <button
            onClick={() => setPromptFilter(null)}
            className="flex items-center gap-1 text-xs underline hover:opacity-80"
          >
            <X className="w-3 h-3" />
            Clear prompt
          </button>
        </div>
      )}
      {isSmallSample && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Small sample size ({stats.total_evaluations} {stats.total_evaluations === 1 ? 'evaluation' : 'evaluations'}) —
            distributions below may be noisy.
          </span>
        </div>
      )}
      {promptFilter
        ? <PromptDetailView stats={stats} isPolitical={isPolitical} />
        : isPolitical
          ? <PoliticalStatsView stats={stats} />
          : <MarketingStatsView stats={stats} />}
      {categoryFilter !== 'all' && stats.prompts_for_category && (
        <PromptsForCategorySection
          prompts={stats.prompts_for_category}
          category={categoryFilter}
          activePrompt={promptFilter}
          onSelectPrompt={setPromptFilter}
        />
      )}
      {!promptFilter && (
        <CategoryBreakdownSection
          breakdown={stats.by_category_breakdown}
          isPolitical={isPolitical}
        />
      )}
    </div>
  );
}
