package com.college.railway.service;

public class ReservationNotFoundException extends RuntimeException {
    public ReservationNotFoundException(String pnr) {
        super("No ticket was found with PNR " + pnr + ".");
    }
}
