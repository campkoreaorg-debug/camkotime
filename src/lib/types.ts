

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
  categoryId: string;
  scheduleTemplates?: ScheduleTemplate[];
}

export interface Position {
  id: string;
  name: string;
  color: string;
}

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
  role: { id: string; name: string } | null;
  position: { id: string; name: string; color: string } | null;
}

export interface ScheduleItem {
  id: string;
  day: number;
  time: string;
  event: string;
  location?: string;
  staffId?: string;
}

export interface MapMarker {
  id: string;
  staffId: string;
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
  positions: Position[];
  schedule: ScheduleItem[];
  markers: MapMarker[];
  maps: MapInfo[];
  notification?: string;
}
