export type ElevateLandingToolCardAccess =
  | "tool"
  | "ai-auto-apply"
  | "coming-soon";

export type ElevateLandingToolCardTheme = {
  bar: string;
  iconTile: string;
  bullet: string;
};

export type ElevateLandingToolCard = {
  id: string;
  title: string;
  description: string;
  features: string[];
  iconKey: string;
  theme: ElevateLandingToolCardTheme;
  popular?: boolean;
  premium?: boolean;
  access: ElevateLandingToolCardAccess;
  /** Required when access is "tool" */
  toolPath?: string;
};

export declare const elevateLandingToolCards: readonly ElevateLandingToolCard[];
