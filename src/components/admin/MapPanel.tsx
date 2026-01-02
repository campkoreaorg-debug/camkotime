
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useVenueData } from '@/hooks/use-venue-data';
import type { ScheduleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import VenueMap from '../VenueMap';
import { Button } from '../ui/button';
import { timeSlots } from '@/hooks/use-venue-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Megaphone, MousePointerSquareDashed, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDrop } from 'react-dnd';
import { ItemTypes } from './StaffPanel';
import { useSession } from '@/hooks/use-session';

interface MapPanelProps {
    selectedSlot: { day: number, time: string } | null;
    onSlotChange: (day: number, time: string) => void;
    isLinked: boolean;
}

const days = [0, 1, 2, 3];

export function MapPanel({ selectedSlot, onSlotChange, isLinked }: MapPanelProps) {
    const { sessionId } = useSession();
    const { data, updateNotification, addMarker } = useVenueData();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState(`day-${selectedSlot?.day ?? 0}`);
    const [notificationText, setNotificationText] = useState('');
    const mapRef = useRef<HTMLDivElement>(null);


    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.STAFF,
        drop: (item: { staffId: string }, monitor) => {
            if (!selectedSlot || !mapRef.current) return;
            const dropPosition = monitor.getClientOffset();
            const mapBounds = mapRef.current.getBoundingClientRect();
            
            if(dropPosition){
                let x = ((dropPosition.x - mapBounds.left) / mapBounds.width) * 100;
                let y = ((dropPosition.y - mapBounds.top) / mapBounds.height) * 100;
                x = Math.max(0, Math.min(100, x));
                y = Math.max(0, Math.min(100, y));
                
                addMarker(item.staffId, selectedSlot.day, selectedSlot.time, x, y);
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [selectedSlot, addMarker]);

    useEffect(() => {
        if(data?.notification) {
            setNotificationText(data.notification);
        }
    }, [data]);
    
    useEffect(() => {
        if (selectedSlot) {
            const newTab = `day-${selectedSlot.day}`;
            if (newTab !== activeTab) {
                setActiveTab(newTab);
            }
        }
    }, [selectedSlot]);


    const scheduleByDay = useMemo(() => {
        if (!data?.schedule) return [];
        return days.map(day => {
            return data.schedule.filter(s => s.day === day).reduce((acc, item) => {
                if (!acc[item.time]) {
                    acc[item.time] = [];
                }
                acc[item.time].push(item);
                return acc;
            }, {} as Record<string, ScheduleItem[]>);
        });
    }, [data]);

    const currentDaySchedules = useMemo(() => {
        const day = parseInt(activeTab.split('-')[1], 10);
        return scheduleByDay[day] || {};
    }, [scheduleByDay, activeTab]);
    
    const handleTabChange = (newTab: string) => {
        const currentDay = parseInt(newTab.split('-')[1], 10);
        setActiveTab(newTab);
        if (!isLinked && timeSlots.length > 0) {
            onSlotChange(currentDay, selectedSlot?.time || timeSlots[0]);
        }
    };

    const handleSaveNotification = () => {
        updateNotification(notificationText);
        toast({
            title: '공지 저장됨',
            description: '지도에 공지사항이 업데이트되었습니다.',
        });
    }

    const openMapWindow = () => {
        if (!sessionId) {
            alert("먼저 차수(Session)를 선택해주세요.");
            return;
        }
        window.open(`/map?sid=${sessionId}`, '_blank', 'width=1280,height=800,resizable=yes,scrollbars=yes');
    };

    if (!data) {
        return (
             <Card className='lg:col-span-1'>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl font-semibold">지도 및 공지</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>데이터 로딩 중...</p>
                </CardContent>
             </Card>
        )
    }

    return (
        <Card ref={drop} className='lg:col-span-1 relative'>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-2xl font-semibold">지도 및 공지</CardTitle>
                        <CardDescription>
                        {isLinked ? 
                            '전역 시간대 설정과 연동된 지도입니다.' :
                            selectedSlot ? `독립적으로 ${selectedSlot.day}일차 ${selectedSlot.time}의 지도를 보고 있습니다.` : '시간대를 선택하여 지도를 확인하세요.'
                        }
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={openMapWindow}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        따로 보기
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex w-full items-center space-x-2">
                    <Input
                        type="text"
                        placeholder="지도에 표시할 공지사항을 입력하세요..."
                        value={notificationText}
                        onChange={(e) => setNotificationText(e.target.value)}
                    />
                    <Button onClick={handleSaveNotification}>
                        <Megaphone className="mr-2 h-4 w-4" />
                        공지 저장
                    </Button>
                </div>
                
                {!isLinked && (
                    <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsList className='mb-4'>
                            {days.map(day => (
                                <TabsTrigger key={`map-day-${day}`} value={`day-${day}`}>{day}일차</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        <div className="flex flex-wrap gap-2 pb-4 border-b mb-4">
                            {timeSlots.map(time => {
                                const day = parseInt(activeTab.split('-')[1], 10);
                                const items = currentDaySchedules[time] || [];
                                const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                                return (
                                <Button 
                                    key={time} 
                                    variant={isSelected ? "default" : (items.length > 0 ? "secondary" : "outline")}
                                    className="flex-shrink-0 text-xs h-8"
                                    onClick={() => onSlotChange(day, time)}
                                >
                                    {time}
                                </Button>
                                )
                            })}
                        </div>
                    </Tabs>
                )}

                <div ref={mapRef}>
                    <VenueMap
                        allMarkers={data.markers}
                        allMaps={data.maps}
                        staff={data.staff}
                        schedule={data.schedule}
                        isDraggable={true}
                        selectedSlot={selectedSlot}
                        notification={data.notification}
                    />
                </div>
            </CardContent>
            {isOver && canDrop && (
                <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center pointer-events-none z-10">
                    <MousePointerSquareDashed className="h-16 w-16 text-primary" />
                    <p className="mt-4 text-lg font-semibold text-primary">여기에 스태프를 놓아 지도에 추가하세요</p>
                </div>
            )}
      </Card>
    );
}

    

    
