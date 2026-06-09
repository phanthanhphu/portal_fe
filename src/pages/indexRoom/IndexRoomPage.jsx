import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './IndexRoomPage.css';

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../../config';

import backgroundA from './assets/background3.JPG';
import backgroundB from './assets/background14.JPG';
import youngoneLogo from './assets/youngone-logo.png';

const BOOKING_API = `${API_BASE_URL}/api/room-bookings`;
const PAGE_SIZE = 8;
const PAGE_CHANGE_INTERVAL_MS = 10000;

const clockItems = [
  { city: 'SEOUL', timeZone: 'Asia/Seoul' },
  { city: 'HANOI', timeZone: 'Asia/Ho_Chi_Minh' },
  { city: 'HONGKONG', timeZone: 'Asia/Hong_Kong' },
  { city: 'SINGAPORE', timeZone: 'Asia/Singapore' },
  { city: 'SEATTLE', timeZone: 'America/Los_Angeles' },
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: '*/*',
  };
};

const pad2 = (value) => String(value).padStart(2, '0');

const formatDateOnly = (value) => {
  if (!value) return '-';

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }

  if (typeof value === 'string') {
    const pureDate = value.slice(0, 10);
    const parts = pureDate.split('-');

    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${pad2(day)}/${pad2(month)}/${year}`;
    }

    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const toDateTimeValue = (value) => {
  if (!value) return 0;

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const displayValue = (value) => {
  if (value === null || value === undefined) return '-';

  const text = String(value).trim();
  return text || '-';
};

const normalizeBookingRows = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      id: item.id,
      name: displayValue(item.title || item.peopleInCharge),
      checkInDateRaw: item.checkInDate,
      checkOutDateRaw: item.checkOutDate,
      checkInDate: formatDateOnly(item.checkInDate),
      checkOutDate: formatDateOnly(item.checkOutDate),
      basedLocation: displayValue(item.basedLocation),
      roomNo: displayValue(item.roomName || item.roomNo || item.roomId),
    }))
    .sort((a, b) => {
      const dateA = toDateTimeValue(a.checkInDateRaw);
      const dateB = toDateTimeValue(b.checkInDateRaw);

      if (dateA !== dateB) return dateA - dateB;

      return String(a.roomNo || '').localeCompare(String(b.roomNo || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
};

const getTimePartsByTimeZone = (timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date());

  const map = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    hour: Number(map.hour || 0),
    minute: Number(map.minute || 0),
    second: Number(map.second || 0),
  };
};

function AnalogClock({ city, timeZone }) {
  const [time, setTime] = useState(() => getTimePartsByTimeZone(timeZone));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTimePartsByTimeZone(timeZone));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeZone]);

  const hourAngle = ((time.hour % 12) * 30) + (time.minute * 0.5);
  const minuteAngle = (time.minute * 6) + (time.second * 0.1);
  const secondAngle = time.second * 6;

  const digital = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  const numbers = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);

  return (
    <div className="ir-clock-card">
      <div className="ir-clock">
        <div className="ir-clock-face">
          {numbers.map((num) => {
            const angle = num * 30;

            return (
              <span
                key={num}
                className="ir-clock-number"
                style={{
                  transform: `rotate(${angle}deg) translateY(-39px) rotate(-${angle}deg)`,
                }}
              >
                {num}
              </span>
            );
          })}

          <span className="ir-clock-center" />
          <span className="ir-hand ir-hour-hand" style={{ transform: `rotate(${hourAngle}deg)` }} />
          <span className="ir-hand ir-minute-hand" style={{ transform: `rotate(${minuteAngle}deg)` }} />
          <span className="ir-hand ir-second-hand" style={{ transform: `rotate(${secondAngle}deg)` }} />
        </div>
      </div>

      <div className="ir-city">{city}</div>
      <div className="ir-digital-time">{digital}</div>
    </div>
  );
}

export default function IndexRoomPage() {
  const [reservationRows, setReservationRows] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const realtimeRefreshRef = useRef(null);
  const socketRefreshingRef = useRef(false);

  const fetchRoomBookings = useCallback(async () => {
    setLoadingBookings(true);

    try {
      const response = await fetch(`${BOOKING_API}/index-room`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        let message = `Fetch Index Room bookings failed (${response.status})`;

        try {
          const errorData = await response.json();
          message = errorData?.message || message;
        } catch {
          // ignore json parse error
        }

        throw new Error(message);
      }

      const result = await response.json();
      const content = Array.isArray(result) ? result : (Array.isArray(result?.content) ? result.content : []);

      setReservationRows(normalizeBookingRows(content));
      setCurrentPage(0);
      setBookingError('');
    } catch (error) {
      console.error(error);
      setReservationRows([]);
      setBookingError(error?.message || 'Fetch Index Room bookings failed');
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const refreshBySocket = useCallback(async (event) => {
    const module = String(event?.module || 'ALL').toUpperCase();

    const shouldRefresh =
      module === 'ROOM' ||
      module === 'ROOMS' ||
      module === 'ROOM_BOOKING' ||
      module === 'ROOM_BOOKINGS' ||
      module === 'ALL';

    if (!shouldRefresh) return;

    await fetchRoomBookings();
  }, [fetchRoomBookings]);

  useEffect(() => {
    realtimeRefreshRef.current = refreshBySocket;
  }, [refreshBySocket]);

  useEffect(() => {
    fetchRoomBookings();

    // Backup refresh để phòng trường hợp socket mất kết nối.
    const timer = setInterval(fetchRoomBookings, 60000);

    return () => clearInterval(timer);
  }, [fetchRoomBookings]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        client.subscribe('/topic/app-events', async (message) => {
          let event = null;

          try {
            event = JSON.parse(message.body);
          } catch {
            event = { module: 'ALL', action: 'UPDATED', id: '' };
          }

          if (socketRefreshingRef.current) return;

          socketRefreshingRef.current = true;

          try {
            await realtimeRefreshRef.current?.(event);
          } finally {
            socketRefreshingRef.current = false;
          }
        });
      },

      onStompError: (frame) => {
        console.error('IndexRoom realtime STOMP error:', frame);
      },

      onWebSocketError: (error) => {
        console.error('IndexRoom realtime socket error:', error);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);


  const totalPages = useMemo(() => (
    Math.max(1, Math.ceil(reservationRows.length / PAGE_SIZE))
  ), [reservationRows.length]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (totalPages <= 1) return 0;
      return prev >= totalPages ? 0 : prev;
    });
  }, [totalPages]);

  useEffect(() => {
    if (totalPages <= 1) {
      setCurrentPage(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, PAGE_CHANGE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [totalPages]);

  const visibleRows = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE;

    return reservationRows
      .slice(startIndex, startIndex + PAGE_SIZE)
      .map((row, index) => ({
        ...row,
        displayNo: startIndex + index + 1,
      }));
  }, [reservationRows, currentPage]);

  return (
    <main className="index-room-page">
      <div
        className="ir-bg ir-bg-one"
        style={{ backgroundImage: `url(${backgroundA})` }}
      />
      <div
        className="ir-bg ir-bg-two"
        style={{ backgroundImage: `url(${backgroundB})` }}
      />
      <div className="ir-overlay" />
      <div className="ir-scanline" />

      <section className="ir-content">
        <header className="ir-header">
          <div className="ir-header-inner">
            <div className="ir-logo-card">
              <img src={youngoneLogo} alt="Youngone" className="ir-logo" />
            </div>

            <div className="ir-title-block">
              <div className="ir-title-eyebrow">Room Reservation Display</div>
              <h1>
                <span>Welcome to</span>
                <strong>Broadpeak Soc Trang</strong>
              </h1>
            </div>

            <div className="ir-status-card">
              <span className="ir-status-dot" />
              <span>Reserved</span>
            </div>
          </div>
        </header>

        <section className="ir-clock-row">
          {clockItems.map((item) => (
            <AnalogClock
              key={item.city}
              city={item.city}
              timeZone={item.timeZone}
            />
          ))}
        </section>

        <section className="ir-table-shell">
          <div className="ir-table-glow" />

          <table className="ir-reserved-table">
            <thead>
              <tr>
                <th className="ir-no-col">No.</th>
                <th className="ir-sort-mark">Name</th>
                <th>Check-in date</th>
                <th>Check-out date</th>
                <th>Based Location</th>
                <th>Room No.</th>
              </tr>
            </thead>

            <tbody>
              {loadingBookings && reservationRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>
                    Loading reserved rooms...
                  </td>
                </tr>
              ) : bookingError ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>
                    {bookingError}
                  </td>
                </tr>
              ) : reservationRows.length > 0 ? (
                visibleRows.map((row) => (
                  <tr key={row.id || `${row.name}-${row.roomNo}`}>
                    <td className="ir-no-col">{row.displayNo}</td>
                    <td>{row.name}</td>
                    <td>{row.checkInDate}</td>
                    <td>{row.checkOutDate}</td>
                    <td>{row.basedLocation}</td>
                    <td>{row.roomNo}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>
                    No selected room bookings
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {reservationRows.length > PAGE_SIZE && (
            <div className="ir-page-indicator">
              <span>Page {currentPage + 1}</span>
              <strong>/</strong>
              <span>{totalPages}</span>
              <small>{reservationRows.length} reservations</small>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
