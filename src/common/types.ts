export const AgentTypeEnum = {
  MENTAL_HEALTH: 'MENTAL_HEALTH',
  FINANCE: 'FINANCE',
  PERSONAL_GROWTH: 'PERSONAL_GROWTH',
} as const;

export type AgentType = keyof typeof AgentTypeEnum;

export interface Simulation {
  id: string;
  timelineId: string;
  agentType: AgentType;
  summary: string;
  score: number | null;
  createdAt: Date;
}

export interface TimelineWithForksAndSimulations {
  id: string;
  questionId: string;
  forkedFromId: string | null;
  summary: string;
  tldr?: string | null;
  createdAt: Date;
  simulation: Simulation[];
  forks?: TimelineWithForksAndSimulations[];
}

export interface QuestionWithTimelines {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
  Timelines: TimelineWithForksAndSimulations[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
}
