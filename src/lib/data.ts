import type { VenueData } from './types';
import { PlaceHolderImages } from './placeholder-images';

const mapBg = PlaceHolderImages.find(p => p.id === 'map-background')?.imageUrl || '';

// 초기 스케줄 및 마커 데이터를 비웁니다.
export const initialData: VenueData = {
  staff: [],
  schedule: [], 
  markers: [],
  mapImageUrl: mapBg,
};
