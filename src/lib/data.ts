
import type { VenueData } from './types';
import { PlaceHolderImages } from './placeholder-images';

const mapBg = PlaceHolderImages.find(p => p.id === 'map-background')?.imageUrl || '';

export const initialData: VenueData = {
  staff: [
    { id: 'staff-1', name: '이보람', avatar: PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl || '', role: { id: 'role-1', name: '보안' } },
    { id: 'staff-2', name: '박서준', avatar: PlaceHolderImages.find(p => p.id === 'avatar-2')?.imageUrl || '', role: { id: 'role-2', name: '의료' } },
    { id: 'staff-3', name: '김민지', avatar: PlaceHolderImages.find(p => p.id === 'avatar-3')?.imageUrl || '', role: { id: 'role-3', name: '안내' } },
    { id: 'staff-4', name: '최현우', avatar: PlaceHolderImages.find(p => p.id === 'avatar-4')?.imageUrl || '', role: { id: 'role-4', name: '운영' } },
    { id: 'staff-5', name: '정다은', avatar: PlaceHolderImages.find(p => p.id === 'avatar-5')?.imageUrl || '', role: null },
  ],
  roles: [
    { id: 'role-1', name: '보안', scheduleTemplates: [{ event: '구역 순찰', location: '전체 구역' }] },
    { id: 'role-2', name: '의료', scheduleTemplates: [{ event: '의료 부스 대기', location: '의료 센터' }] },
    { id: 'role-3', name: '안내', scheduleTemplates: [{ event: '관객 안내', location: '메인 게이트' }] },
    { id: 'role-4', name: '운영', scheduleTemplates: [{ event: '상황실 대기', location: '운영 본부' }] }
  ],
  schedule: [
    { id: 'sch-1', day: 0, time: '09:00', event: '오프닝 게이트 보안 점검', location: '메인 게이트', staffId: 'staff-1' },
    { id: 'sch-2', day: 0, time: '10:00', event: '의료 부스 준비', location: '의료 센터', staffId: 'staff-2' },
    { id: 'sch-3', day: 0, time: '10:30', event: '관객 안내 및 동선 확인', location: '전체 구역', staffId: 'staff-3' },
  ],
  markers: [
    { id: 'marker-1-0-0900', staffId: 'staff-1', day: 0, time: '09:00', x: 20, y: 30 },
    { id: 'marker-2-0-1000', staffId: 'staff-2', day: 0, time: '10:00', x: 50, y: 50 },
    { id: 'marker-3-0-1030', staffId: 'staff-3', day: 0, time: '10:30', x: 80, y: 70 },
  ],
  maps: [
    { id: 'day0-0900', day: 0, time: '09:00', mapImageUrl: mapBg },
    { id: 'day0-1000', day: 0, time: '10:00', mapImageUrl: mapBg },
    { id: 'day0-1030', day: 0, time: '10:30', mapImageUrl: mapBg },
  ],
};
