"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember, MapMarker } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['Security', 'Medical', 'Operations', 'Info']),
});

export function StaffPanel() {
  const { data, updateData } = useVenueData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      role: 'Operations',
    },
  });

  const handleDialogOpen = (staff: StaffMember | null = null) => {
    setEditingStaff(staff);
    if (staff) {
      form.reset({ name: staff.name, role: staff.role });
    } else {
      form.reset({ name: '', role: 'Operations' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof staffSchema>) => {
    if (editingStaff) {
      // Edit existing staff
      const updatedStaffList = data.staff.map((s) =>
        s.id === editingStaff.id ? { ...s, ...values } : s
      );
      const updatedMarkers = data.markers.map(m => m.staffId === editingStaff.id ? {...m, label: values.name} : m)
      updateData({ ...data, staff: updatedStaffList, markers: updatedMarkers });
    } else {
      // Add new staff
      const newId = `staff-${Date.now()}`;
      const newStaff: StaffMember = {
        id: newId,
        ...values,
        avatar: `avatar-${(data.staff.length % 5) + 1}`,
      };
      
      const newMarker: MapMarker = {
        id: `marker-${Date.now()}`,
        staffId: newId,
        type: 'staff',
        label: newStaff.name,
        x: Math.round(Math.random() * 80) + 10,
        y: Math.round(Math.random() * 80) + 10,
      }
      
      updateData({ ...data, staff: [...data.staff, newStaff], markers: [...data.markers, newMarker] });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteConfirmation = (staff: StaffMember) => {
    setStaffToDelete(staff);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!staffToDelete) return;
    const updatedStaff = data.staff.filter((s) => s.id !== staffToDelete.id);
    const updatedMarkers = data.markers.filter(m => m.staffId !== staffToDelete.id);
    updateData({ ...data, staff: updatedStaff, markers: updatedMarkers });
    setIsAlertOpen(false);
    setStaffToDelete(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-headline font-semibold">Manage Staff</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                 <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Security">Security</SelectItem>
                            <SelectItem value="Medical">Medical</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Info">Info</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {form.formState.errors.role && (
                  <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className='bg-card p-2 rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.staff.map((s) => {
             const avatarImage = PlaceHolderImages.find(p => p.id === s.avatar);
            return (
                <TableRow key={s.id}>
                    <TableCell>
                        <Avatar>
                            {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={s.name} data-ai-hint={avatarImage.imageHint} />}
                            <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.role}</TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(s)}>
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteConfirmation(s)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {staffToDelete?.name} and remove them from the map.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
