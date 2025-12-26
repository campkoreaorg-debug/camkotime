import type { VenueData } from './types';
import { PlaceHolderImages } from './placeholder-images';

const mapBg = PlaceHolderImages.find(p => p.id === 'map-background')?.imageUrl || '';

export const initialData: VenueData = {
  // Staff is now initially empty.
  staff: [],
  schedule: [
    { id: 'sch-1', time: '09:00 AM', event: 'Gates Open', location: 'Main Entrance' },
    { id: 'sch-2', time: '10:00 AM', event: 'Keynote Speech', location: 'Main Stage' },
    { id: 'sch-3', time: '12:00 PM', event: 'Lunch Break', location: 'Food Court' },
    { id: 'sch-4', time: '02:00 PM', event: 'Workshop A', location: 'Room 101' },
    { id: 'sch-5', time: '06:00 PM', event: 'Venue Closes', location: 'All Areas' },
  ],
  // Markers for staff are also removed.
  markers: [
    { id: 'marker-4', type: 'poi', label: 'Main Stage', x: 50, y: 20 },
    { id: 'marker-5', type: 'poi', label: 'Restrooms', x: 15, y: 75 },
    { id: 'marker-6', type: 'poi', label: 'First Aid', x: 85, y: 75 },
  ],
  mapImageUrl: mapBg,
};
