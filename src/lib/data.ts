import type { VenueData } from './types';

export const initialData: VenueData = {
  staff: [
    { id: 'staff-1', name: 'John Doe', role: 'Security', avatar: 'avatar-1' },
    { id: 'staff-2', name: 'Jane Smith', role: 'Medical', avatar: 'avatar-2' },
    { id: 'staff-3', name: 'Peter Jones', role: 'Operations', avatar: 'avatar-3' },
    { id: 'staff-4', name: 'Mary Johnson', role: 'Info', avatar: 'avatar-4' },
  ],
  schedule: [
    { id: 'sch-1', time: '09:00 AM', event: 'Gates Open', location: 'Main Entrance' },
    { id: 'sch-2', time: '10:00 AM', event: 'Keynote Speech', location: 'Main Stage' },
    { id: 'sch-3', time: '12:00 PM', event: 'Lunch Break', location: 'Food Court' },
    { id: 'sch-4', time: '02:00 PM', event: 'Workshop A', location: 'Room 101' },
    { id: 'sch-5', time: '06:00 PM', event: 'Venue Closes', location: 'All Areas' },
  ],
  markers: [
    { id: 'marker-1', type: 'staff', label: 'John Doe', x: 25, y: 40, staffId: 'staff-1' },
    { id: 'marker-2', type: 'staff', label: 'Jane Smith', x: 50, y: 50, staffId: 'staff-2' },
    { id: 'marker-3', type: 'staff', label: 'Peter Jones', x: 75, y: 60, staffId: 'staff-3' },
    { id: 'marker-4', type: 'poi', label: 'Main Stage', x: 50, y: 20 },
    { id: 'marker-5', type: 'poi', label: 'Restrooms', x: 15, y: 75 },
    { id: 'marker-6', type: 'poi', label: 'First Aid', x: 85, y: 75 },
  ],
};
