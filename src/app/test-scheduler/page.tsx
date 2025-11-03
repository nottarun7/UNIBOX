"use client";

import { useState } from "react";

export default function TestSchedulerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const triggerScheduler = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron/scheduler', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Test Scheduler</h1>
        
        <button
          onClick={triggerScheduler}
          disabled={loading}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Trigger Scheduler Now'}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-gray-800 rounded">
            <h2 className="font-semibold mb-2">Result:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-800 rounded">
          <h2 className="font-semibold mb-2">How it works:</h2>
          <ul className="text-sm space-y-2">
            <li>• The scheduler runs automatically every 60 seconds in the background</li>
            <li>• It checks for scheduled messages where `scheduledFor` ≤ current time</li>
            <li>• Found messages are sent via the appropriate channel (SMS/WhatsApp/Email)</li>
            <li>• Status is updated to SENT or FAILED</li>
            <li>• Use this button to manually trigger it for testing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
