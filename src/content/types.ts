// Curriculum content types. See docs/CONTENT_FORMAT.md.
// Content lives in content/courses/<courseId>/ and is never hard-coded in UI.

export interface SourceRef {
  designId: string;
  pages?: number[];
  page?: number;
  note?: string;
}

export interface Phrase {
  ar?: string | null;
  translit?: string | null;
  en?: string | null;
  note?: string | null;
}

export interface VocabItem extends Phrase {
  id: string;
  notes?: string | null;
  plural?: { ar?: string; translit?: string } | null;
  gender?: string | null;
  page?: number;
}

export interface DialogueLine extends Phrase {
  speaker: string;
}

export type FlagKind = 'missing-answer' | 'suspected-error' | 'ambiguous' | 'needs-review';
export interface Flag {
  kind: FlagKind;
  note?: string;
}

export interface Segment {
  text?: string;
  blank?: boolean;
}

export interface Answer {
  ar?: string | null;
  translit?: string | null;
  en?: string | null;
  /** per-blank fills for multi-blank items, in segment order */
  blanks?: { ar?: string | null; translit?: string | null }[];
}

export type ExerciseType =
  | 'translate-to-arabic'
  | 'translate-to-english'
  | 'fill-blank'
  | 'vocab-recall'
  | 'transform'
  | 'multiple-choice'
  | 'matching'
  | 'listening'
  | 'speaker-responder'
  | 'dialogue-roleplay'
  | 'rhythm'
  | 'discussion';

export interface ExerciseItem {
  id: string;
  prompt?: Phrase | null;
  segments?: Segment[] | null;
  translitSegments?: Segment[] | null;
  answers?: Answer[];
  model?: Phrase | null;
  choices?: Phrase[] | null;
  explanation?: string | null;
  tags?: string[];
  flags?: Flag[];
  source?: SourceRef;
}

export interface Exercise {
  type: 'exercise';
  id: string;
  exerciseType?: ExerciseType; // normalised from `type` field in JSON
  title?: string;
  instructions?: string;
  mode?: 'drill' | 'conversation';
  dialogueId?: string;
  role?: string;
  source?: SourceRef;
  answerKeySource?: SourceRef;
  items: ExerciseItem[];
}

export type Block =
  | { type: 'text'; heading?: string; paragraphs: string[]; source?: SourceRef }
  | { type: 'callout'; heading?: string; text: string; source?: SourceRef }
  | { type: 'examples'; heading?: string; items: Phrase[]; source?: SourceRef }
  | { type: 'vocab'; id?: string; heading?: string; items: VocabItem[]; source?: SourceRef }
  | { type: 'table'; heading?: string; columns: string[]; rows: string[][]; source?: SourceRef }
  | {
      type: 'dialogue';
      id: string;
      title?: string;
      context?: string;
      lines: DialogueLine[];
      source?: SourceRef;
    }
  | {
      type: 'image';
      description: string;
      caption?: string;
      kind?: 'illustration' | 'comic' | 'diagram';
      src?: string;
      source?: SourceRef;
    }
  | Exercise;

export interface Lesson {
  id: string;
  code?: string | null;
  title: string;
  kind?: 'intro' | 'vocab' | 'grammar' | 'drill' | 'dialogue' | 'review' | 'reference';
  source?: SourceRef;
  blocks: Block[];
  continues?: boolean;
  continuationOf?: string;
}

export interface Chapter {
  id: string;
  number: number;
  titleAr?: string;
  titleTranslit?: string;
  titleEn: string;
  source?: SourceRef;
  lessons: Lesson[];
}

export interface CourseMeta {
  id: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  author?: string;
  dialect: string;
  status: 'available' | 'coming-soon';
  canonicalSource?: { designId: string; title: string; url?: string; note?: string };
  relatedSources?: { designId: string; title: string; role: string }[];
  chapters: string[]; // chapter file ids in order
}

export interface Course extends CourseMeta {
  chapterData: Chapter[];
}

// ---------- Audio ----------
export type AudioStatus = 'teacher' | 'native-reviewed' | 'generated-candidate';
export interface AudioRecording {
  key: string; // item id, vocab id, dialogue line id or normalised Arabic text
  src: string;
  status: AudioStatus;
  speaker?: string;
  reviewedBy?: string;
}

// ---------- Scenes (apartment walkthrough) ----------
export interface SceneObject {
  id: string;
  vocabRef?: string; // vocab id in the course
  ar: string;
  translit: string;
  en: string;
  // position within the room's viewBox (0-1000 x 0-640)
  hit: { x: number; y: number; w: number; h: number };
  art: string; // key into the SVG art library
  draggable?: boolean;
}

export interface SceneTask {
  id: string;
  kind: 'identify' | 'describe' | 'find' | 'place';
  prompt: Phrase;
  targetId?: string; // object to tap
  zoneId?: string; // place: zone to drop into
  objectId?: string; // place: object to move
  model: Phrase;
  answers?: Answer[];
  grammar?: string;
  availableAfter?: string; // lesson id where grammar is introduced
  flags?: Flag[];
  source?: SourceRef;
}

export interface SceneRoom {
  id: string;
  ar: string;
  translit: string;
  en: string;
  background: string; // art key
  objects: SceneObject[];
  zones?: { id: string; label: Phrase; hit: { x: number; y: number; w: number; h: number } }[];
  doors?: { to: string; hit: { x: number; y: number; w: number; h: number }; label: Phrase }[];
  tasks: SceneTask[];
  panels?: { id: string; caption: Phrase; focus?: string }[];
}

export interface Scene {
  id: string;
  title: Phrase;
  note?: string;
  source?: SourceRef;
  rooms: SceneRoom[];
}
