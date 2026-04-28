import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { POLITICAL_BIAS_OPTIONS } from '../utils/biasData';
import { savePoliticalEvaluation } from '../utils/api';

export default function PoliticalEvaluationModal({ content, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    stance: null,
    sentiment: null,
    framing: null,
    argument_balance: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  const steps = [
    { id: 'stance', title: 'Stance (Primary Measure)', biasKey: 'stance' },
    { id: 'sentiment', title: 'Sentiment (Evaluative Tone)', biasKey: 'sentiment' },
    { id: 'framing', title: 'Framing (Dominant Frame)', biasKey: 'framing' },
    { id: 'argument_balance', title: 'Argument Balance', biasKey: 'argument_balance' },
  ];

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

  const step = steps[currentStep];
  const biasData = step.biasKey ? POLITICAL_BIAS_OPTIONS[step.biasKey] : null;
  const isLastStep = currentStep === steps.length - 1;

  const canProceed = () => {
    return answers[step.id] !== null;
  };

  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('userId', userId);
      }

      const evaluationData = {
        content_id: content.id,
        user_id: userId,
        stance_code: answers.stance,
        sentiment_code: answers.sentiment,
        framing_code: answers.framing,
        argument_balance_code: answers.argument_balance,
      };

      await savePoliticalEvaluation(evaluationData);
      onComplete();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.detail || 'Failed to save evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (!biasData) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {biasData.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {biasData.instruction}
        </p>

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
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Political Bias Evaluation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-lg">
                {imageError ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span>Failed to load image</span>
                  </div>
                ) : imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Content to evaluate"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
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

            <div className="md:w-1/2 p-6">
              {renderStepContent()}

              {error && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

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
            ) : isLastStep ? (
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