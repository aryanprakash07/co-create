export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  isEraser: boolean;
  userId: string;
  userName: string;
}

export interface CanvasVersion {
  id: string;
  name: string;
  description: string;
  strokes: Stroke[];
  timestamp: string;
  creatorName: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export interface RoomUser {
  id: string;
  name: string;
  avatar: string;
  isSpeaking: boolean;
  speakVolume: number; // 0 to 100 representing mic level
}

export interface Room {
  id: string;
  title: string;
  description: string;
  strokes: Stroke[];
  versions: CanvasVersion[];
  messages: ChatMessage[];
  activeUsers: RoomUser[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string; // Emoji representing logo
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Remote';
  description: string;
  salary: string;
  skills: string[];
  postedAt: string;
  applicationsCount: number;
  postedBy: string; // User ID of creator
  isFreelance: boolean; // true for freelance/gig, false for standard job
}

export interface Portfolio {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar: string;
  title: string;
  description: string;
  imageSrc: string; // Base64 data URL from drawing or preset URL
  likes: number;
  likedBy: string[]; // List of userIds who liked it
  processSteps: { title: string; description: string }[];
  comments: { id: string; userName: string; userAvatar: string; text: string; timestamp: string }[];
  timestamp: string;
}

export interface ArtistProfile {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  skills: string[];
  location: string;
  website: string;
  bio: string;
}
