import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const pad2 = (value) => String(value).padStart(2, '0');

const sanitizeSheetText = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const toDateParts = (value) => {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return { year: Number(year), month: Number(month), day: Number(day) };
  }

  if (typeof value === 'string') {
    const parts = value.slice(0, 10).split('-').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      const [year, month, day] = parts;
      return { year, month, day };
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

const toTimeParts = (value) => {
  if (!value) return null;

  if (Array.isArray(value) && value.length >= 2) {
    const [hour, minute, second = 0] = value;
    return { hour: Number(hour), minute: Number(minute), second: Number(second) };
  }

  if (typeof value === 'string') {
    const parts = value.split(':').map(Number);
    return {
      hour: Number.isFinite(parts[0]) ? parts[0] : 0,
      minute: Number.isFinite(parts[1]) ? parts[1] : 0,
      second: Number.isFinite(parts[2]) ? parts[2] : 0,
    };
  }

  return null;
};

const toExcelDate = (dateValue, timeValue) => {
  const dateParts = toDateParts(dateValue);
  if (!dateParts) return null;

  const timeParts = toTimeParts(timeValue) || { hour: 0, minute: 0, second: 0 };

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second || 0
  );
};

const formatDateInput = (value) => {
  const parts = toDateParts(value);
  if (!parts) return '-';
  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
};

const formatTimeInput = (value) => {
  const parts = toTimeParts(value);
  if (!parts) return '--:--';
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
};

const formatDateTimeText = (dateValue, timeValue) => {
  const dateText = formatDateInput(dateValue);
  const timeText = formatTimeInput(timeValue);

  if (dateText === '-' && timeText === '--:--') return '-';
  if (timeText === '--:--') return dateText;
  return `${dateText} ${timeText}`;
};

const formatLocalDateTime = (value) => {
  if (!value) return '-';

  if (Array.isArray(value) && value.length >= 5) {
    const [year, month, day, hour, minute, second = 0] = value;
    return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const formatGeneratedAt = (value = new Date()) => {
  return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()} ${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
};

const buildFileName = () => {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    pad2(now.getMonth() + 1),
    pad2(now.getDate()),
    pad2(now.getHours()),
    pad2(now.getMinutes()),
  ].join('');

  return `Room_Booking_Report_${stamp}.xlsx`;
};

const setThinBorder = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };
};

const menuGreenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
const headerFill = menuGreenFill;
const titleFill = menuGreenFill;
const lightFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
const successFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };

const columns = [
  { header: 'No', key: 'no', width: 8 },
  { header: 'Name', key: 'title', width: 24 },
  { header: 'Room', key: 'room', width: 22 },
  { header: 'Check-in Date', key: 'checkInDate', width: 16 },
  { header: 'Check-in Time', key: 'checkInTime', width: 14 },
  { header: 'Check-out Date', key: 'checkOutDate', width: 16 },
  { header: 'Check-out Time', key: 'checkOutTime', width: 14 },
  { header: 'People in Charge', key: 'peopleInCharge', width: 24 },
  { header: 'Based Location', key: 'basedLocation', width: 24 },
  { header: 'Index Room', key: 'indexRoom', width: 14 },
  { header: 'Room Charged (VND)', key: 'roomCharged', width: 20 },
  { header: 'Created By', key: 'createdBy', width: 20 },
  { header: 'Created At', key: 'createdAt', width: 20 },
  { header: 'Updated At', key: 'updatedAt', width: 20 },
];

const addLabelValueRow = (sheet, rowNumber, items) => {
  const row = sheet.getRow(rowNumber);

  items.forEach(({ label, value }, index) => {
    // Không merge: mỗi item chỉ dùng 2 cột liền nhau.
    // Row 4: A/B, C/D, E/F
    // Row 5: A/B, C/D, E/F
    const labelCol = index * 2 + 1;
    const valueCol = labelCol + 1;

    const labelCell = row.getCell(labelCol);
    labelCell.value = label;
    labelCell.font = { bold: true, color: { argb: 'FF064E3B' } };
    labelCell.fill = lightFill;
    labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
    setThinBorder(labelCell);

    const valueCell = row.getCell(valueCol);
    valueCell.value = value === null || value === undefined || value === '' ? 'All' : value;
    valueCell.alignment = {
      vertical: 'middle',
      horizontal: 'right',
      wrapText: true,
    };
    setThinBorder(valueCell);
  });

  row.height = 22;
};

