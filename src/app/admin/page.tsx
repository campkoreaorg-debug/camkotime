"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { RolePanel } from '@/components/admin/RolePanel';
import { MapPanel } from '@/components/admin/MapPanel';
import { Loader2, ExternalLink, Link as LinkIcon, Database } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVenueData } from '@/hooks/use-venue-data';
import { Role } from '@/lib/types';
// 🔴 [복구] 다시 가져옵니다!
import { useSession } from '@/hooks/use-session';

const days = [0, 1, 2, 3];
export const timeSlots = (() => {
  const slots = [];
  for (let h = 7; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('00:00');
  return slots;
})();

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { data, isLoading: isDataLoading, initializeFirestoreData } = useVenueData();
  
  // 🔴 [복구] 현재 선택된 차수 ID를 가져옵니다.
  const { sessionId, isLoading: isSessionLoading } = useSession();

  const [isLinked, setIsLinked] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [activeTab, setActiveTab] = useState('day-0');
  
  const [mapSlot, setMapSlot] = useState<{ day: number; time: string } | null>(null);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const slotToSave = selectedSlot;
    if (slotToSave) {
      localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(slotToSave));
    }
  }, [selectedSlot]);

  useEffect(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
      const parsedSlot = JSON.parse(storedSlot);
      setSelectedSlot(parsedSlot);
      setMapSlot(parsedSlot);
      setActiveTab(`day-${parsedSlot.day}`);
    } else {
      const defaultSlot = { day: 0, time: '07:00' };
      setSelectedSlot(defaultSlot);
      setMapSlot(defaultSlot);
      setActiveTab('day-0');
    }
  }, []);

  useEffect(() => {
      if (!data?.roles) { 
          setSelectedRole(null);
          return;
      }
      if (!selectedStaffId || !selectedSlot || !data?.schedule) {
          setSelectedRole(null);
          return;
      }
      
      const staffSchedule = data.schedule.find(s => 
          s.staffIds?.includes(selectedStaffId) && 
          s.day === selectedSlot.day && 
          s.time === selectedSlot.time
      );

      if (staffSchedule && (staffSchedule as any).roleName) {
          const role = data.roles.find(r => r.name === (staffSchedule as any).roleName);
          setSelectedRole(role || null);
      } else {
          setSelectedRole(null);
      }

  }, [selectedStaffId, selectedSlot, data]);
  
  const handleSlotChange = (day: number, time: string) => {
    const newSlot = { day, time };
    setSelectedSlot(newSlot);
    setSelectedStaffId(null);
    if (isLinked) {
      setMapSlot(newSlot);
    }
  };

  const handleTabChange = (newTab: string) => {
    const newDay = parseInt(newTab.split('-')[1], 10);
    setActiveTab(newTab);
    if (timeSlots.length > 0) {
        handleSlotChange(newDay, selectedSlot?.time || timeSlots[0]);
    }
  }
  
  const handleMapSlotChange = (day: number, time: string) => {
      const newSlot = { day, time };
      setMapSlot(newSlot);
      if (isLinked) {
        setSelectedSlot(newSlot);
        setActiveTab(`day-${day}`);
        setSelectedStaffId(null);
      }
  };

  const openMapWindow = () => {
    if (!sessionId) {
        alert("먼저 차수(Session)를 선택해주세요.");
        return;
    }
    // 🔴 [핵심 수정] URL 뒤에 ID를 붙여서 보냅니다!
    // 예: /map?sid=abc12345
    window.open(`/map?sid=${sessionId}`, '_blank', 'width=1200,height=800');
  };

  if (isUserLoading || isDataLoading || isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // sessionId 없으면 초기화 화면
  if (!sessionId) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">데이터베이스가 비어있습니다</h2>
            <p className="text-muted-foreground">시작하려면 차수를 선택하거나 생성해주세요.</p>
        </div>
    )
  }

  if (!selectedSlot || !mapSlot || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-4 xl:gap-8">
              <div className="lg:col-span-2 space-y-8">
                  <section className="p-4 md:p-6 space-y-4 border rounded-lg bg-card shadow-sm">
                      <div className='flex justify-between items-center mb-4'>
                        <h2 className="font-headline text-xl font-semibold">시간대 설정</h2>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={openMapWindow}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                따로 보기
                            </Button>
                            <Switch id="link-panels" checked={isLinked} onCheckedChange={setIsLinked} />
                            <Label htmlFor="link-panels" className='flex items-center gap-2'>
                                <LinkIcon className='h-4 w-4'/>
                                지도 연동
                            </Label>
                        </div>
                      </div>
                      <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsList className='mb-4'>
                          {days.map(day => (
                            <TabsTrigger key={day} value={`day-${day}`}>{day}일차</TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                        <div className="flex flex-wrap gap-2 pb-2">
                          {timeSlots.map(time => {
                            const day = parseInt(activeTab.split('-')[1], 10);
                            const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                            return (
                              <Button 
                                  key={time} 
                                  variant={isSelected ? "default" : "outline"}
                                  className="flex-shrink-0 text-xs h-8"
                                  onClick={() => handleSlotChange(day, time)}
                              >
                                  {time}
                              </Button>
                            )
                          })}
                        </div>
                  </section>
                  <StaffPanel 
                    selectedSlot={selectedSlot}
                    onStaffSelect={setSelectedStaffId}
                    selectedStaffId={selectedStaffId}
                  />
                  <RolePanel 
                    selectedSlot={selectedSlot}
                    selectedRole={selectedRole}
                    onRoleSelect={setSelectedRole}
                  />
              </div>

              <div className="lg:col-span-1 space-y-8 mt-8 lg:mt-0">
                <SchedulePanel 
                  selectedSlot={selectedSlot} 
                />
                <MapPanel 
                  selectedSlot={isLinked ? selectedSlot : mapSlot} 
                  onSlotChange={handleMapSlotChange} 
                  isLinked={isLinked}
                />
              </div>
          </div>
      </div>
    </DndProvider>
  );
}