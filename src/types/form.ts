export type QuestionType = 'short_text' | 'long_text' | 'email' | 'phone' | 'date' | 'url' | 'single_choice' | 'multiple_choice' | 'video_upload';

export interface Question {
  id: string;
  key: string;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
}

export interface Section {
  id: string;
  key: string;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
}

export interface FormSchema {
  id: string;
  slug: string;
  title: string;
  description?: string;
  sections: Section[];
}
