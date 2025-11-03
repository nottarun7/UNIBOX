import { NextResponse } from "next/server";
import { processScheduledMessagesSimple } from "../../../../lib/schedulerSimple";

/**
 * GET /api/cron/scheduler - Manually trigger the scheduler (or called by external cron)
 * This can be called by Vercel Cron, external cron job, or manually for testing
 */
export async function GET(req: Request) {
  try {
    // Check for authorization header (optional security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processScheduledMessagesSimple();
    
    return NextResponse.json({ 
      success: true, 
      processed: result.processed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("GET /api/cron/scheduler error:", err);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: err.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/scheduler - Same as GET but for POST requests
 */
export async function POST(req: Request) {
  return GET(req);
}
