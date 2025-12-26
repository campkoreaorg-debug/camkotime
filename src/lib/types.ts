export interface StaffMember {
  id: string;
  name: string;
  role: 'Security' | 'Medical' | 'Operations' | 'Info';
  avatar: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
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
}
