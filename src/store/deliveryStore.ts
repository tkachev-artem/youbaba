import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Coordinates, DeliveryResult } from '../lib/deliveryService';

export interface DeliveryState {
  address: string;
  coordinates: Coordinates | null;
  deliveryInfo: DeliveryResult | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setAddress: (address: string) => void;
  setCoordinates: (coords: Coordinates | null) => void;
  setDeliveryInfo: (info: DeliveryResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearDelivery: () => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      address: '',
      coordinates: null,
      deliveryInfo: null,
      isLoading: false,
      error: null,

      setAddress: (address) => set({ address }),
      
      setCoordinates: (coords) => set({ coordinates: coords }),
      
      setDeliveryInfo: (info) => set({ deliveryInfo: info }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearDelivery: () => set({
        address: '',
        coordinates: null,
        deliveryInfo: null,
        error: null
      })
    }),
    {
      name: 'delivery-storage',
      // Сохраняем только адрес и информацию о доставке
      partialize: (state) => ({
        address: state.address,
        coordinates: state.coordinates,
        deliveryInfo: state.deliveryInfo
      })
    }
  )
);
