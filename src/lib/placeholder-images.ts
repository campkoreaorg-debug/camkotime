import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// We need to check if we are in a browser environment before accessing the data,
// because this file is now imported in `lib/data.ts` which is used by server components.
const getImagePlaceholders = (): ImagePlaceholder[] => {
    if (typeof window !== 'undefined') {
        return data.placeholderImages;
    }
    return [];
}


export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
