import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { Booking } from "./generated/api.schemas";

export const useGetAllCustomerBookings = (
  phone: string,
  options?: { query?: UseQueryOptions<Booking[], Error, Booking[]> }
) => {
  return useQuery<Booking[], Error, Booking[]>({
    queryKey: ["customerBookings", phone],
    queryFn: () => customFetch<Booking[]>(`/api/customer/bookings/all`),
    ...options?.query,
  });
};

export const useCancelCustomerBooking = (
  options?: { mutation?: UseMutationOptions<Booking, Error, { bookingId: number }> }
) => {
  return useMutation<Booking, Error, { bookingId: number }>({
    mutationKey: ["cancelCustomerBooking"],
    mutationFn: ({ bookingId }) => 
      customFetch<Booking>(`/api/customer/bookings/${bookingId}/cancel`, { method: "POST" }),
    ...options?.mutation,
  });
};

export const useUndoNoShow = (
  options?: { mutation?: UseMutationOptions<Booking, Error, { slug: string, bookingId: number }> }
) => {
  return useMutation<Booking, Error, { slug: string, bookingId: number }>({
    mutationKey: ["undoNoShow"],
    mutationFn: ({ slug, bookingId }) => 
      customFetch<Booking>(`/api/shops/${slug}/bookings/${bookingId}/undo-no-show`, { method: "POST" }),
    ...options?.mutation,
  });
};
