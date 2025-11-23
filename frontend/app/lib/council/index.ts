/**
 * AI Council System - Main Export
 *
 * Secure multi-agent evaluation system with:
 * - Multi-layer prompt injection protection
 * - Content extraction (GitHub, Twitter, YouTube)
 * - Multi-agent communication
 * - Capability-based model selection
 */

// Main orchestrator
export { CouncilOrchestrator } from './orchestrator';
export type {
  AgentCommunication,
  CouncilEvaluationResult
} from './orchestrator';

// Content extraction
export { ContentExtractor } from './content-extractor';
export type {
  SubmissionContent,
  CodeAnalysis,
  CodeFile
} from './content-extractor';

// Security utilities
export {
  validateAndSanitizeInput,
  validateCouncilOutput,
  buildSecurePrompt,
  InformationFlowController,
  logSecurityEvent
} from './security';
export type {
  InputValidationResult,
  CouncilVote,
  TaintedData,
  TaintSource,
  ActionType
} from './security';

// Model configurations
export {
  councilMembers,
  selectJudgesForContent,
  getAllJudges,
  getJudgeById,
  evaluateWithModel,
  evaluateWithOpenAI,
  evaluateWithGrok,
  evaluateWithGemini,
  evaluateWithClaude,
  analyzeVideoWithGemini,
  analyzeCodeWithClaude,
  ModelClients
} from './models';
export type {
  JudgeSpecialization,
  ModelProvider,
  ContentType
} from './models';
