
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVenueData } from '@/hooks/use-venue-data';
import type { ScheduleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import VenueMap from '../VenueMap';
import { Button } from '../ui/button';
import { timeSlots } from '@/hooks/use-venue-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Megaphone, MousePointerSquareDashed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDrop } from 'react-dnd';
import { ItemTypes } from './StaffPanel';

interface MapPanelProps {
    selectedSlot: { day: number, time: string } | null;
    onSlotChange: (day: number, time: string) => void;
    isLinked: boolean;
}

const days = [0, 1, 2, 3];

export function MapPanel({ selectedSlot, onSlotChange, isLinked }: MapPanelProps) {
    const { data, updateNotification, addMarker, updateMarkerPosition, updateMapImage, deleteMarker } = useVenueData();
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

    if (!data) {
        return (
             <Card className='lg:col-span-1 h-full'>
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
            <CardContent ref={drop} className="space-y-4 flex-grow flex flex-col pt-6 relative">
                 {isOver && canDrop && (
                    <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center pointer-events-none z-10">
                        <MousePointerSquareDashed className="h-16 w-16 text-primary" />
                        <p className="mt-4 text-lg font-semibold text-primary">여기에 스태프를 놓아 지도에 추가하세요</p>
                    </div>
                )}
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

                <div ref={mapRef} className="flex-grow min-h-0">
                    <VenueMap
                        allMarkers={data.markers}
                        allMaps={data.maps}
                        staff={data.staff}
                        schedule={data.schedule}
                        isDraggable={true}
                        selectedSlot={selectedSlot}
                        notification={data.notification}
                        onMarkerMove={updateMarkerPosition}
                        onMarkerAdd={addMarker}
                        onMapImageUpdate={updateMapImage}
                        onMarkerDelete={deleteMarker}
                    />
                </div>
            </CardContent>
           
      
    );
}

    

    


    