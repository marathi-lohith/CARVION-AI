import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDatabase, FiCpu, FiAlertTriangle, FiCheck, FiSettings, FiSliders } from 'react-icons/fi';

export default function SystemConfigForm({
  onClearCache,
  isClearingCache = false,
}) {
  const [llmConfig, setLlmConfig] = useState({
    model: 'gemini-1.5-pro',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.95,
  });

  const [toggles, setToggles] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    debugLogging: true,
  });

  const [saveStatus, setSaveStatus] = useState(null);

  const handleSaveSimulated = (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1200);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Caching & Maintenance Control Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-xl border border-orange-100/50 dark:border-orange-900/40">
              <FiDatabase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white uppercase tracking-tight">Database Cache Purge</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">TTL recommendations index controls</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-semibold">
            The platform caches recommendations from external APIs (like Gemini recommendations and external job integrations) to optimize performance. Clearing the cache purges the cached document records, forcing subsequent requests to fetch real-time recommendations.
          </p>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/50 dark:border-amber-900/50 rounded-xl flex items-start space-x-3 mb-6">
            <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-550 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-400 font-semibold leading-relaxed">
              <p className="font-extrabold uppercase tracking-wider text-[10px]">Purge collection notice</p>
              <p className="mt-1 font-medium text-slate-600 dark:text-slate-450">
                This triggers a direct MongoDB delete operation. This may cause temporary response latency for users while cached documents regenerate.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClearCache}
          disabled={isClearingCache}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-55 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center space-x-2 shadow-md shadow-orange-500/10 cursor-pointer"
        >
          {isClearingCache ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Purging recommendation cache...</span>
            </>
          ) : (
            <span>Flush Cache Collections</span>
          )}
        </button>
      </div>

      {/* LLM Gemini & Safety Config Card */}
      <form onSubmit={handleSaveSimulated} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-xl border border-orange-100/50 dark:border-orange-900/40">
              <FiCpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white uppercase tracking-tight">AI Model Settings</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Gemini LLM parameters</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {/* Model Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider mb-2">Model Version</label>
              <select
                value={llmConfig.model}
                onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Precision)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Latency)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Temperature</label>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-extrabold">{llmConfig.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={llmConfig.temperature}
                onChange={(e) => setLlmConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Toggle Switches */}
            <div className="pt-2 space-y-4">
              {/* Allow Registrations */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-200">Public Registrations</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Allow standard user signups</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToggles({ ...toggles, allowRegistrations: !toggles.allowRegistrations })}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${
                    toggles.allowRegistrations ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${
                    toggles.allowRegistrations ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-200">Maintenance Mode</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Lock workspace for maintenance</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToggles({ ...toggles, maintenanceMode: !toggles.maintenanceMode })}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${
                    toggles.maintenanceMode ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${
                    toggles.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-xs flex items-center justify-center space-x-2 shadow-md shadow-orange-500/10 cursor-pointer"
        >
          {saveStatus === 'saving' ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Saving Configurations...</span>
            </>
          ) : saveStatus === 'success' ? (
            <>
              <FiCheck className="w-4 h-4 text-white animate-pulse" />
              <span>Configurations Applied</span>
            </>
          ) : (
            <span>Save System Variables</span>
          )}
        </button>
      </form>
    </div>
  );
}
