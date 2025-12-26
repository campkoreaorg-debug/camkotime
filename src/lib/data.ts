import type { VenueData } from './types';
import { PlaceHolderImages } from './placeholder-images';

const mapBg = PlaceHolderImages.find(p => p.id === 'map-background')?.imageUrl || '';

// 초기 스케줄 데이터를 비웁니다.
export const initialData: VenueData = {
  staff: [],
  schedule: [], 
  markers: [
    { id: 'marker-4', type: 'poi', label: 'Main Stage', x: 50, y: 20 },
    { id: 'marker-5', type: 'poi', label: 'Restrooms', x: 15, y: 75 },
    { id: 'marker-6', type: 'poi', label: 'First Aid', x: 85, y: 75 },
  ],
  mapImageUrl: mapBg,
};
