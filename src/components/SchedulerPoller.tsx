"use client";

import { useEffect } from "react";

/**
 * SchedulerPoller - Runs in the background to trigger scheduled message processing
 * This component should be added to the root layout
 */
export default function SchedulerPoller() {
  useEffect(() => {
    console.log('[SchedulerPoller] Starting...');
    
    // Run immediately on mount
    fetch('/api/cron/scheduler', { method: 'POST' })
      .then(res => res.json())
      .then(data => console.log('[SchedulerPoller] Initial run:', data))
      .catch(err => console.error('[SchedulerPoller] Error:', err));
    
    // Then run every minute
    const interval = setInterval(() => {
      fetch('/api/cron/scheduler', { method: 'POST' })
        .then(res => res.json())
        .then(data => console.log('[SchedulerPoller] Processed:', data))
        .catch(err => console.error('[SchedulerPoller] Error:', err));
    }, 60 * 1000); // 60 seconds

    return () => {
      console.log('[SchedulerPoller] Stopping...');
      clearInterval(interval);
    };
  }, []);

  return null; // This component doesn't render anything
}
