export const TAGS = ["Idea", "Prototype", "Failure", "Breakthrough", "Final"] as const;

export type EntryTag = (typeof TAGS)[number];

export interface Entry {
  id: string;
  title: string;
  note: string;
  tag: EntryTag;
  date: string;
  image: string | null;
  specs: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  entries: Entry[];
}

export interface ParsedNote {
  title: string;
  tag: EntryTag;
  specs: string[];
}

export type EntryUpdates = Partial<Pick<Entry, "title" | "note" | "tag" | "date" | "image" | "specs">>;
