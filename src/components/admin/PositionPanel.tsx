
"use client";

import { useState } from 'react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Position } from '@/lib/types';
import { Plus, Edit, Trash2, Palette, GripVertical } from 'lucide-react';
import { useDrag } from 'react-dnd';

const ItemTypes = {
    POSITION: 'position',
}

const PositionBadge = ({ position }: { position: Position }) => {
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: ItemTypes.POSITION,
        item: position,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div 
            ref={drag}
            className="flex items-center gap-2 p-2 rounded-lg border bg-card cursor-grab active:cursor-grabbing"
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: position.color }} />
            <span className="font-medium text-sm">{position.name}</span>
        </div>
    );
};


export function PositionPanel() {
    const { data, addPosition, updatePosition, deletePosition } = useVenueData();
    const { toast } = useToast();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);
    const [positionName, setPositionName] = useState('');
    const [positionColor, setPositionColor] = useState('#3b82f6');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);

    const handleOpenModal = (position: Position | null) => {
        setEditingPosition(position);
        if (position) {
            setPositionName(position.name);
            setPositionColor(position.color);
        } else {
            setPositionName('');
            setPositionColor(`#${Math.floor(Math.random()*16777215).toString(16).padEnd(6, '0')}`);
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!positionName.trim()) {
            toast({ variant: 'destructive', title: '포지션 이름을 입력해주세요.' });
            return;
        }

        if (editingPosition) {
            updatePosition(editingPosition.id, { name: positionName, color: positionColor });
            toast({ title: '성공', description: '포지션이 수정되었습니다.' });
        } else {
            addPosition(positionName, positionColor);
            toast({ title: '성공', description: '새 포지션이 생성되었습니다.' });
        }

        setIsModalOpen(false);
        setEditingPosition(null);
    };
    
    const handleDeleteConfirm = (position: Position) => {
        setPositionToDelete(position);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = () => {
        if (positionToDelete) {
            deletePosition(positionToDelete.id);
            toast({ title: '삭제 완료', description: `'${positionToDelete.name}' 포지션이 삭제되었습니다.` });
        }
        setIsDeleteDialogOpen(false);
        setPositionToDelete(null);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl font-semibold">포지션 관리</CardTitle>
                    <CardDescription>
                        총 <Badge variant="secondary">{data.positions.length}</Badge>개의 포지션. 드래그해서 할당하세요.
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(null)}>
                    <Plus className="mr-2 h-4 w-4"/>포지션 생성
                </Button>
            </CardHeader>
            <CardContent>
                {data.positions.length > 0 ? (
                    <div className="space-y-2">
                        {data.positions.map(pos => (
                             <div key={pos.id} className="flex items-center justify-between p-1 rounded-md hover:bg-muted/50">
                                <PositionBadge position={pos} />
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(pos)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirm(pos)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <p>생성된 포지션이 없습니다.</p>
                    </div>
                )}
            </CardContent>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPosition ? '포지션 수정' : '새 포지션 생성'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pos-name" className="text-right">이름</Label>
                            <Input
                                id="pos-name"
                                value={positionName}
                                onChange={(e) => setPositionName(e.target.value)}
                                className="col-span-3"
                                placeholder="예: 무대 A 좌측"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="pos-color" className="text-right">색상</Label>
                             <div className="col-span-3 flex items-center gap-2">
                                <Palette className="h-5 w-5 text-muted-foreground"/>
                                <Input
                                    id="pos-color"
                                    type="color"
                                    value={positionColor}
                                    onChange={(e) => setPositionColor(e.target.value)}
                                    className="p-1 h-10 w-14"
                                />
                                <Input
                                    value={positionColor}
                                    onChange={(e) => setPositionColor(e.target.value)}
                                    placeholder="#RRGGBB"
                                    className="flex-1"
                                />
                             </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>취소</Button>
                        <Button onClick={handleSave}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>정말로 삭제하시겠습니까?</DialogTitle>
                        <DialogDescription>
                            이 작업은 되돌릴 수 없습니다. 이 포지션을 할당받은 모든 스태프에게서 포지션 정보가 제거됩니다.
                        </DialogDescription>
                    </DialogHeader>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>취소</Button>
                        <Button variant="destructive" onClick={handleDelete}>삭제</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
