import NepaliDate from 'nepali-date-converter';

export function convertADToBS(adDate: string): string {
  try {
    const [year, month, day] = adDate.split('-').map(Number);
    const nepaliDate = new NepaliDate(new Date(year, month - 1, day));
    const bsYear = nepaliDate.getYear();
    const bsMonth = String(nepaliDate.getMonth() + 1).padStart(2, '0');
    const bsDay = String(nepaliDate.getDate()).padStart(2, '0');
    return `${bsYear}-${bsMonth}-${bsDay}`;
  } catch (error) {
    console.error('Error converting AD to BS:', error);
    return adDate;
  }
}

export function convertBSToAD(bsDate: string): string {
  try {
    const [year, month, day] = bsDate.split('-').map(Number);
    const nepaliDate = new NepaliDate(year, month - 1, day);
    const adDate = nepaliDate.toJsDate();
    const adYear = adDate.getFullYear();
    const adMonth = String(adDate.getMonth() + 1).padStart(2, '0');
    const adDay = String(adDate.getDate()).padStart(2, '0');
    return `${adYear}-${adMonth}-${adDay}`;
  } catch (error) {
    console.error('Error converting BS to AD:', error);
    return bsDate;
  }
}

export function getCurrentBSDate(): string {
  const today = new Date();
  const nepaliDate = new NepaliDate(today);
  const bsYear = nepaliDate.getYear();
  const bsMonth = String(nepaliDate.getMonth() + 1).padStart(2, '0');
  const bsDay = String(nepaliDate.getDate()).padStart(2, '0');
  return `${bsYear}-${bsMonth}-${bsDay}`;
}

export function formatBSDate(bsDate: string, format: 'full' | 'short' = 'full'): string {
  try {
    const [year, month, day] = bsDate.split('-').map(Number);
    if (format === 'short') {
      return `${day}/${month}/${year}`;
    }
    const months = [
      'Baishak', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
      'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
    ];
    return `${day} ${months[month - 1]} ${year}`;
  } catch (error) {
    console.error('Error formatting BS date:', error);
    return bsDate;
  }
}

export function getBSYearMonth(bsDate: string): { year: number; month: number } {
  try {
    const [year, month] = bsDate.split('-').map(Number);
    return { year, month };
  } catch {
    return { year: 0, month: 0 };
  }
}

export function getPreviousBSDate(bsDate: string): string {
  try {
    const adDateStr = convertBSToAD(bsDate);
    const [year, month, day] = adDateStr.split('-').map(Number);
    const prevAdDate = new Date(year, month - 1, day - 1);
    const adYear = prevAdDate.getFullYear();
    const adMonth = String(prevAdDate.getMonth() + 1).padStart(2, '0');
    const adDay = String(prevAdDate.getDate()).padStart(2, '0');
    return convertADToBS(`${adYear}-${adMonth}-${adDay}`);
  } catch (error) {
    console.error('Error getting previous BS date:', error);
    return bsDate;
  }
}

export function getNextBSDate(bsDate: string): string {
  try {
    const adDateStr = convertBSToAD(bsDate);
    const [year, month, day] = adDateStr.split('-').map(Number);
    const nextAdDate = new Date(year, month - 1, day + 1);
    const adYear = nextAdDate.getFullYear();
    const adMonth = String(nextAdDate.getMonth() + 1).padStart(2, '0');
    const adDay = String(nextAdDate.getDate()).padStart(2, '0');
    return convertADToBS(`${adYear}-${adMonth}-${adDay}`);
  } catch (error) {
    console.error('Error getting next BS date:', error);
    return bsDate;
  }
}

export function isTodayBS(bsDate: string): boolean {
  return bsDate === getCurrentBSDate();
}

export const BS_MONTHS = [
  { value: "01", name: "Baishak", englishName: "Baishak" },
  { value: "02", name: "Jestha", englishName: "Jestha" },
  { value: "03", name: "Ashad", englishName: "Ashad" },
  { value: "04", name: "Shrawan", englishName: "Shrawan" },
  { value: "05", name: "Bhadra", englishName: "Bhadra" },
  { value: "06", name: "Ashwin", englishName: "Ashwin" },
  { value: "07", name: "Kartik", englishName: "Kartik" },
  { value: "08", name: "Mangsir", englishName: "Mangsir" },
  { value: "09", name: "Poush", englishName: "Poush" },
  { value: "10", name: "Magh", englishName: "Magh" },
  { value: "11", name: "Falgun", englishName: "Falgun" },
  { value: "12", name: "Chaitra", englishName: "Chaitra" },
];
