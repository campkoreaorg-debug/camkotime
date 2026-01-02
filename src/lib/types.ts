

export interface Session {
  id: string;
  name: string;
}

export interface ScheduleTemplate {
  event: string;
  location?: string;
}

export interface Role {
  id: string;
  name: string;
  tasks: ScheduleTemplate[];
  day?: number;
  order?: number;
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

export interface Venue {
    id: string;
    name: string;
    notification?: string;
    isPublic?: boolean;
}

export interface VenueData {
  staff: StaffMember[];
  roles: Role[];
  allRoles?: Role[];
  schedule: ScheduleItem[];
  markers: MapMarker[];
  maps: MapInfo[];
  notification?: string;
  scheduleTemplates: ScheduleTemplate[];
}
