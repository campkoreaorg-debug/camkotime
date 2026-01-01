

export interface ScheduleTemplate {
  day: number;
  time: string;
  event: string;
  location?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  day: number;
  categoryId: string;
  scheduleTemplates?: ScheduleTemplate[];
}

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
  role: { id: string; name: string; day: number; } | null;
}

export interface ScheduleItem {
  id: string;
  day: number;
  time: string;
  event: string;
  location?: string;
  staffIds: string[];
}

export interface MapMarker {
  id: string;
  staffIds: string[];
  day: number;
  time: string;
  x: number;
  y: number;
}

export interface MapInfo {
  id: string; 
  day: number;
  time: string;
  mapImageUrl: string;
}

export interface VenueData {
  staff: StaffMember[];
  roles: Role[];
  categories: Category[];
  schedule: ScheduleItem[];
  markers: MapMarker[];
  maps: MapInfo[];
  notification?: string;
}
