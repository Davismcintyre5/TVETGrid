const { toICSDate } = require('./dateHelpers');
const { randomToken } = require('./generateToken');

function buildICS({ title, description, start, durationMin, location, organizerEmail, attendeeEmail }) {
  const uid = `${randomToken(8)}@tvetgrid`;
  const dtStart = toICSDate(start);
  const dtEnd = toICSDate(new Date(new Date(start).getTime() + durationMin * 60000));
  const dtStamp = toICSDate(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TVETGrid//Meetings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : null,
    location ? `LOCATION:${escapeICS(location)}` : null,
    organizerEmail ? `ORGANIZER;CN=TVETGrid:mailto:${organizerEmail}` : null,
    attendeeEmail ? `ATTENDEE;RSVP=TRUE:mailto:${attendeeEmail}` : null,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

function escapeICS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

module.exports = { buildICS };