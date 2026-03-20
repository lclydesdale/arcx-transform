
export interface AirtableFields {
  "Name": string;
  "Title": string;
  "Email"?: string;
  "Department/Team": string;
  "Top time-consuming tasks": string;
  "Creative, strategic, or analytical tasks": string;
  "People tasks and skills": string;
  "Tech Stack": string;
  "Tech Friction": string;
  "Work Chores": string;
  "Emergent Skill Development": string;
  "Work Backlog (opportunity cost)": string;
  "AI Tool Usage": string;
  "AI Wins": string;
  "Possible AI Hand off": string;
  "AI Native Ideas": string;
  "Job Description Comparison": string;
  "Sign In ID"?: string;
  "Refined_JSON"?: string;
  "Roadmap_JSON"?: string;
  "AI_AugmentationPlan"?: string;
  // Feedback Fields
  "Feedback_MissingWork"?: string;
  "Feedback_JDInclude"?: string;
  "Feedback_JDExclude"?: string;
  "Feedback_AdditionalTools"?: string;
  "Feedback_EnjoyableWork"?: string;
  "Feedback_BacklogBlockers"?: string;
  "Feedback_PersonalJudgment"?: string;
  "Feedback_ToolReplacement"?: string;
  "Feedback_TechWorkarounds"?: string;
  "Feedback_InevitableChores"?: string;
  "Feedback_NextAIWin"?: string;
  "Feedback_MainAIFocus"?: string;
  "Feedback_GeneralComments"?: string;
}

export interface AirtableRecord {
  id: string;
  fields: AirtableFields;
  createdTime: string;
}

export interface AirtableResponse {
  records: AirtableRecord[];
}