export const exportRoomBookingReport = async ({ rows = [], filters = {} }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Room Booking Report', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  sheet.columns = columns.map((col) => ({ key: col.key, width: col.width }));

  sheet.mergeCells('A1:N1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'ROOM BOOKING REPORT';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = titleFill;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  sheet.mergeCells('A2:N2');
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = `Generated at: ${formatGeneratedAt()}`;
  subtitleCell.font = { italic: true, color: { argb: 'FF4B5563' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  addLabelValueRow(sheet, 4, [
    { label: 'Name', value: filters.name || 'All' },
    { label: 'Room', value: filters.roomName || filters.roomId || 'All' },
    { label: 'Based Location', value: filters.locationName || filters.locationId || 'All' },
  ]);

  addLabelValueRow(sheet, 5, [
    { label: 'From Date', value: filters.fromDate ? formatDateInput(filters.fromDate) : 'All' },
    { label: 'To Date', value: filters.toDate ? formatDateInput(filters.toDate) : 'All' },
    { label: 'Total Rows', value: rows.length },
  ]);

  addLabelValueRow(sheet, 6, [
    {
      label: 'Total Charged',
      value: rows.reduce((sum, item) => sum + (Number(item?.roomCharged) || 0), 0),
    },
  ]);

  sheet.getCell('B6').numFmt = '#,##0';

  const tableHeaderRowNumber = 8;
  const headerRow = sheet.getRow(tableHeaderRowNumber);
  headerRow.values = columns.map((col) => col.header);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setThinBorder(cell);
  });

  rows.forEach((item, index) => {
    const row = sheet.addRow({
      no: index + 1,
      title: sanitizeSheetText(item?.title),
      room: sanitizeSheetText(item?.roomName || item?.roomId),
      checkInDate: toExcelDate(item?.checkInDate, null) || sanitizeSheetText(item?.checkInDate),
      checkInTime: formatTimeInput(item?.checkInTime),
      checkOutDate: toExcelDate(item?.checkOutDate, null) || sanitizeSheetText(item?.checkOutDate),
      checkOutTime: formatTimeInput(item?.checkOutTime),
      peopleInCharge: sanitizeSheetText(item?.peopleInCharge),
      basedLocation: sanitizeSheetText(item?.basedLocation),
      indexRoom: item?.showOnIndexRoom ? 'Yes' : 'No',
      roomCharged: Number(item?.roomCharged) || 0,
      createdBy: sanitizeSheetText(item?.createdBy),
      createdAt: formatLocalDateTime(item?.createdAt),
      updatedAt: formatLocalDateTime(item?.updatedAt),
    });

    row.eachCell((cell, colNumber) => {
      setThinBorder(cell);
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || colNumber === 10 ? 'center' : colNumber === 11 ? 'right' : 'left',
        wrapText: true,
      };

      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      }
    });

    row.getCell(4).numFmt = 'dd/mm/yyyy';
    row.getCell(6).numFmt = 'dd/mm/yyyy';
    row.getCell(11).numFmt = '#,##0';

    if (item?.showOnIndexRoom) {
      row.getCell(10).fill = successFill;
      row.getCell(10).font = { bold: true, color: { argb: 'FF166534' } };
    }
  });

  sheet.autoFilter = {
    from: { row: tableHeaderRowNumber, column: 1 },
    to: { row: tableHeaderRowNumber, column: columns.length },
  };

  sheet.getColumn(1).alignment = { horizontal: 'center' };
  sheet.getColumn(11).numFmt = '#,##0';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, buildFileName());
};

export const previewBookingDateTime = formatDateTimeText;
