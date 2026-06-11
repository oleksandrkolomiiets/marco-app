export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type DominantHand = 'left' | 'right' | 'both';

export type CourtSide = 'left' | 'right' | 'either';

export type Plan = 'free' | 'premium' | 'coach';

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  skill_level: SkillLevel | null;
  dominant_hand: DominantHand | null;
  court_side: CourtSide | null;
  play_frequency: string | null;
  goal: string | null;
  plan: Plan;
  created_at: string;
};

export type UpdateUserParams = {
  display_name?: string;
  skill_level?: SkillLevel;
  dominant_hand?: DominantHand;
  court_side?: CourtSide;
  play_frequency?: string;
  goal?: string;
};

export type CuePoint = {
  timestamp_seconds: number;
  cue_text: string;
};

export type LessonDrill = {
  name: string;
  duration_minutes: number;
  is_recommended: boolean;
  description: string;
};

export type ProgressStatus = 'viewed' | 'learned' | 'mastered';

export type LessonProgress = {
  status: ProgressStatus;
  updated_at: string;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  level: SkillLevel;
  order_index: number;
  tagline: string | null;
  focus: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  cue_points: CuePoint[];
  common_mistake_pct: number | null;
  common_mistake_text: string | null;
  drill: LessonDrill | null;
  is_free: boolean;
  locked: boolean;
  progress: LessonProgress | null;
};

export type GoogleAuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
};

export type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  lesson_refs?: { id: string; title: string }[];
  created_at: string;
  feedback_score?: -1 | 0 | 1;
  // Prefill parsed from a [MATCH_LOG: ...] token Marco emitted in this message.
  // Present when the chat UI should render the "Log this match" action tag.
  match_log_prefill?: MatchLogPrefill;
  // True once a match_logs row links back to this message — the action tag
  // renders as a "Logged" badge instead, even across app restarts.
  match_logged?: boolean;
  // Prefill parsed from a [MATCH_PREP: ...] token. Present when the chat UI
  // should render the "Adjust prep" / "Set up prep" action tag.
  match_prep_prefill?: MatchPrepPrefill;
  // ID of the match_preparation row already spawned from this message (set by
  // the server when match_preparation.message_id = this message id). Lets the
  // chat UI render "Prep ready" across app restarts and re-taps reopen the
  // existing prep instead of creating a duplicate.
  match_preparation_id?: string;
};

export type ChatSession = {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};

export type MatchLog = {
  id: string;
  user_id: string;
  played: boolean;
  result: string | null;
  feeling: string | null;
  note: string | null;
  partner_name: string | null;
  opponents: string[];
  played_on: string;
  created_at: string;
};

export type PartnerSuggestion = {
  partner_name: string;
  match_count: number;
};

export type CreateMatchLogParams = {
  played_on: string;
  result?: string;
  feeling?: string;
  note?: string;
  partner_name?: string;
  opponents?: string[];
  // Assistant message that prompted this match log. Sent so the chat UI can
  // render a persistent "Logged" state on the originating message.
  message_id?: string;
};

export type ExamOption = {
  id: string;
  order_index: number;
  text: string;
  // Only populated on review payloads (after submit / latest attempt). Stays
  // false in the take-the-exam payload so the client can't cheat.
  is_correct?: boolean;
};

export type ExamQuestion = {
  id: string;
  slug: string;
  order_index: number;
  category: string;
  prompt: string;
  explanation: string | null;
  options: ExamOption[];
};

export type ExamAttemptSummary = {
  id: string;
  user_id: string;
  score: number;
  total: number;
  passed: boolean;
  completed_at: string;
};

export type ExamQuestionReview = ExamQuestion & {
  selected_option_id: string | null;
  correct_option_id: string;
  is_correct: boolean;
};

export type ExamAttemptReview = ExamAttemptSummary & {
  questions: ExamQuestionReview[];
};

export type SubmitExamAttemptParams = {
  answers: {
    question_id: string;
    selected_option_id: string | null;
  }[];
};

// Data extracted from a [MATCH_LOG: ...] token emitted by Marco during chat.
// Used to pre-fill the MatchLogForm before the user confirms.
export type MatchLogPrefill = {
  result?: string;
  played_on?: string;
  note?: string;
  feeling?: string;
  partner_name?: string;
  opponents?: string[];
};

// Data extracted from a [MATCH_PREP: ...] token emitted by Marco during chat.
// `mode` is the discriminator: "adjust" opens the existing prep referenced by
// `id`; "create" opens the prep sliding sheet pre-filled with the remaining
// fields. Drills are allowed on both modes — Marco inlines them when the user
// explicitly names a drill to add.
export type MatchPrepPrefill = {
  mode: 'adjust' | 'create';
  id?: string;
  scheduled_at?: string;
  opponents?: string[];
  partner_name?: string;
  court?: string;
  note?: string;
  drills?: { title: string; duration_seconds: number }[];
};

// Match preparation — the "prep diary" entry tied to one upcoming match.
// Preparation % is server-computed from drills (completed / total), so the
// client never recomputes it locally. plan_grade is set after the match.
export type MatchPreparationPlanGrade = 'worked' | 'mixed' | 'missed';

export type PreparationDrill = {
  id: string;
  position: number;
  title: string;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
};

export type MatchPreparation = {
  id: string;
  user_id: string;
  match_log_id: string | null;
  scheduled_at: string;
  // Set when the player explicitly marks the prep as played. Lets a prep be
  // "done" before its scheduled time (early start) or stay "upcoming" after
  // it (rescheduled), separate from the calendar-based past/upcoming split.
  played_at: string | null;
  opponents: string[];
  partner_name: string | null;
  court: string | null;
  note: string | null;
  plan_grade: MatchPreparationPlanGrade | null;
  preparation_pct: number;
  drills: PreparationDrill[];
  created_at: string;
  updated_at: string;
};

export type DrillInput = {
  title: string;
  duration_seconds: number;
  // Optional — honoured by PUT /drills so the sheet can replace the queue and
  // commit per-row done flags in one round-trip. Omit on create.
  completed?: boolean;
};

export type CreateMatchPreparationParams = {
  scheduled_at: string; // RFC3339
  opponents?: string[];
  partner_name?: string;
  court?: string;
  note?: string;
  drills?: DrillInput[];
  // Assistant chat message that spawned this prep (from the "Set up prep" tag).
  // Server stores it on match_preparation.message_id so the chat can render
  // "Prep ready" across restarts. Omit for taps from the Match Prep tab.
  message_id?: string;
};

export type UpdateMatchPreparationParams = {
  scheduled_at?: string;
  opponents?: string[];
  partner_name?: string;
  court?: string;
  note?: string;
  match_log_id?: string;
  plan_grade?: MatchPreparationPlanGrade | '';
  // RFC3339 to set a specific timestamp, "now" to stamp the current server
  // time, or "" to clear (un-mark as played).
  played_at?: string;
};

export type AchievementAccent = 'teal' | 'orange' | 'ink';

export type Achievement = {
  slug: string;
  title: string;
  description: string;
  criteria: string;
  progress_label: string;
  icon: string;
  accent: AchievementAccent;
  unlocked: boolean;
  progress: number;
  target: number;
  unlocked_at: string | null;
};

export type AchievementSummary = {
  unlocked: number;
  total: number;
  achievements: Achievement[];
};
