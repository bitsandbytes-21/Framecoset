import React from 'react';
import { Sparkles, Layers, Users, Image, BarChart3 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          About this Project
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          What Framecoset does and how it works.
        </p>
      </div>

      {/* Overview card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            Overview
          </h3>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          Framecoset generates content from multiple AI models across
          different tiers and lets users compare and annotate the bias signals
          in the outputs side-by-side. The goal is to make subtle differences
          between models tangible, comparable, and measurable across both
          marketing and political contexts.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-primary-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Multi-tier generation
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            One prompt, many models. Outputs are generated across premium,
            mid-tier, and open-source models so users can directly compare how
            each tier interprets the same request.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Image className="w-5 h-5 text-primary-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Multimodal coverage
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Supports image, video, and audio generation, with annotation flows
            tailored to each modality so bias can be examined where it actually
            shows up.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Structured annotation
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Annotators evaluate representation and attribute bias for marketing
            content, and political leaning for political content, using
            consistent rubrics that make outputs comparable across users.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Aggregated insights
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            All annotations roll up into the Stats view, surfacing trends across
            models, tiers, and topics so patterns of bias become visible at the
            dataset level rather than in isolated examples.
          </p>
        </div>
      </div>
    </div>
  );
}
