import React, { useEffect, useState } from 'react';

export interface RetentionPolicy {
  category: string;
  name: string;
  description: string;
  legalBasis: string;
  retentionPeriod: string;
  autoPurgeDays: number | null;
  userControllable: boolean;
  exportable: boolean;
  erasureSupport: boolean;
}

export interface AccountCategorySummary {
  category: string;
  name: string;
  description: string;
  policy: RetentionPolicy;
  recordCount: number;
  lastActivityAt: string | null;
  status: string;
  availableControls: string[];
}

export interface TransparencyPanelReport {
  userId: string;
  generatedAt: string;
  policyVersion: string;
  categories: AccountCategorySummary[];
  overallRetentionSummary: string;
  exportAvailable: boolean;
}

export const DataTransparencyPanel: React.FC<{ apiUrl?: string }> = ({
  apiUrl = '/api/users/transparency/data-use-panel',
}) => {
  const [data, setData] = useState<TransparencyPanelReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchTransparencyData() {
      try {
        setLoading(true);
        const res = await fetch(apiUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch transparency metadata (${res.status})`);
        }
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Error loading transparency panel');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchTransparencyData();
    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading data transparency panel...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
        <p className="font-semibold">Unable to load data-use transparency</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Data Use & Retention Transparency
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Review the categories of personal data held for your account, retention periods, and
          available privacy controls.
        </p>
        <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
          Policy Version: {data.policyVersion}
        </span>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {data.categories.map((cat) => (
          <div key={cat.category} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                  {cat.recordCount} records
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400">
                  [{cat.policy.legalBasis}]
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                Retention: {cat.policy.retentionPeriod}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {cat.availableControls.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="px-3 py-1 text-xs font-semibold rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  onClick={() => alert(`Initiated ${action} for ${cat.name}`)}
                >
                  {action.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded text-xs text-gray-600 dark:text-gray-400">
        {data.overallRetentionSummary}
      </div>
    </div>
  );
};

export default DataTransparencyPanel;
