# Railway Ticket Reservation System

A beginner-friendly college Data Structures project. The website uses a Java Spring Boot backend to book and cancel railway tickets, generate PNRs, allocate five seats, search reservations, and promote people from a FIFO waiting list.

## Run in Replit

Start the **API Server** and **Railway Ticket Reservation** workflows. The website calls the Java API through the `/api` route.

To run the backend manually in a Replit Shell:

```bash
cd artifacts/api-server
mvn -f java/pom.xml spring-boot:run
```

Use the managed **Railway Ticket Reservation** workflow for the website. It supplies the preview routing settings needed by Vite. You need Java 17 or later and Maven to run the backend; the Replit project includes this toolchain.

## Try the data structures

1. Book five passengers. Each receives a unique PNR and a confirmed seat numbered 1–5.
2. Book a sixth passenger. The ticket is added to the waiting queue with position 1.
3. Book more passengers to see the queue grow in order.
4. Cancel a confirmed ticket by its PNR. The first passenger in the queue is automatically confirmed in the freed seat.
5. Search for any PNR to see the passenger's current status, seat, or queue position.
6. Cancel a waiting-list ticket to see the remaining queue positions update.

## How the data structures work

- **`ArrayList<Reservation>` — confirmed passengers:** stores the current confirmed tickets. A seat is assigned by checking seat numbers 1 through 5 and choosing the first free one.
- **`Queue<Reservation>` backed by `ArrayDeque` — waiting list:** new passengers join at the back with `offer()`. When a confirmed passenger cancels, `poll()` removes the person at the front, who receives the freed seat.
- **`HashSet<String>` — issued PNRs:** prevents a PNR from being reused, even after its ticket is cancelled.
- **PNR search:** checks the confirmed list and waiting queue. This linear search is easy to trace and discuss in a data-structures presentation.
- **Synchronization:** reservation operations run one at a time so two requests cannot claim the same seat.

## API

The Spring Boot API is in `artifacts/api-server/java/`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/healthz` | Check that the Java API is running |
| `GET` | `/api/reservations` | Read seats, confirmed passengers, and the waiting queue |
| `POST` | `/api/reservations` | Book using `passengerName` and `passengerAge` |
| `GET` | `/api/reservations/{pnr}` | Search for a ticket by PNR |
| `DELETE` | `/api/reservations/{pnr}` | Cancel a ticket and promote the next passenger if possible |

The API contract is documented in `lib/api-spec/openapi.yaml`. The React website uses generated API hooks; reservation rules and state changes are implemented in Java.

## Data lifetime

This learning project stores reservations in memory so the collection and queue operations stay visible and easy to explain. Booking data is cleared when the Java server restarts; no database is required.
