

import type { VenueData } from './types';
import { PlaceHolderImages } from './placeholder-images';

const mapBg = PlaceHolderImages.find(p => p.id === 'map-background')?.imageUrl || '';

// VenueData 타입에 맞게 Omit 수정
export const initialData: Omit<VenueData, 'notification' | 'scheduleTemplates'> = {
  staff: [
    { id: 'staff-1', name: '이보람', avatar: PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl || '' },
    { id: 'staff-2', name: '박서준', avatar: PlaceHolderImages.find(p => p.id === 'avatar-2')?.imageUrl || '' },
    { id: 'staff-3', name: '김민지', avatar: PlaceHolderImages.find(p => p.id === 'avatar-3')?.imageUrl || '' },
    { id: 'staff-4', name: '최현우', avatar: PlaceHolderImages.find(p => p.id === 'avatar-4')?.imageUrl || '' },
    { id: 'staff-5', name: '정다은', avatar: PlaceHolderImages.find(p => p.id === 'avatar-5')?.imageUrl || '' },
  ],
  roles: [
    { id: 'role-1', name: '보안팀', tasks: [{ event: '구역 순찰', location: '전체 구역' }, { event: '게이트 통제'}] },
    { id: 'role-2', name: '의료팀', tasks: [{ event: '의료 부스 대기', location: '의료 센터' }] },
    { id: 'role-3', name: '안내팀', tasks: [{ event: '관객 안내', location: '메인 게이트' }] },
  ],
  schedule: [
    { id: 'sch-1', day: 0, time: '09:00', event: '오프닝 게이트 보안 점검', location: '메인 게이트', staffIds: ['staff-1'] },
    { id: 'sch-2', day: 0, time: '10:00', event: '의료 부스 준비', location: '의료 센터', staffIds: ['staff-2'] },
    { id: 'sch-3', day: 1, time: '10:30', event: '관객 안내 및 동선 확인', location: '전체 구역', staffIds: ['staff-3'] },
  ],
  markers: [
    { id: 'marker-1-0-0900', staffIds: ['staff-1'], day: 0, time: '09:00', x: 20, y: 30 },
    { id: 'marker-2-0-1000', staffIds: ['staff-2'], day: 0, time: '10:00', x: 50, y: 50 },
    { id: 'marker-3-1-1030', staffIds: ['staff-3'], day: 1, time: '10:30', x: 80, y: 70 },
  ],
  maps: [
    { id: 'day0-0900', day: 0, time: '09:00', mapImageUrl: mapBg },
    { id: 'day0-1000', day: 0, time: '10:00', mapImageUrl: mapBg },
    { id: 'day1-1030', day: 1, time: '10:30', mapImageUrl: mapBg },
  ]
};
