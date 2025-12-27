
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useVenueData } from '@/hooks/use-venue-data';
import type { ScheduleItem, StaffMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import VenueMap from '../VenueMap';
import { Button } from '../ui/button';
import { timeSlots } from './SchedulePanel';

interface MapPanelProps {
    selectedSlot: { day: number, time: string } | null;
    onSlotChange: (day: number, time: string) => void;
    isLinked: boolean;
}

const days = [0, 1, 2, 3];

export function MapPanel({ selectedSlot, onSlotChange, isLinked }: MapPanelProps) {
    const { data } = useVenueData();
    const [activeTab, setActiveTab] = useState('day-0');

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        const newDay = parseInt(newTab.split('-')[1], 10);
        if (timeSlots.length > 0) {
          onSlotChange(newDay, timeSlots[0]);
        }
    };
    
    useEffect(() => {
      const currentDay = parseInt(activeTab.split('-')[1], 10);
      if (!selectedSlot || selectedSlot.day !== currentDay) {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();
          
          let timeString: string;
          if (minutes < 30) {
            timeString = `${String(hours).padStart(2, '0')}:00`;
          } else {
            timeString = `${String(hours).padStart(2, '0')}:30`;
          }
  
          if (timeSlots.includes(timeString)) {
            onSlotChange(currentDay, timeString);
          } else if (timeSlots.length > 0) {
            onSlotChange(currentDay, timeSlots[0]);
          }
      }
    }, [activeTab, selectedSlot, onSlotChange]);

    const currentDaySchedules = useMemo(() => {
        const day = selectedSlot?.day ?? parseInt(activeTab.split('-')[1], 10);
        return data.schedule.filter(s => s.day === day).reduce((acc, item) => {
            if (!acc[item.time]) {
                acc[item.time] = [];
            }
            acc[item.time].push(item);
            return acc;
        }, {} as Record<string, ScheduleItem[]>);
    }, [selectedSlot, data.schedule, activeTab]);
    
    const handleSelectSlot = (day: number, time: string) => {
        onSlotChange(day, time);
    }

    return (
        <Card className='lg:col-span-1'>
            <CardHeader>
                <CardTitle className="font-headline text-2xl font-semibold">지도</CardTitle>
                <CardDescription>
                {isLinked ? 
                    '스케줄과 연동된 시간대의 지도입니다. 연동을 해제하면 독립적으로 볼 수 있습니다.' :
                    selectedSlot ? `${selectedSlot.day}일차 ${selectedSlot.time}의 지도입니다. 스태프를 드래그하여 위치를 옮기세요.` : '시간대를 선택하여 지도를 확인하세요.'
                }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!isLinked && (
                    <div className="flex flex-wrap gap-2 pb-4 border-b mb-4">
                        {timeSlots.map(time => {
                          const day = selectedSlot?.day ?? parseInt(activeTab.split('-')[1], 10);
                          const items = currentDaySchedules[time] || [];
                          const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                          return (
                            <Button 
                                key={time} 
                                variant={isSelected ? "default" : (items.length > 0 ? "secondary" : "outline")}
                                className="flex-shrink-0 text-xs h-8"
                                onClick={() => handleSelectSlot(day, time)}
                            >
                               {time}
                               {items.length > 0 && <span className="ml-2 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">{items.length}</span>}
                            </Button>
                          )
                        })}
                    </div>
                )}
                <VenueMap
                    allMarkers={data.markers}
                    allMaps={data.maps}
                    staff={data.staff}
                    schedule={data.schedule}
                    isDraggable={true}
                    selectedSlot={selectedSlot}
                />
            </CardContent>
      </Card>
    );
}
