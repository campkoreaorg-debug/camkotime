"use client";

import { useState, useEffect, useCallback } from 'react';
import type { VenueData } from '@/lib/types';
import { initialData } from '@/lib/data';

const STORAGE_KEY = 'venueSyncData';

// Function to safely get data from localStorage
const getStoredData = (): VenueData => {
  if (typeof window === 'undefined') {
    return initialData;
  }
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : initialData;
  } catch (error) {
    console.warn(`Error reading localStorage key “${STORAGE_KEY}”:`, error);
    return initialData;
  }
};

export const useVenueData = () => {
  const [data, setData] = useState<VenueData>(getStoredData);

  // Effect to sync state from localStorage changes (e.g., in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsedData = JSON.parse(e.newValue);
          // Only update if data is different to avoid loops
          // A simple JSON.stringify comparison is good enough for this app's data structure
          if (JSON.stringify(parsedData) !== JSON.stringify(data)) {
            setData(parsedData);
          }
        } catch (error) {
          console.warn(`Error parsing localStorage key “${STORAGE_KEY}”:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [data]);

  // Effect to ensure initial state is from localStorage on mount
  useEffect(() => {
    setData(getStoredData());
  }, []);

  const updateData = useCallback((newData: VenueData) => {
    try {
      const jsonValue = JSON.stringify(newData);
      // Check if data has actually changed before setting it
      const currentData = window.localStorage.getItem(STORAGE_KEY);
      if (jsonValue !== currentData) {
        window.localStorage.setItem(STORAGE_KEY, jsonValue);
        setData(newData); // Update state in current tab
        
        // Manually dispatch a storage event to notify other components/tabs
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: jsonValue,
            oldValue: currentData,
            storageArea: window.localStorage,
          })
        );
      }
    } catch (error) {
      console.error(`Error setting localStorage key “${STORAGE_KEY}”:`, error);
    }
  }, []);

  return { data, updateData };
};
