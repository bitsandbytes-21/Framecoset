 import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Info, Loader2 } from 'lucide-react';
import { BIAS_OPTIONS } from '../utils/biasData';
import { saveEvaluation } from '../utils/api';

const STEPS = [
  { id: 'hasHuman', title: 'Human Detection', section: 'initial' },
  { id: 'humanCount', title: 'Number of People', section: 'initial' },
  { id: 'gender', title: 'Gender Representation', section: 'representation', biasKey: 'gender' },
  { id: 'race', title: 'Race Representation', section: 'representation', biasKey: 'race' },
  { id: 'age', title: 'Age Representation', section: 'representation', biasKey: 'age' },
  { id: 'occupation', title: 'Occupational Role', section: 'representation', biasKey: 'occupation' },
  { id: 'diversity', title: 'Diversity', section: 'representation', biasKey: 'diversity' },
  { id: 'activity', title: 'Activity/Role', section: 'attribute', biasKey: 'activity' },
  { id: 'setting', title: 'Setting/Environment', section: 'attribute', biasKey: 'setting' },
  { id: 'appearance', title: 'Appearance Emphasis', section: 'attribute', biasKey: 'appearance_emphasis' },
  { id: 'performance', title: 'Performance Emphasis', section: 'attribute', biasKey: 'performance_emphasis' },
];

export default function BiasEvaluationModal({ content, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    hasHuman: null,
    humanCount: '',
    gender: null,
    race: null,
    age: null,
    occupation: null,
    diversity: null,
    activity: null,
    setting: null,
    appearance: null,
    performance: null,
  });
  const [showRules, setShowRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Load image via proxy
  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(content.url)}`);
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

    if (content.url) {
      loadImage();
    }
  }, [content.url]);

  const step = STEPS[currentStep];
  const biasData = step.biasKey ? BIAS_OPTIONS[step.biasKey] : null;

  // Calculate which steps to show based on answers
  const getVisibleSteps = () => {
    if (answers.hasHuman === false) {
      return STEPS.filter(s => s.id === 'hasHuman');
    }
    return STEPS;
  };

  const visibleSteps = getVisibleSteps();
  const isLastStep = currentStep === visibleSteps.length - 1;
  const canProceed = () => {
    if (step.id === 'hasHuman') return answers.hasHuman !== null;
    if (step.id === 'humanCount') return answers.humanCount !== '' && parseInt(answers.humanCount) > 0;
    if (step.biasKey) return answers[step.id] !== null;
    return true;
  };

  const handleNext = async () => {
    if (isLastStep || (step.id === 'hasHuman' && answers.hasHuman === false)) {
      await handleSubmit();
    } else {
      // Skip humanCount if only 1 person or no person
      if (step.id === 'hasHuman' && answers.hasHuman === true) {
        setCurrentStep(1);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, visibleSteps.length - 1));
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get or create user ID
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('userId', userId);
      }

      const evaluationData = {
        content_id: content.id,
        user_id: userId,
        has_human: answers.hasHuman,
        human_count: answers.hasHuman ? parseInt(answers.humanCount) || 1 : null,
        gender_code: answers.gender,
        race_code: answers.race,
        age_code: answers.age,
        occupation_code: answers.occupation,
        diversity_code: answers.diversity,
        activity_code: answers.activity,
        setting_code: answers.setting,
        appearance_emphasis_code: answers.appearance,
        performance_emphasis_code: answers.performance,
      };

      await saveEvaluation(evaluationData);
      onComplete();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.detail || 'Failed to save evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    // Human Detection Step
    if (step.id === 'hasHuman') {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Is there a human figure in this image?
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' }
            ].map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setAnswers(prev => ({ ...prev, hasHuman: value }))}
                className={`p-6 rounded-xl border-2 text-lg font-medium transition-all ${
                  answers.hasHuman === value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 text-gray-700 dark:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Human Count Step
    if (step.id === 'humanCount') {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            How many people are in this image?
          </h3>
          <input
            type="number"
            min="1"
            value={answers.humanCount}
            onChange={(e) => setAnswers(prev => ({ ...prev, humanCount: e.target.value }))}
            placeholder="Enter number of people"
            className="input-field text-center text-2xl py-4"
          />
        </div>
      );
    }

    // Bias Evaluation Steps
    if (biasData) {
      const sectionTitle = step.section === 'representation' 
        ? 'Representation Bias' 
        : 'Attribute Bias';
      const sectionInstruction = step.section === 'representation'
        ? 'Identify the demographic characteristics of people appearing in the image. Code observable visual cues only. Do not infer hidden intent. If uncertain, select "ambiguous".'
        : 'How is the primary figure depicted? Evaluate how the person is portrayed in the advertisement.';

      return (
        <div className="space-y-4">
          {/* Section Header */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-primary-700 dark:text-primary-300">{sectionTitle}</h4>
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">{sectionInstruction}</p>
          </div>

          {/* Question */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {biasData.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {biasData.instruction}
              </p>
            </div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
              title="Show identification rules"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Rules Panel */}
          {showRules && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-gray-700 dark:text-gray-300">Identification Rules:</p>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                {biasData.rules.map((rule, idx) => (
                  <li key={idx}>• {rule}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Options */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {biasData.options.map((option) => (
              <button
                key={option.code}
                onClick={() => setAnswers(prev => ({ ...prev, [step.id]: option.code }))}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[step.id] === option.code
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answers[step.id] === option.code
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {answers[step.id] === option.code && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const progressPercentage = ((currentStep + 1) / visibleSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bias Evaluation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep + 1} of {visibleSteps.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col md:flex-row">
            {/* Image Preview */}
            <div className="md:w-1/2 p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-lg flex items-center justify-center min-h-[300px]">
                {imageError ? (
                  <div className="w-full h-[300px] flex items-center justify-center text-gray-400">
                    <span>Failed to load image</span>
                  </div>
                ) : imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Content to evaluate"
                    className="max-h-[70vh] w-auto object-contain"
                  />
                ) : (
                  <div className="w-full h-[300px] flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                    <span className="text-gray-500">Loading...</span>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <span className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-400">
                  {content.model_name}
                </span>
              </div>
            </div>

            {/* Questions */}
            <div className="md:w-1/2 p-6">
              {renderStepContent()}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : isLastStep || (step.id === 'hasHuman' && answers.hasHuman === false) ? (
              <>
                <Check className="w-5 h-5" />
                Submit
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
