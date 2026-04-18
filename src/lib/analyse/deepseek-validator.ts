/* ═══ LABS PRE-VALIDATION (gateway /ai/pre-validate) ═══ */
import { GATEWAY_URL } from "./constants";
import { getGatewayAuthToken } from "./auth-token";

export interface PreValidationRequest {
  imageBase64: string;
  filename: string;
  selectedModality: string;
  patientContext: PatientContext;
}

export interface PatientContext {
  patientId: string;
  age?: string;
  gender?: string;
  location?: string;
  tobaccoUse?: string;
  symptoms?: string;
  clinicalHistory?: string;
  fastingStatus?: string;
  medications?: string;
  [key: string]: unknown;
}

export interface DiagnosticQuestion {
  id: string;
  question: string;
  whyItHelps: string;
  answered?: boolean;
}

export interface PreValidationResponse {
  fileType: string;
  detectedModality: string;
  selectedModality: string;
  modalityMatch: boolean;
  imageQuality: "good" | "acceptable" | "poor";
  provisionalOpinion: string;
  questions: DiagnosticQuestion[];
  patientDataCompleteness: {
    missingFields: string[];
    suggestions: string[];
  };
  readyForInference: boolean;
  concerns: string[];
}

export interface ChatMessage {
  role: "ai" | "user";
  content: string;
}

async function readGatewayError(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const data = (await res.json()) as { detail?: unknown };
      const d = data?.detail;
      if (typeof d === "string") return d;
      if (d != null) return JSON.stringify(d);
    } catch {
      /* fall through */
    }
  }
  return res.text().catch(() => `HTTP ${res.status}`);
}

function mapGatewayPreValidateToResponse(
  raw: Record<string, unknown>,
  selectedModality: string
): PreValidationResponse {
  const dq = (raw.diagnostic_questions as unknown[]) || [];
  const pdc = (raw.patient_data_completeness as Record<string, unknown>) || {};
  return {
    fileType: String(raw.file_type ?? "unknown"),
    detectedModality: String(raw.detected_modality ?? "unknown"),
    selectedModality,
    modalityMatch: Boolean(raw.modality_match ?? true),
    imageQuality: (raw.image_quality as PreValidationResponse["imageQuality"]) || "acceptable",
    provisionalOpinion: String(raw.provisional_opinion ?? ""),
    questions: dq.map((q: unknown, idx: number) => {
      const o = q as Record<string, unknown>;
      return {
        id: String(o.id ?? `q_${idx}`),
        question: String(o.question ?? ""),
        whyItHelps: String(o.why_it_helps ?? ""),
        answered: false,
      };
    }),
    patientDataCompleteness: {
      missingFields: (pdc.missing_fields as string[]) || [],
      suggestions: (pdc.suggestions as string[]) || [],
    },
    readyForInference: Boolean(raw.ready_for_inference ?? true),
    concerns: (raw.concerns as string[]) || [],
  };
}

/**
 * Compress and convert image to base64 for vision pre-validate
 */
async function prepareImageForDeepSeek(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      const MAX_SIZE = 1024;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataUrl.split(",")[1]);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Pre-validate via gateway (JWT); no browser OpenRouter key.
 */
export async function validateWithDeepSeek(
  request: PreValidationRequest,
  signal?: AbortSignal,
  subscriptionTier?: string
): Promise<PreValidationResponse> {
  const token = getGatewayAuthToken();
  if (!token) {
    throw new Error("Not authenticated — sign in to run pre-validation.");
  }

  const tier = subscriptionTier ?? "free";

  const res = await fetch(`${GATEWAY_URL}/ai/pre-validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Subscription-Tier": tier,
    },
    body: JSON.stringify({
      image_b64: request.imageBase64,
      image_mime: "image/jpeg",
      selected_modality: request.selectedModality,
      patient_context: request.patientContext,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await readGatewayError(res));
  }

  const data = (await res.json()) as {
    raw?: Record<string, unknown>;
    model_used?: string;
  };
  const raw = data.raw;
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid pre-validate response from gateway");
  }
  return mapGatewayPreValidateToResponse(raw, request.selectedModality);
}

/**
 * Follow-up chat about validation context (gateway).
 */
export async function chatWithDeepSeek(
  message: string,
  chatHistory: ChatMessage[],
  validationContext: PreValidationResponse,
  signal?: AbortSignal,
  subscriptionTier?: string
): Promise<string> {
  const token = getGatewayAuthToken();
  if (!token) {
    throw new Error("Not authenticated — sign in to continue.");
  }

  const tier = subscriptionTier ?? "free";
  const history = chatHistory.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch(`${GATEWAY_URL}/ai/pre-validate-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Subscription-Tier": tier,
    },
    body: JSON.stringify({
      message,
      chat_history: history,
      validation_context: {
        fileType: validationContext.fileType,
        detectedModality: validationContext.detectedModality,
        selectedModality: validationContext.selectedModality,
        imageQuality: validationContext.imageQuality,
        provisionalOpinion: validationContext.provisionalOpinion,
      },
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await readGatewayError(res));
  }

  const data = (await res.json()) as { content?: string };
  return data.content || "";
}

export async function validateFile(
  file: File,
  selectedModality: string,
  patientContext: PatientContext,
  signal?: AbortSignal,
  subscriptionTier?: string
): Promise<PreValidationResponse> {
  const imageBase64 = await prepareImageForDeepSeek(file);
  return validateWithDeepSeek(
    {
      imageBase64,
      filename: file.name,
      selectedModality,
      patientContext,
    },
    signal,
    subscriptionTier
  );
}
