package com.college.railway.model;

public record Reservation(
        String pnr,
        String passengerName,
        int passengerAge,
        ReservationStatus status,
        Integer seatNumber,
        Integer queuePosition
) {
}
