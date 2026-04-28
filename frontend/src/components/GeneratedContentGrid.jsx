import React from 'react';
import { ClipboardCheck, Crown, Zap, Code, CheckCircle, AlertTriangle, KeyRound, CreditCard, CloudOff, Clock, WifiOff } from 'lucide-react';
import { checkEvaluation } from '../utils/api';

const failureReasonConfig = {
  billing_limit: { icon: CreditCard, label: 'Paid plan required' },
  billing_required: { icon: CreditCard, label: 'Billing required for API key' },
  auth_failed: { icon: KeyRound, label: 'API key invalid' },
  model_unavailable: { icon: CloudOff, label: 'Model unavailable' },
  rate_limited: { icon: Clock, label: 'Rate limited' },
  network_error: { icon: WifiOff, label: 'Network error' },
  not_configured: { icon: AlertTriangle, label: 'Not configured' },
  generation_failed: { icon: AlertTriangle, label: 'Generation failed' },
};

function FailureCard({ failure }) {
  const config = failureReasonConfig[failure.reason] || failureReasonConfig.generation_failed;
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
      <div className="relative aspect-square bg-gray-50 dark:bg-gray-900/40 flex flex-col items-center justify-center p-4 text-center">
        <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {config.label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-snug">
          {failure.message}
        </span>

        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md">
          <span className="text-xs text-white font-medium">{failure.model_name}</span>
        </div>
      </div>
    </div>
  );
}

const tierConfig = {
  premium: {
    label: 'Premium',
    icon: Crown,
    gradient: 'from-gray-800 to-gray-900 dark:from-gray-100 dark:to-white',
    iconColor: 'text-white dark:text-gray-900',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700'
  },
  mid_tier: {
    label: 'Mid-Tier',
    icon: Zap,
    gradient: 'from-gray-600 to-gray-700 dark:from-gray-300 dark:to-gray-400',
    iconColor: 'text-white dark:text-gray-900',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700'
  },
  open_source: {
    label: 'Open Source',
    icon: Code,
    gradient: 'from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600',
    iconColor: 'text-white',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700'
  }
};

function ContentCard({ item, onEvaluate }) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState(null);
  const [isEvaluated, setIsEvaluated] = React.useState(false);
  const [checkingEval, setCheckingEval] = React.useState(true);

  React.useEffect(() => {
    // Load image via proxy
    const loadImage = async () => {
      try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(item.url)}`);
        if (!response.ok) {
          console.warn(`Image proxy returned ${response.status}: ${response.statusText}`);
          throw new Error(`Failed to load image: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.data) {
          setImageSrc(`data:${data.content_type};base64,${data.data}`);
          setImageLoaded(true);
        } else {
          throw new Error('Invalid proxy response');
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageError(true);
      }
    };

    if (item.url) {
      loadImage();
    }
  }, [item.url]);

  React.useEffect(() => {
    // Check if content has been evaluated by current user
    const checkStatus = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const result = await checkEvaluation(item.id, userId);
          setIsEvaluated(result.evaluated);
        }
      } catch (error) {
        console.error('Error checking evaluation status:', error);
      } finally {
        setCheckingEval(false);
      }
    };

    checkStatus();
  }, [item.id]);

  const handleEvaluate = () => {
    if (!isEvaluated) {
      onEvaluate(item);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 group relative flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 loading-shimmer" />
        )}
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-700">
            <span className="text-xs text-center px-2">Image unavailable</span>
            <span className="text-xs text-gray-400 mt-1">Retrying...</span>
          </div>
        ) : (
          imageSrc && (
            <img
              src={imageSrc}
              alt={`Generated by ${item.model_name}`}
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )
        )}

        {/* Evaluated Badge */}
        {isEvaluated && !checkingEval && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-md flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-gray-900 dark:text-white" />
            <span className="text-xs text-gray-900 dark:text-white font-medium">Evaluated</span>
          </div>
        )}

        {/* Hover Overlay */}
        {!isEvaluated && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              onClick={handleEvaluate}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform duration-300"
            >
              <ClipboardCheck className="w-5 h-5" />
              Evaluate Bias
            </button>
          </div>
        )}

        {/* Already Evaluated Message */}
        {isEvaluated && !checkingEval && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium">
              Already Evaluated
            </span>
          </div>
        )}
      </div>

      {/* Model Name Footer */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate block">
          {item.model_name}
        </span>
      </div>
    </div>
  );
}

function TierSection({ tier, items, failures, onEvaluate }) {
  const config = tierConfig[tier];
  const Icon = config.icon;
  const total = items.length + failures.length;

  return (
    <div className={`rounded-2xl ${config.bg} ${config.border} border p-6`}>
      {/* Tier Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{config.label}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? 'model' : 'models'}
            {failures.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {' '}· {failures.length} unavailable
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} onEvaluate={onEvaluate} />
        ))}
        {failures.map((failure) => (
          <FailureCard key={`fail-${failure.model_name}`} failure={failure} />
        ))}
      </div>
    </div>
  );
}

export default function GeneratedContentGrid({ content, onEvaluate }) {
  if (!content) return null;

  const items = content.items || [];
  const failures = content.failures || [];

  if (items.length === 0 && failures.length === 0) {
    return null;
  }

  // Group items and failures by tier
  const groupedByTier = items.reduce((acc, item) => {
    if (!acc[item.tier]) acc[item.tier] = { items: [], failures: [] };
    acc[item.tier].items.push(item);
    return acc;
  }, {});

  failures.forEach((failure) => {
    const tier = failure.tier || 'open_source';
    if (!groupedByTier[tier]) groupedByTier[tier] = { items: [], failures: [] };
    groupedByTier[tier].failures.push(failure);
  });

  const tierOrder = ['premium', 'mid_tier', 'open_source'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Generated Content
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {items.length} generated
          {failures.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400"> · {failures.length} failed</span>
          )}
        </span>
      </div>

      {items.length === 0 && failures.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 p-4 rounded-xl">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">No models returned an image for this prompt.</p>
            <p className="mt-1">
              Each provider's status is shown below. The most common causes are an exhausted billing plan
              or an invalid API key — update the relevant key in the backend <code>.env</code> and try again.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {tierOrder.map((tier) => {
          const group = groupedByTier[tier];
          if (!group || (group.items.length === 0 && group.failures.length === 0)) return null;
          return (
            <TierSection
              key={tier}
              tier={tier}
              items={group.items}
              failures={group.failures}
              onEvaluate={onEvaluate}
            />
          );
        })}
      </div>
    </div>
  );
}
