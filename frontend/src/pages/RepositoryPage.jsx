import React, { useState, useEffect } from 'react';
import { Archive, Search, Filter, Eye, Loader2, AlertCircle } from 'lucide-react';
import { getRepository, getPoliticalRepository } from '../utils/api';
import { BIAS_OPTIONS, POLITICAL_BIAS_OPTIONS } from '../utils/biasData';

function EvaluationCard({ evaluation }) {
  const [showDetails, setShowDetails] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  const isPolitical = evaluation.area_type === 'political';

  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(evaluation.content_url)}`);
        if (!response.ok) {
          console.warn(`Image proxy returned ${response.status}: ${response.statusText}`);
          throw new Error(`Failed to load image: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.data) {
          setImageSrc(`data:${data.content_type};base64,${data.data}`);
        } else {
          throw new Error('Invalid proxy response');
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageError(true);
      }
    };

    if (evaluation.content_url) {
      loadImage();
    }
  }, [evaluation.content_url]);

  const getBiasLabel = (category, code) => {
    if (code === null || code === undefined) return 'N/A';
    const option = BIAS_OPTIONS[category]?.options?.find(o => o.code === code);
    return option?.label || 'Unknown';
  };

  const getPoliticalBiasLabel = (category, code) => {
    if (code === null || code === undefined) return 'N/A';
    const option = POLITICAL_BIAS_OPTIONS[category]?.options?.find(o => o.code === code);
    return option?.label || 'Unknown';
  };

  const tierColors = {
    premium: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    mid_tier: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white',
    open_source: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {/* Image */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span>Image not available</span>
          </div>
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt="Evaluated content"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            <span className="text-gray-500">Loading...</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColors[evaluation.tier] || 'bg-gray-100'}`}>
            {evaluation.tier?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          <span className="font-medium">Prompt:</span> {evaluation.prompt}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{evaluation.model_name}</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{evaluation.media_type}</span>
          {evaluation.category && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">{evaluation.category}</span>
          )}
          <span className={`px-2 py-1 rounded border ${isPolitical ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
            {isPolitical ? 'Political' : 'Marketing'}
          </span>
        </div>

        {/* Quick Stats - Marketing */}
        {!isPolitical && (
          <div className="flex items-center gap-4 text-sm mb-3">
            <span className={`px-2 py-1 rounded ${evaluation.has_human ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
              {evaluation.has_human ? `${evaluation.human_count || 1} Human(s)` : 'No Humans'}
            </span>
          </div>
        )}

        {/* Toggle Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showDetails ? 'Hide Details' : 'View Evaluation Details'}
        </button>

        {/* Details Panel - Marketing */}
        {showDetails && !isPolitical && evaluation.has_human && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Representation Bias</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('gender', evaluation.gender_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Race:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('race', evaluation.race_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Age:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('age', evaluation.age_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Occupation:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('occupation', evaluation.occupation_code)}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Diversity:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('diversity', evaluation.diversity_code)}</span>
              </div>
            </div>

            <h4 className="font-semibold text-gray-900 dark:text-white text-sm pt-2">Attribute Bias</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Activity:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('activity', evaluation.activity_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Setting:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('setting', evaluation.setting_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Appearance:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('appearance_emphasis', evaluation.appearance_emphasis_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Performance:</span>
                <span className="text-gray-900 dark:text-white">{getBiasLabel('performance_emphasis', evaluation.performance_emphasis_code)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Details Panel - Political */}
        {showDetails && isPolitical && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Political Bias Evaluation</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Stance:</span>
                <span className="text-gray-900 dark:text-white">{getPoliticalBiasLabel('stance', evaluation.stance_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Sentiment:</span>
                <span className="text-gray-900 dark:text-white">{getPoliticalBiasLabel('sentiment', evaluation.sentiment_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Framing:</span>
                <span className="text-gray-900 dark:text-white">{getPoliticalBiasLabel('framing', evaluation.framing_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Argument Balance:</span>
                <span className="text-gray-900 dark:text-white">{getPoliticalBiasLabel('argument_balance', evaluation.argument_balance_code)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">
            Evaluated: {new Date(evaluation.evaluated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RepositoryPage() {
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterHasHuman, setFilterHasHuman] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const [marketingData, politicalData] = await Promise.all([
        getRepository(),
        getPoliticalRepository()
      ]);
      
      const marketingEvals = (marketingData?.evaluations || []).map(e => ({
        ...e,
        area_type: 'marketing'
      }));
      const politicalEvals = (politicalData?.evaluations || []).map(e => ({
        ...e,
        area_type: 'political'
      }));
      
      setEvaluations([...marketingEvals, ...politicalEvals]);
    } catch (err) {
      console.error('Error fetching repository:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load repository data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = filterTier === 'all' || item.tier === filterTier;
    
    const matchesHuman = filterHasHuman === 'all' || 
      (filterHasHuman === 'yes' && item.has_human) ||
      (filterHasHuman === 'no' && !item.has_human);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-100 dark:to-white flex items-center justify-center">
          <Archive className="w-7 h-7 text-white dark:text-gray-900" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repository</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {evaluations.length} evaluated {evaluations.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
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

          {/* Tier Filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="select-field md:w-48"
          >
            <option value="all">All Tiers</option>
            <option value="premium">Premium</option>
            <option value="mid_tier">Mid-Tier</option>
            <option value="open_source">Open Source</option>
          </select>

          {/* Human Filter */}
          <select
            value={filterHasHuman}
            onChange={(e) => setFilterHasHuman(e.target.value)}
            className="select-field md:w-48"
          >
            <option value="all">All Content</option>
            <option value="yes">With Humans</option>
            <option value="no">Without Humans</option>
          </select>

          {/* Area Type Filter */}
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="select-field md:w-48"
          >
            <option value="all">All Areas</option>
            <option value="marketing">Marketing</option>
            <option value="political">Political</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filteredEvaluations.length === 0 ? (
        <div className="text-center py-16">
          <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {evaluations.length === 0 ? 'No evaluations yet' : 'No matching results'}
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            {evaluations.length === 0 
              ? 'Generate content and evaluate bias to see items here'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvaluations.map((evaluation) => (
            <EvaluationCard key={evaluation.id} evaluation={evaluation} />
          ))}
        </div>
      )}
    </div>
  );
}
