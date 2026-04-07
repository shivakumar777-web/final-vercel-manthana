import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { labsScanTierForModality } from "@/lib/labs/modality-tier";
import { labsQuotaMessage } from "@/lib/labs/quota-messages";
import type { PaidLabsPlan } from "@/lib/labs/modality-tier";

/**
 * Record one successful Labs analyze for quota (active Pro or Premium).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { modalityId?: string };
    const modalityId = (body.modalityId || "").trim();
    if (!modalityId) {
      return NextResponse.json({ error: "modalityId required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier = labsScanTierForModality(modalityId);

    let svc;
    try {
      svc = createServiceRoleClient();
    } catch {
      console.warn("[labs/record-scan] No SUPABASE_SERVICE_ROLE_KEY — quota not persisted");
      return NextResponse.json({ ok: true, serverSkipped: true });
    }

    const { data, error } = await svc.rpc("consume_labs_scan", {
      p_user_id: user.id,
      p_tier: tier,
    });

    if (error) {
      console.error("[labs/record-scan] RPC error:", error);
      return NextResponse.json(
        { error: "Quota update failed", detail: error.message },
        { status: 500 }
      );
    }

    const result = data as {
      ok?: boolean;
      error?: string;
      limit?: number;
      plan?: string;
    };
    if (!result?.ok) {
      const code = result?.error ?? "quota";
      const status =
        code === "daily_cap" || code.endsWith("_cap") || code === "monthly_total"
          ? 429
          : 403;
      const planNorm =
        result?.plan === "proplus" || result?.plan === "pro"
          ? (result.plan as PaidLabsPlan)
          : undefined;
      return NextResponse.json(
        {
          error: code,
          limit: result?.limit,
          tier,
          message: labsQuotaMessage(code, result?.limit, planNorm),
        },
        { status }
      );
    }

    return NextResponse.json({ ok: true, tier });
  } catch (e) {
    console.error("[labs/record-scan]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

