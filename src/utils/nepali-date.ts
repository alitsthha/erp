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
      'बैशाख', 'जेष्ठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन',
      'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
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
