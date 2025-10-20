import { LogoManager } from '@/components/ui/LogoManager';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { AlertCircle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import React from 'react';

interface IntegrationOnboardingBarProps {
  className?: string;
  compact?: boolean;
}

interface OnboardingStep {
  id: string;
  name: string;
  platform: string;
  logo: string;
  completed: boolean;
  loading?: boolean;
  description: string;
}

export const IntegrationOnboardingBar: React.FC<IntegrationOnboardingBarProps> = ({
  className = '',
  compact = false
}) => {
  // Use shared integration status hook instead of local state and direct database calls
  const { data: integrationStatus, isLoading: loading } = useIntegrationStatus();

  // Define onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    { 
      id: 'facebookAds', 
      name: 'Facebook Ads', 
      platform: 'facebookAds', 
      logo: 'meta',
      description: 'Connect Facebook Marketing API',
      completed: integrationStatus?.facebookAds || false,
      loading: false
    },
    { 
      id: 'googleAds', 
      name: 'Google Ads', 
      platform: 'googleAds', 
      logo: 'googleAds',
      description: 'Connect Google Ads API',
      completed: integrationStatus?.googleAds || false,
      loading: false
    },
    { 
      id: 'googleSheets', 
      name: 'Google Sheets', 
      platform: 'googleSheets', 
      logo: 'googleSheets',
      description: 'Connect Google Sheets API',
      completed: integrationStatus?.googleSheets || false,
      loading: false
    },
    { 
      id: 'google-ai', 
      name: 'Google AI Studio', 
      platform: 'google-ai', 
      logo: 'google-ai',
      description: 'Connect Google AI Studio',
      completed: integrationStatus?.googleAi || false,
      loading: false
    }
  ];

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        <span className="text-sm text-slate-600">Loading setup status...</span>
      </div>
    );
  }

  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {onboardingSteps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`p-1.5 rounded-lg border-2 ${
                  step.completed 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
                title={`${step.name}: ${step.completed ? 'Connected' : 'Not Connected'}`}
              >
                <LogoManager 
                  platform={step.platform as any} 
                  size={16} 
                  className={step.completed ? 'opacity-100' : 'opacity-60'}
                />
              </div>
              {index < onboardingSteps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-slate-300" />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {completedSteps}/{totalSteps}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Integration Setup</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${completedSteps === totalSteps ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>{completedSteps}/{totalSteps} completed</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {Math.round(progressPercentage)}% complete
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            completedSteps === totalSteps ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 gap-3">
        {onboardingSteps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              step.completed 
                ? 'bg-green-50 border-green-200' 
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              step.completed ? 'bg-green-100' : 'bg-slate-100'
            }`}>
              <LogoManager 
                platform={step.platform as any} 
                size={20} 
                className={step.completed ? 'opacity-100' : 'opacity-60'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-medium ${
                  step.completed ? 'text-green-900' : 'text-slate-700'
                }`}>
                  {step.name}
                </h4>
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className={`text-xs ${
                step.completed ? 'text-green-700' : 'text-slate-500'
              }`}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {completedSteps < totalSteps && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Complete your integration setup to unlock full analytics capabilities.
          </p>
        </div>
      )}
    </div>
  );
};

