
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useVenueData } from '@/hooks/use-venue-data';
import type { ScheduleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import VenueMap from '../VenueMap';
import { Button } from '../ui/button';
import { timeSlots } from '@/hooks/use-venue-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MapPanelProps {
    selectedSlot: { day: number, time: string } | null;
    onSlotChange: (day: number, time: string) => void;
    isLinked: boolean;
}

const days = [0, 1, 2, 3];

export function MapPanel({ selectedSlot, onSlotChange, isLinked }: MapPanelProps) {
    const { data, updateNotification } = useVenueData();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState(`day-${selectedSlot?.day ?? 0}`);
    const [notificationText, setNotificationText] = useState('');

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
        if (!data) return [];
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
        <Card className='lg:col-span-1'>
            <CardHeader>
                <CardTitle className="font-headline text-2xl font-semibold">지도 및 공지</CardTitle>
                <CardDescription>
                {isLinked ? 
                    '전역 시간대 설정과 연동된 지도입니다.' :
                    selectedSlot ? `독립적으로 ${selectedSlot.day}일차 ${selectedSlot.time}의 지도를 보고 있습니다.` : '시간대를 선택하여 지도를 확인하세요.'
                }
                </CardDescription>
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

                <VenueMap
                    allMarkers={data.markers}
                    allMaps={data.maps}
                    staff={data.staff}
                    schedule={data.schedule}
                    isDraggable={true}
                    selectedSlot={selectedSlot}
                    notification={data.notification}
                />
            </CardContent>
      </Card>
    );
}
