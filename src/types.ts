export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export type PresetTab = "pendidikan" | "umum" | "chat";

export interface PresetFormConfig {
  id: string;
  title: string;
  description: string;
  category: "pendidikan" | "umum";
  iconName: string; // matches lucide icons
  fields: {
    id: string;
    label: string;
    type: "text" | "number" | "textarea" | "select";
    placeholder?: string;
    options?: { label: string; value: string }[];
    defaultValue?: string;
    required?: boolean;
  }[];
  systemInstruction: string;
  promptTemplate: (vals: Record<string, string>) => string;
}
