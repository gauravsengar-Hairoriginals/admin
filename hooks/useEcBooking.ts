/**
 * useEcBooking — Isolated DINGG EC booking logic
 *
 * All DINGG booking state and API calls live here.
 * To swap the booking provider, only edit this file.
 *
 * Usage:
 *   const booking = useEcBooking();
 *   // when ready: booking.submitBooking(leadId, customerId)
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface DinggServiceItem {
    id: number;
    name: string;
    duration: number;  // minutes
    price: number;
}

export interface DinggSlot {
    date: string;       // YYYY-MM-DD
    startTime: number;  // minutes from midnight
    endTime: number;
    label: string;      // "10:00 AM"
    staffUuid?: string;
}

export interface EcBookingResult {
    success: boolean;
    message: string;
    orderId?: string;
}

function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

export function useEcBooking() {
    // ── Selection state ───────────────────────────────────────────────
    const [ecId,         setEcId]         = useState<string>('');
    const [serviceId,    setServiceId]    = useState<number | null>(null);
    const [serviceName,  setServiceName]  = useState<string>('');
    const [bookingDate,  setBookingDate]  = useState<string>(todayStr());
    const [slot,         setSlot]         = useState<DinggSlot | null>(null);

    // ── Fetched data ──────────────────────────────────────────────────
    const [services,       setServices]       = useState<DinggServiceItem[]>([]);
    const [slots,          setSlots]          = useState<DinggSlot[]>([]);

    // ── Loading flags ─────────────────────────────────────────────────
    const [loadingServices, setLoadingServices] = useState(false);
    const [loadingSlots,    setLoadingSlots]    = useState(false);
    const [bookingLoading,  setBookingLoading]  = useState(false);

    // ── Result ────────────────────────────────────────────────────────
    const [bookingResult, setBookingResult] = useState<EcBookingResult | null>(null);

    // ── Fetch services when EC changes ────────────────────────────────
    useEffect(() => {
        if (!ecId) {
            setServices([]);
            setServiceId(null);
            setServiceName('');
            setSlots([]);
            setSlot(null);
            return;
        }

        let cancelled = false;
        setLoadingServices(true);
        setServices([]);

        api.get(`/dingg/${ecId}/services`)
            .then(res => { if (!cancelled) setServices(res.data ?? []); })
            .catch(err => console.warn('[useEcBooking] services:', err?.message))
            .finally(() => { if (!cancelled) setLoadingServices(false); });

        return () => { cancelled = true; };
    }, [ecId]);

    // ── Fetch slots when EC + date + service changes ──────────────────
    const fetchSlots = useCallback(async () => {
        if (!ecId || !bookingDate) return;

        setLoadingSlots(true);
        setSlots([]);
        setSlot(null);

        try {
            const params: Record<string, string> = {
                from: bookingDate,
                to:   bookingDate,
            };
            if (serviceId) params.serviceIds = String(serviceId);

            const res = await api.get(`/dingg/${ecId}/slots`, { params });
            setSlots(res.data ?? []);
        } catch (err: any) {
            console.warn('[useEcBooking] slots:', err?.message);
            setSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [ecId, bookingDate, serviceId]);

    useEffect(() => { fetchSlots(); }, [fetchSlots]);

    // ── Submit booking ────────────────────────────────────────────────
    const submitBooking = async (
        leadId: string,
        customerId: string,
    ): Promise<EcBookingResult> => {
        if (!ecId || !slot || serviceId === null) {
            return { success: false, message: 'Please select an EC, service, and time slot' };
        }

        setBookingLoading(true);
        setBookingResult(null);

        try {
            const res = await api.post(`/dingg/${ecId}/book`, {
                leadId,
                customerId,
                serviceId,
                serviceName,
                bookingDate: slot.date,
                startTime:   slot.startTime,
                endTime:     slot.endTime,
                total:       0,  // billing amount filled by DINGG on arrival
                staffUuid:   slot.staffUuid,
            });

            const result: EcBookingResult = {
                success:  true,
                message:  `Appointment booked for ${slot.label}`,
                orderId:  res.data?.id,
            };
            setBookingResult(result);
            return result;
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Booking failed — please try again';
            const result: EcBookingResult = { success: false, message: msg };
            setBookingResult(result);
            return result;
        } finally {
            setBookingLoading(false);
        }
    };

    // ── Reset (call when modal closes or lead changes) ────────────────
    const reset = () => {
        setEcId('');
        setServiceId(null);
        setServiceName('');
        setBookingDate(todayStr());
        setSlot(null);
        setServices([]);
        setSlots([]);
        setBookingResult(null);
    };

    // ── Validation ────────────────────────────────────────────────────
    /** True when all required fields are filled for submitting */
    const isValid = !!ecId && slot !== null;

    return {
        // Selection state
        ecId,        setEcId,
        serviceId,   setServiceId,
        serviceName, setServiceName,
        bookingDate, setBookingDate,
        slot,        setSlot,

        // Fetched data
        services,
        slots,

        // Loading
        loadingServices,
        loadingSlots,
        bookingLoading,

        // Result
        bookingResult,

        // Actions
        fetchSlots,
        submitBooking,
        reset,

        // Validation
        isValid,
    };
}
