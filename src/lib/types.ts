

export interface Role {
  id: string;
  name: string;
  scheduleTemplates?: Omit<ScheduleItem, 'id' | 'staffId'>[];
}

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
  role: { id: string; name: string } | null;
}

export interface ScheduleItem {
  id: string;
  day: number;
  time: string;
  event: string;
  location: string;
  staffId?: string | null;
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
  schedule: ScheduleItem[];
  markers: MapMarker[];
  maps: MapInfo[];
}
