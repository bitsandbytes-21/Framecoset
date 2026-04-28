import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Loader2, AlertCircle, RefreshCw, Scale } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStats, getPoliticalStats } from '../utils/api';

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
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = areaType === 'political'
        ? await getPoliticalStats()
        : await getStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaType]);

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
      <div className="flex items-center gap-3">
        <select
          value={areaType}
          onChange={(e) => setAreaType(e.target.value)}
          className="select-field md:w-48"
        >
          <option value="marketing">Marketing</option>
          <option value="political">Political</option>
        </select>
        <button onClick={fetchStats} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
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

  if (!stats || stats.total_evaluations === 0 || !stats.total_evaluations) {
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

  return (
    <div className="space-y-6">
      {renderHeader()}
      {areaType === 'political'
        ? <PoliticalStatsView stats={stats} />
        : <MarketingStatsView stats={stats} />}
    </div>
  );
}
