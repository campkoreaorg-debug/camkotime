
"use client";

import { useEffect, useRef, useCallback } from 'react';

const channels: { [key: string]: BroadcastChannel } = {};

export const useBroadcastChannel = (channelName: string, onMessage?: (message: any) => void) => {
  const channelRef = useRef<BroadcastChannel>();

  useEffect(() => {
    if (!channels[channelName]) {
      channels[channelName] = new BroadcastChannel(channelName);
    }
    channelRef.current = channels[channelName];

    const handleMessage = (event: MessageEvent) => {
      if (onMessage) {
        onMessage(event.data);
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      channelRef.current?.removeEventListener('message', handleMessage);
      // You might not want to close the channel on unmount
      // if other components/tabs are still using it.
      // A more robust solution might involve reference counting.
    };
  }, [channelName, onMessage]);

  const postMessage = useCallback((message: any) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { postMessage };
};
