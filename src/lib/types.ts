export type Role = 'Security' | 'Medical' | 'Operations' | 'Info';
export type RoleKorean = '보안' | '의료' | '운영' | '안내';

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  avatar: string; // Can be a placeholder ID or a data URL
}

export interface ScheduleItem {
  id: string;
  day: number; // 0, 1, 2, 3
  time: string; // "07:00", "07:30", ...
  event: string;
  location: string;
}

export interface MapMarker {
  id: string; // can be staff id or a unique POI id
  type: 'staff' | 'poi';
  label: string;
  x: number; // percentage
  y: number; // percentage
  staffId?: string; // link to staff member
}

export interface VenueData {
  staff: StaffMember[];
  schedule: ScheduleItem[];
  markers: MapMarker[];
  mapImageUrl?: string;
}
