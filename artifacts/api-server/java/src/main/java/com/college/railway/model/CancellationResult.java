package com.college.railway.model;

public record CancellationResult(
        String cancelledPnr,
        String cancelledPassengerName,
        Reservation promotedPassenger,
        String message
) {
}
