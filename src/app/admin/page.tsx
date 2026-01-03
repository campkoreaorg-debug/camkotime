"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { RolePanel } from '@/components/admin/RolePanel';
import { AllRolesPanel } from '@/components/admin/AllRolesPanel';
import { MapPanel } from '@/components/admin/MapPanel';
import { Loader2, Link as LinkIcon, Database, ExternalLink, Info, Save } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVenueData, timeSlots } from '@/hooks/use-venue-data'; // 🟢 timeSlots 여기로 통합
import { Role } from '@/lib/types';
import { useSession } from '@/hooks/use-session';
import { CardHeader, CardTitle, CardDescription, Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const days = [0, 1, 2, 3];

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const { sessionId, isLoading: isSessionLoading } = useSession();
  const { data, isLoading: isDataLoading, initializeFirestoreData, updateTimeSlotItinerary } = useVenueData();
  
  const [isLinked, setIsLinked] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [activeTab, setActiveTab] = useState('day-0');
  
  const [mapSlot, setMapSlot] = useState<{ day: number; time: string } | null>(null);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  // 🟢 여기가 핵심 수정 사항입니다! (<Role | null>)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [itineraryText, setItineraryText] = useState('');

  const currentItinerary = useMemo(() => {
    if (!selectedSlot || !data?.timeSlotInfos) return '';
    return data.timeSlotInfos.find(info => info.day === selectedSlot.day && info.time === selectedSlot.time)?.itinerary || '';
  }, [selectedSlot, data?.timeSlotInfos]);

  useEffect(() => {
    setItineraryText(currentItinerary);
  }, [currentItinerary]);

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
      try {
        const parsedSlot = JSON.parse(storedSlot);
        setSelectedSlot(parsedSlot);
        setMapSlot(parsedSlot);
        setActiveTab(`day-${parsedSlot.day}`);
      } catch (e) {
        const defaultSlot = { day: 0, time: timeSlots[0] };
        setSelectedSlot(defaultSlot);
        setMapSlot(defaultSlot);
      }
    } else {
      const defaultSlot = { day: 0, time: timeSlots[0] };
      setSelectedSlot(defaultSlot);
      setMapSlot(defaultSlot);
      setActiveTab('day-0');
    }
  }, []);

  useEffect(() => {
    if (!data?.roles || !data?.schedule) { 
        return;
    }

    if (selectedRole) {
        const updatedRole = data.roles.find(r => r.id === selectedRole.id);
        
        if (updatedRole && JSON.stringify(updatedRole) !== JSON.stringify(selectedRole)) {
            setSelectedRole(updatedRole);
        }
        return;
    }

    if (selectedStaffId && selectedSlot) {
        const staffSchedule = data.schedule.find(s => 
            s.staffIds?.includes(selectedStaffId) && 
            s.day === selectedSlot.day && 
            s.time === selectedSlot.time
        );

        if (staffSchedule && staffSchedule.roleName) {
            const role = data.roles.find(r => r.name === staffSchedule.roleName);
            // 🟢 이제 여기서 에러가 나지 않을 겁니다!
            if (!selectedRole || selectedRole.name !== role?.name) {
                setSelectedRole(role || null);
            }
        } else {
           if (selectedRole) setSelectedRole(null);
        }
    }

}, [selectedStaffId, selectedSlot, data?.schedule, data?.roles, selectedRole]);
  
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
    window.open(`/map?sid=${sessionId}`, '_blank', 'width=1280,height=800,resizable=yes,scrollbars=yes');
  };

  const handleSaveItinerary = () => {
    if (!selectedSlot) return;
    updateTimeSlotItinerary(selectedSlot.day, selectedSlot.time, itineraryText);
    toast({
      title: '일정 저장됨',
      description: `${selectedSlot.day}일차 ${selectedSlot.time}의 일정이 저장되었습니다.`,
    });
  };

  if (isUserLoading || isDataLoading || isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionId) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">데이터베이스가 비어있습니다</h2>
            <p className="text-muted-foreground">시작하려면 차수를 선택하거나 생성해주세요.</p>
        </div>
    )
  }
  
  if (!data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
          <Database className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">선택된 차수에 데이터가 없습니다</h2>
          <p className="text-muted-foreground">초기 데이터를 생성하여 시작하세요.</p>
          <Button onClick={initializeFirestoreData}>
              초기 데이터 생성
          </Button>
      </div>
    )
  }

  if (!selectedSlot || !mapSlot) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 md:p-8">
          <section className="p-4 md:p-6 mb-8 space-y-4 border rounded-lg bg-card shadow-sm">
              <div className='flex justify-between items-center mb-4'>
                <h2 className="font-headline text-xl font-semibold">시간대 설정</h2>
                <div className="flex items-center space-x-2">
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
                <div className="flex w-full items-center space-x-2 pt-4 border-t">
                    <Label htmlFor="itinerary-input" className="flex-shrink-0 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        일정 입력:
                    </Label>
                    <Input
                        id="itinerary-input"
                        type="text"
                        placeholder="이 시간대의 주요 일정을 입력하세요 (예: 점심시간, 메인 공연)..."
                        value={itineraryText}
                        onChange={(e) => setItineraryText(e.target.value)}
                    />
                    <Button onClick={handleSaveItinerary}>
                        <Save className="mr-2 h-4 w-4" />
                        저장
                    </Button>
                </div>
          </section>

          <div className='space-y-8 mb-8'>
            <StaffPanel 
              selectedSlot={selectedSlot}
              onStaffSelect={setSelectedStaffId}
              selectedStaffId={selectedStaffId}
              itinerary={currentItinerary}
            />
            <AllRolesPanel />
            <RolePanel 
              selectedSlot={selectedSlot}
              selectedRole={selectedRole}
              onRoleSelect={setSelectedRole}
              itinerary={currentItinerary}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SchedulePanel 
                selectedSlot={selectedSlot} 
                itinerary={currentItinerary}
              />
               <Card className='lg:col-span-1 relative h-full flex flex-col'>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-headline text-2xl font-semibold">지도 및 공지</CardTitle>
                        <CardDescription>
                         {isLinked 
                           ? '전역 시간대 설정과 연동된 지도입니다.' 
                           : selectedSlot 
                             ? `독립적으로 ${selectedSlot.day}일차 ${selectedSlot.time}의 지도를 보고 있습니다.` 
                             : '시간대를 선택하여 지도를 확인하세요.'
                         }
                        </CardDescription>
                        {currentItinerary && (
                        <div className="mt-2 text-sm font-semibold text-primary flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            <span>{currentItinerary}</span>
                        </div>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={openMapWindow}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      따로 보기
                    </Button>
                  </div>
                </CardHeader>
                <MapPanel 
                    selectedSlot={isLinked ? selectedSlot : mapSlot} 
                    onSlotChange={handleMapSlotChange} 
                    isLinked={isLinked}
                />
              </Card>
          </div>
      </div>
    </DndProvider>
  );
}
