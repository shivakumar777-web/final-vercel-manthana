// Shared TypeScript models and API client for Manthana frontends.
// Shared types and API client for Manthana gateway-facing apps.

// Types
export type {
  Severity,
  ReportLanguage,
  ReportResponse,
  Finding,
  AnalysisResponse,
  JobStatus,
  ServiceHealth,
  PatientContext,
  ScanCase,
  ScanImage,
  ScanStage,
  ImageScan,
  Modality,
  AnalysisMode,
  MultiModelUpload,
  MultiModelResult,
  MultiModelStage,
  MultiModelSession,
  CorrelationFinding,
  UnifiedAnalysisResult,
  StructuredReportSection,
  StructuredReportData,
  HeatmapColorScheme,
  HeatmapState,
  ViewerMode,
  DicomWindowState,
  DicomSeriesState,
  DicomActiveTool,
  DicomViewportState,
  DicomMetadataType,
  PacsStudy,
  PacsSeries,
  WorklistItem,
  PacsModality,
  PacsConfig,
  InterrogatorQuestion,
  StructuredReportFinding,
  DiagnosisWithConfidence,
  NextStepItem,
  ResearchReferenceLink,
  ClinicalCorrelationBlock,
  AIInterpretationReport,
  AIOrchestrationStage,
  DetectModalityResult,
  InterrogateResult,
  InterpretResult,
  ModalityGroupDef,
  StructuredInterpretationDisclaimer,
} from "./types";

export { formatInterpretationDisclaimer } from "./interpretation-disclaimer";

// API surface
export * from "./client";

export {};
