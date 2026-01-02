

export interface ScheduleTemplate {
  id: string; // id 추가
  day: number;
  time: string;
  event: string;
  location?: string;
}

export interface Role {
  id:string;
  name: string;
  day: number;
  time: string;
  scheduleTemplates?: Omit<ScheduleTemplate, 'id'>[]; // ID는 역할에 포함되지 않음
}

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
  role: { id: string; name: string; day: number; time: string; } | null;
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
  schedule: ScheduleItem[];
  markers: MapMarker[];
  maps: MapInfo[];
  notification?: string;
  scheduleTemplates: ScheduleTemplate[]; // scheduleTemplates 추가
}
