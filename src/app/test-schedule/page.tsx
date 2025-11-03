"use client";

import { useState } from "react";

export default function TestSchedulePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSchedule = async () => {
    setLoading(true);
    try {
      // Get the first contact
      const contactsRes = await fetch('/api/contacts');
      const contactsData = await contactsRes.json();
      const contact = contactsData.contacts?.[0];

      if (!contact) {
        setResult({ error: "No contacts found. Create a contact first." });
        return;
      }

      // Schedule a message for 2 minutes from now
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + 2);

      const scheduleRes = await fetch('/api/scheduled-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          channel: 'sms',
          content: 'Test scheduled message at ' + new Date().toLocaleTimeString(),
          scheduledFor: scheduledFor.toISOString(),
        }),
      });

      const scheduleData = await scheduleRes.json();
      
      if (!scheduleRes.ok) {
        setResult({ error: scheduleData.error, details: scheduleData.details });
        return;
      }

      setResult({ 
        success: true, 
        message: scheduleData.scheduledMessage,
        scheduledFor: scheduledFor.toLocaleString(),
      });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const viewScheduled = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scheduled-simple?all=false');
      const data = await res.json();
      setResult({ scheduled: data.scheduled });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const viewAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scheduled-simple?all=true');
      const data = await res.json();
      setResult({ all: data.scheduled });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const triggerScheduler = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron/scheduler', { method: 'POST' });
      const data = await res.json();
      setResult({ schedulerResult: data });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Scheduling System</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={testSchedule}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          1. Schedule Test Message (2 min from now)
        </button>
        
        <button
          onClick={viewScheduled}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 ml-2"
        >
          2. View Pending Scheduled
        </button>

        <button
          onClick={viewAll}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50 ml-2"
        >
          3. View All Scheduled (including sent)
        </button>
        
        <button
          onClick={triggerScheduler}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded disabled:opacity-50 ml-2"
        >
          4. Trigger Scheduler Now
        </button>
      </div>

      {result && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>Click "Schedule Test Message" to create a message scheduled for 2 minutes from now</li>
          <li>Click "View Pending Scheduled" to see the pending message</li>
          <li>Wait 2 minutes OR click "Trigger Scheduler Now" to process it immediately</li>
          <li>Click "View All Scheduled" to see the message has been sent</li>
        </ol>
      </div>
    </div>
  );
}
