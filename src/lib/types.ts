
export type Role = 'Security' | 'Medical' | 'Operations' | 'Info';
export type RoleKorean = '보안' | '의료' | '운영' | '안내';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string; // Can be a placeholder ID or a data URL
}

export interface ScheduleItem {
  id: string;
  day: number; // 0, 1, 2, 3
  time: string; // "07:00", "07:30", ...
  event: string;
  location: string;
  staffId?: string;
  selected?: boolean;
}

export interface MapMarker {
  id: string;
  staffId: string;
  day: number;
  time: string;
  x: number; // percentage
  y: number; // percentage
  label: string; // From staff member name, denormalized for easier access
  type: 'staff'; // Type is always staff now
}

export interface MapInfo {
  id: string; // e.g., 'day0-0930'
  day: number;
  time: string;
  mapImageUrl: string;
}

export interface VenueData {
  staff: StaffMember[];
  schedule: ScheduleItem[];
  markers: MapMarker[];
  maps: MapInfo[];
  mapImageUrl?: string; // Legacy, will be phased out
}
