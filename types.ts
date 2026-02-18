
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export type AspectRatio = '16:9' | '9:16' | '1:1';

export type ClinicalRole = 'General Surgeon' | 'Anesthesiology' | 'Robotic Tech' | 'Perioperative Nurse';

export type PlanType = 'Positioning Diagram' | 'Robotic Port Map' | 'Room Layout' | 'Pressure Point Map' | 'Anatomical Schematic';

export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Mandarin' | 'Japanese';

export interface GeneratedImage {
  id: string;
  data: string;
  prompt: string;
  timestamp: number;
  role?: ClinicalRole;
  type?: PlanType;
  language?: Language;
}

export interface SearchResultItem {
  title: string;
  url: string;
}

export interface GuideStep {
  title: string;
  description: string;
}

export interface ResearchResult {
  imagePrompt: string;
  checkpoints: string[];
  multiStepGuide: GuideStep[];
  followUpQuestions: string[];
  searchResults: SearchResultItem[];
  summary: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
