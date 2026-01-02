

export interface ScheduleTemplate {
  event: string;
  location?: string;
}

export interface Role {
  id: string;
  name: string;
  tasks: ScheduleTemplate[];
}

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
}

export interface ScheduleItem {
  id: string;
  day: number;
  time: string;
  event: string;
  location?: string;
  staffIds: string[];
  roleName?: string;
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
  scheduleTemplates: ScheduleTemplate[];
}

    