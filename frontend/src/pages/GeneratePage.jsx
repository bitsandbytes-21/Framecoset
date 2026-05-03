import { useState } from 'react';
import { Sparkles, Loader2, Image, Video, Music, AlertCircle, Lightbulb } from 'lucide-react';
import { generateContent } from '../utils/api';
import { MARKETING_CATEGORIES, MEDIA_TYPES, AREA_TYPES, POLITICAL_CATEGORIES, PROMPT_SUGGESTIONS } from '../utils/biasData';
import BiasEvaluationModal from '../components/BiasEvaluationModal';
import PoliticalEvaluationModal from '../components/PoliticalEvaluationModal';
import GeneratedContentGrid from '../components/GeneratedContentGrid';

export default function GeneratePage() {
  const [mediaType, setMediaType] = useState('image');
  const [areaType, setAreaType] = useState('marketing');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [error, setError] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showPoliticalModal, setShowPoliticalModal] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (areaType === 'marketing' && !category) {
      setError('Please select a category for marketing');
      return;
    }

    if (areaType === 'political' && !category) {
      setError('Please select a political topic');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateContent({
        media_type: mediaType,
        area_type: areaType,
        category: category,
        prompt: prompt.trim()
      });

      setGeneratedContent(result);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.response?.data?.detail || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluate = (content) => {
    setSelectedContent(content);
    if (content.area_type === 'political') {
      setShowPoliticalModal(true);
    } else {
      setShowEvaluationModal(true);
    }
  };

  const handleEvaluationComplete = () => {
    setShowEvaluationModal(false);
    setShowPoliticalModal(false);
    setSelectedContent(null);
  };

  const mediaIcons = {
    image: Image,
    video: Video,
    audio: Music
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Generate AI Content
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create content using multiple AI models and evaluate bias in the results
        </p>
      </div>

      {/* Generation Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
        {/* Step 1: Media Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Step 1: Select Media Type
          </label>
          <div className="grid grid-cols-3 gap-4">
            {MEDIA_TYPES.map(({ value, label }) => {
              const Icon = mediaIcons[value];
              return (
                <button
                  key={value}
                  onClick={() => setMediaType(value)}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                    mediaType === value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  }`}
                >
                  <Icon className={`w-8 h-8 mb-2 ${
                    mediaType === value ? 'text-primary-500' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    mediaType === value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Area Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Step 2: Select Area Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            {AREA_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setAreaType(value);
                  setCategory('');
                  setPrompt('');
                }}
                className={`p-4 rounded-xl border-2 transition-all duration-200 font-medium ${
                  areaType === value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 text-gray-700 dark:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Category (for Marketing) */}
        {areaType === 'marketing' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Step 3: Select Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPrompt('');
              }}
              className="select-field"
            >
              <option value="">Select a category...</option>
              {MARKETING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3: Category (for Political) */}
        {areaType === 'political' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Step 3: Select Topic
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPrompt('');
              }}
              className="select-field"
            >
              <option value="">Select a topic...</option>
              {POLITICAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Step 4: Prompt */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Step 4: Enter Your Prompt
          </label>

          {/* Suggested prompts for the chosen category — click to fill */}
          {category && PROMPT_SUGGESTIONS[areaType]?.[category] && (
            <div className="mb-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/40">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-primary-700 dark:text-primary-300">
                <Lightbulb className="w-4 h-4" />
                <span>Suggested prompts for {category}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Click any suggestion to use it as your prompt. You can edit it after.
              </p>
              <div className="flex flex-col gap-2">
                {PROMPT_SUGGESTIONS[areaType][category].map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(suggestion)}
                    className="text-left text-sm px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/40 dark:hover:bg-primary-900/30 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the content you want to generate..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Generating across all tiers...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Generate Content
            </>
          )}
        </button>
      </div>

      {/* Generated Content Grid */}
      {generatedContent && (
        <GeneratedContentGrid
          content={generatedContent}
          onEvaluate={handleEvaluate}
        />
      )}

      {/* Evaluation Modal */}
      {showEvaluationModal && selectedContent && (
        <BiasEvaluationModal
          content={selectedContent}
          onClose={() => setShowEvaluationModal(false)}
          onComplete={handleEvaluationComplete}
        />
      )}

      {/* Political Evaluation Modal */}
      {showPoliticalModal && selectedContent && (
        <PoliticalEvaluationModal
          content={selectedContent}
          onClose={() => setShowPoliticalModal(false)}
          onComplete={handleEvaluationComplete}
        />
      )}
    </div>
  );
}
