import { useState, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Armchair,
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  Search,
  ShieldCheck,
  Ticket,
  TrainFront,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getGetReservationByPnrQueryKey,
  getGetReservationsQueryKey,
  useBookReservation,
  useCancelReservation,
  useGetReservationByPnr,
  useGetReservations,
} from '@workspace/api-client-react';
import type { CancellationResult, Reservation } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function readableError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') return error.error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

function StatusPill({ status }: { status: Reservation['status'] }) {
  const confirmed = status === 'CONFIRMED';
  return (
    <span className={`status ${confirmed ? 'status-confirmed' : 'status-waiting'}`} data-testid={`status-${status.toLowerCase()}`}>
      {confirmed ? 'CONFIRMED' : 'WAITING'}
    </span>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const confirmed = reservation.status === 'CONFIRMED';
  return (
    <div className="ticket-result" data-testid={`reservation-${reservation.pnr}`}>
      <div className="ticket-top">
        <div className="ticket-name">{reservation.passengerName}</div>
        <StatusPill status={reservation.status} />
      </div>
      <div className="ticket-meta">
        <span>PNR <strong>{reservation.pnr}</strong></span>
        <span>Age <strong>{reservation.passengerAge}</strong></span>
        {confirmed
          ? <span>Seat <strong>{reservation.seatNumber ?? '—'}</strong></span>
          : <span>Queue <strong>#{reservation.queuePosition ?? '—'}</strong></span>}
      </div>
    </div>
  );
}

function PassengerRows({ passengers, waiting = false }: { passengers: Reservation[]; waiting?: boolean }) {
  if (!passengers.length) {
    return (
      <div className="empty-state" data-testid={waiting ? 'empty-waiting' : 'empty-confirmed'}>
        <div className="empty-icon">{waiting ? <Clock3 size={20} /> : <Armchair size={20} />}</div>
        <div className="empty-title">{waiting ? 'The queue is clear' : 'No passengers seated yet'}</div>
        <div className="empty-copy">{waiting ? 'New waitlisted bookings will line up here in order.' : 'Confirmed reservations will appear here once booked.'}</div>
      </div>
    );
  }
  return (
    <ul className={`passenger-list ${waiting ? 'waiting-list' : ''}`}>
      {passengers.map((person, index) => (
        <li className="passenger-row" key={person.pnr} data-testid={`passenger-${person.pnr}`}>
          <div className="seat-index">{waiting ? String(person.queuePosition ?? index + 1).padStart(2, '0') : <Check size={14} />}</div>
          <div>
            <div className="person-name">{person.passengerName}</div>
            <div className="person-sub">Age {person.passengerAge} <span aria-hidden="true">·</span> <span className="pnr">{person.pnr}</span></div>
          </div>
          <div className="row-end">
            {waiting
              ? <span className="queue-tag">WAIT #{person.queuePosition ?? index + 1}</span>
              : <span className="seat-number">SEAT {person.seatNumber ?? '—'}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LoadingRows() {
  return <div className="loading-skeleton" aria-label="Loading passengers"><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line" /></div>;
}

function PassengerPanel({ waiting, passengers, loading, error, retry }: {
  waiting?: boolean;
  passengers?: Reservation[];
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  const title = waiting ? 'Waiting queue' : 'Confirmed passengers';
  const count = passengers?.length ?? 0;
  return (
    <section className="panel" data-testid={waiting ? 'panel-waiting' : 'panel-confirmed'}>
      <div className="panel-head list-head">
        <div>
          <h2 className="panel-title"><span className="panel-icon">{waiting ? <Clock3 size={16} /> : <Armchair size={16} />}</span>{title}</h2>
          <p className="panel-subtitle">{waiting ? 'First in line is next to get a seat.' : 'Seats assigned in reservation order.'}</p>
        </div>
        {!loading && !error && <span className="count-pill" data-testid={waiting ? 'count-waiting' : 'count-confirmed'}>{count} {count === 1 ? 'passenger' : 'passengers'}</span>}
      </div>
      {loading
        ? <LoadingRows />
        : error
          ? <div className="error-state" role="alert"><span>{readableError(error, 'Could not load the passenger list.')}</span><button className="refresh" onClick={retry} data-testid={`button-retry-${waiting ? 'waiting' : 'confirmed'}`}>Retry</button></div>
          : <PassengerRows passengers={passengers ?? []} waiting={waiting} />}
      {waiting && !loading && !error && !!passengers?.length && (
        <div className="fifo-note"><ArrowDown size={14} /><span><strong>FIFO queue:</strong> first booked, first considered. When a seat opens, the passenger at the top is promoted.</span></div>
      )}
    </section>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const boardQuery = useGetReservations();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [submittedPnr, setSubmittedPnr] = useState('');
  const [cancelTarget, setCancelTarget] = useState('');
  const [bookingResult, setBookingResult] = useState<Reservation | null>(null);
  const [cancelResult, setCancelResult] = useState<CancellationResult | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [cancelError, setCancelError] = useState('');

  const normalizedPnr = submittedPnr.trim().toUpperCase();
  const searchQuery = useGetReservationByPnr(normalizedPnr, {
    query: {
      enabled: !!normalizedPnr,
      queryKey: getGetReservationByPnrQueryKey(normalizedPnr),
      retry: false,
    },
  });
  const bookMutation = useBookReservation();
  const cancelMutation = useCancelReservation();
  const board = boardQuery.data;

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingError('');
    setBookingResult(null);
    bookMutation.mutate({ data: { passengerName: name.trim(), passengerAge: Number(age) } }, {
      onSuccess: (reservation) => {
        setBookingResult(reservation);
        setName('');
        setAge('');
        void queryClient.invalidateQueries({ queryKey: getGetReservationsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetReservationByPnrQueryKey(reservation.pnr) });
      },
      onError: (error) => setBookingError(readableError(error, 'We could not complete this reservation. Please try again.')),
    });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPnr = searchInput.trim().toUpperCase();
    if (!nextPnr) return;
    setSubmittedPnr(nextPnr);
    setCancelResult(null);
    setCancelError('');
    void queryClient.invalidateQueries({ queryKey: getGetReservationByPnrQueryKey(nextPnr) });
  };

  const cancelReservation = () => {
    if (!cancelTarget) return;
    const pnr = cancelTarget;
    setCancelError('');
    cancelMutation.mutate({ pnr }, {
      onSuccess: (result) => {
        setCancelTarget('');
        setCancelResult(result);
        setSubmittedPnr('');
        setSearchInput('');
        void queryClient.invalidateQueries({ queryKey: getGetReservationsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetReservationByPnrQueryKey(pnr) });
      },
      onError: (error) => {
        setCancelTarget('');
        setCancelError(readableError(error, 'Cancellation could not be completed. Please try again.'));
      },
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Railway Desk home">
          <span className="brand-mark"><TrainFront size={20} strokeWidth={2.1} /></span>
          <span><span className="brand-name">Railway Desk</span><span className="brand-caption">Reservation system</span></span>
        </a>
        <div className="top-note"><span className="live-dot" /><Activity size={14} /><span>Reservation board · live data</span></div>
      </header>

      <main className="main-wrap">
        <section className="hero">
          <div>
            <div className="eyebrow"><TrainFront size={14} /> PASSENGER SERVICES <ArrowRight size={12} /></div>
            <h1>Your journey<br />starts here.</h1>
            <p>Book a seat, find a reservation, or follow the waiting line. A simple desk for every passenger.</p>
          </div>
          <div className="service-chip"><ShieldCheck size={15} /><span>Connected to the Java reservation API</span></div>
        </section>

        <section className="metrics" aria-label="Reservation capacity">
          <div className="metric primary-metric">
            <div><div className="metric-label">Seats available</div><div className="metric-value" data-testid="value-seats-available">{boardQuery.isLoading ? '—' : board?.seatsAvailable ?? '—'} <span className="metric-unit">of {board?.capacity ?? '—'}</span></div></div>
            <div className="metric-icon"><Armchair size={17} /></div>
          </div>
          <div className="metric">
            <div><div className="metric-label">Confirmed</div><div className="metric-value" data-testid="value-confirmed-count">{boardQuery.isLoading ? '—' : board?.confirmedCount ?? '—'}</div></div>
            <div className="metric-icon"><Check size={17} /></div>
          </div>
          <div className="metric">
            <div><div className="metric-label">In waiting queue</div><div className="metric-value" data-testid="value-waiting-count">{boardQuery.isLoading ? '—' : board?.waitingCount ?? '—'}</div></div>
            <div className="metric-icon"><UsersRound size={17} /></div>
          </div>
        </section>

        {boardQuery.isError && (
          <div className="error-state" role="alert" data-testid="error-board">
            <span>{readableError(boardQuery.error, 'The reservation board could not be reached.')}</span>
            <button className="refresh" onClick={() => void boardQuery.refetch()} data-testid="button-retry-board">Retry board</button>
          </div>
        )}

        {bookingResult && (
          <div className="toast-result" role="status" data-testid="result-booking">
            <strong>Reservation booked</strong>
            {bookingResult.passengerName} {bookingResult.status === 'CONFIRMED'
              ? `has confirmed seat ${bookingResult.seatNumber ?? '—'}.`
              : `has joined the waiting queue at position ${bookingResult.queuePosition ?? '—'}.`}
            <span> PNR: <b>{bookingResult.pnr}</b></span>
          </div>
        )}
        {cancelResult && (
          <div className="toast-result" role="status" data-testid="result-cancellation">
            <strong>Cancellation complete</strong>
            {cancelResult.message}
            {cancelResult.promotedPassenger && <div><b>{cancelResult.promotedPassenger.passengerName}</b> has been promoted to confirmed seat {cancelResult.promotedPassenger.seatNumber ?? '—'}.</div>}
          </div>
        )}
        {cancelError && <div className="inline-alert alert-error" role="alert" data-testid="error-cancellation">{cancelError}</div>}

        <div className="content-grid">
          <div className="left-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title"><span className="panel-icon"><Ticket size={16} /></span>Book a ticket</h2>
                  <p className="panel-subtitle">Passenger details take just a moment.</p>
                </div>
              </div>
              <div className="panel-body">
                <form onSubmit={submitBooking} data-testid="form-booking">
                  <div className="form-row">
                    <div>
                      <label className="field-label" htmlFor="passenger-name">Passenger name</label>
                      <input id="passenger-name" className="field" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required placeholder="e.g. Asha Mehta" autoComplete="name" data-testid="input-passenger-name" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="passenger-age">Age</label>
                      <input id="passenger-age" className="field" type="number" value={age} onChange={(event) => setAge(event.target.value)} min={1} max={120} required placeholder="Age" data-testid="input-passenger-age" />
                    </div>
                  </div>
                  <button className="button button-primary" type="submit" disabled={bookMutation.isPending} data-testid="button-book">
                    {bookMutation.isPending ? <><LoaderCircle size={15} className="animate-spin" /> Booking…</> : <>Reserve a seat <ArrowRight size={15} /></>}
                  </button>
                  {bookingError && <div className="inline-alert alert-error" role="alert" data-testid="error-booking">{bookingError}</div>}
                  <p className="form-note">If all seats are taken, we’ll place this booking at the end of the waiting queue.</p>
                </form>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title"><span className="panel-icon"><Search size={16} /></span>Find a booking</h2>
                  <p className="panel-subtitle">Enter the PNR printed on your ticket.</p>
                </div>
              </div>
              <div className="panel-body">
                <form className="search-wrap" onSubmit={submitSearch} data-testid="form-search">
                  <input className="field" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Enter PNR" aria-label="Reservation PNR" required data-testid="input-pnr" />
                  <button className="button button-secondary" type="submit" disabled={searchQuery.isFetching && normalizedPnr === searchInput.trim().toUpperCase()} data-testid="button-search">
                    {searchQuery.isFetching && normalizedPnr === searchInput.trim().toUpperCase() ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} Find
                  </button>
                </form>
                {normalizedPnr && searchQuery.isFetching && <div className="form-note" role="status" data-testid="status-searching">Looking up reservation…</div>}
                {normalizedPnr && searchQuery.isError && (
                  <div className="inline-alert alert-error" role="alert" data-testid="error-search">{readableError(searchQuery.error, 'No reservation was found for this PNR.')}</div>
                )}
                {normalizedPnr && searchQuery.data && <ReservationCard reservation={searchQuery.data} />}
                {normalizedPnr && searchQuery.data && (
                  <div className="result-cancel-row">
                    <span>Need to change plans?</span>
                    <button className="button button-danger button-small" onClick={() => setCancelTarget(searchQuery.data!.pnr)} data-testid="button-cancel-reservation"><X size={13} /> Cancel booking</button>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="right-stack">
            <PassengerPanel passengers={board?.confirmed} loading={boardQuery.isLoading} error={boardQuery.isError ? boardQuery.error : null} retry={() => void boardQuery.refetch()} />
            <PassengerPanel waiting passengers={board?.waiting} loading={boardQuery.isLoading} error={boardQuery.isError ? boardQuery.error : null} retry={() => void boardQuery.refetch()} />
          </div>
        </div>

        <section className="how-it-works">
          <div className="how-copy">
            <h2 className="how-title">A fair, easy-to-follow queue.</h2>
            <p>Seats are assigned while available. Once full, each new booking joins the back of the line. Cancelled seats go to the first person waiting.</p>
          </div>
          <div className="steps" aria-label="How reservations work">
            <div className="step"><span className="step-number">01</span><span>Book in order</span></div>
            <div className="step"><span className="step-number">02</span><span>Queue FIFO</span></div>
            <div className="step"><span className="step-number">03</span><span>Promote next</span></div>
          </div>
        </section>
        <footer className="footer"><span>Railway Desk · Reservation board</span><span>Clear seats. Fair queues.</span></footer>
      </main>

      {cancelTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !cancelMutation.isPending) setCancelTarget(''); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title" data-testid="dialog-cancel">
            <h2 id="cancel-title">Cancel this reservation?</h2>
            <p>This will cancel PNR <strong>{cancelTarget}</strong>. If a seat becomes available, the first passenger in the FIFO queue may be promoted.</p>
            {cancelError && <div className="inline-alert alert-error" role="alert">{cancelError}</div>}
            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setCancelTarget('')} disabled={cancelMutation.isPending} data-testid="button-keep-reservation">Keep booking</button>
              <button className="button button-danger" onClick={cancelReservation} disabled={cancelMutation.isPending} data-testid="button-confirm-cancel">
                {cancelMutation.isPending ? <><LoaderCircle size={14} className="animate-spin" /> Cancelling…</> : <>Confirm cancellation <X size={14} /></>}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
