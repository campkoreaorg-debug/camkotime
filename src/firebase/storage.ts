
'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from './index';

// Initialize Firebase and get storage instance
const { storage } = initializeFirebase();

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path where the file will be stored in Firebase Storage.
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  const storageRef = ref(storage, path);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    // You might want to handle different types of errors here
    // e.g., permissions errors, etc.
    throw error;
  }
};
