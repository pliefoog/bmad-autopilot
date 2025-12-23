// Maritime Timezone System
// Comprehensive timezone list with UTC±n format and major cities/countries

export interface TimezoneOption {
  id: string;
  name: string;
  offset: number; // Hours offset from UTC (including fractional hours)
  displayName: string; // UTC±n format
  majorCities: string[];
  regions: string[];
}

// Comprehensive timezone list for maritime navigation
export const MARITIME_TIMEZONES: TimezoneOption[] = [
  // UTC-12 to UTC-11 (Pacific)
  {
    id: 'utc-12',
    name: 'International Date Line West',
    offset: -12,
    displayName: 'UTC-12',
    majorCities: ['Baker Island', 'Howland Island'],
    regions: ['International Date Line'],
  },
  {
    id: 'utc-11',
    name: 'Coordinated Universal Time-11',
    offset: -11,
    displayName: 'UTC-11',
    majorCities: ['Pago Pago', 'Niue'],
    regions: ['American Samoa', 'Niue'],
  },

  // UTC-10 to UTC-9 (Pacific/Alaska)
  {
    id: 'utc-10',
    name: 'Hawaii-Aleutian Standard Time',
    offset: -10,
    displayName: 'UTC-10',
    majorCities: ['Honolulu', 'Anchorage (winter)'],
    regions: ['Hawaii', 'Aleutian Islands'],
  },
  {
    id: 'utc-9',
    name: 'Alaska Standard Time',
    offset: -9,
    displayName: 'UTC-9',
    majorCities: ['Anchorage', 'Fairbanks', 'Juneau'],
    regions: ['Alaska', 'French Polynesia'],
  },

  // UTC-8 to UTC-7 (North America West Coast)
  {
    id: 'utc-8',
    name: 'Pacific Standard Time',
    offset: -8,
    displayName: 'UTC-8',
    majorCities: ['Los Angeles', 'San Francisco', 'Seattle', 'Vancouver'],
    regions: ['US West Coast', 'British Columbia'],
  },
  {
    id: 'utc-7',
    name: 'Mountain Standard Time',
    offset: -7,
    displayName: 'UTC-7',
    majorCities: ['Denver', 'Phoenix', 'Calgary', 'Salt Lake City'],
    regions: ['US Mountain', 'Western Canada', 'Mexico (Sonora)'],
  },

  // UTC-6 to UTC-5 (North America Central/East)
  {
    id: 'utc-6',
    name: 'Central Standard Time',
    offset: -6,
    displayName: 'UTC-6',
    majorCities: ['Chicago', 'Dallas', 'Mexico City', 'Winnipeg'],
    regions: ['US Central', 'Central Mexico', 'Central Canada'],
  },
  {
    id: 'utc-5',
    name: 'Eastern Standard Time',
    offset: -5,
    displayName: 'UTC-5',
    majorCities: ['New York', 'Toronto', 'Miami', 'Lima', 'Bogotá'],
    regions: ['US East Coast', 'Eastern Canada', 'Colombia', 'Peru'],
  },

  // UTC-4 to UTC-3 (Atlantic/South America)
  {
    id: 'utc-4',
    name: 'Atlantic Standard Time',
    offset: -4,
    displayName: 'UTC-4',
    majorCities: ['Halifax', 'Caracas', 'La Paz', 'Santiago'],
    regions: ['Atlantic Canada', 'Venezuela', 'Bolivia', 'Chile'],
  },
  {
    id: 'utc-3.5',
    name: 'Newfoundland Standard Time',
    offset: -3.5,
    displayName: 'UTC-3:30',
    majorCities: ["St. John's"],
    regions: ['Newfoundland'],
  },
  {
    id: 'utc-3',
    name: 'Brasília Time',
    offset: -3,
    displayName: 'UTC-3',
    majorCities: ['São Paulo', 'Buenos Aires', 'Montevideo'],
    regions: ['Eastern Brazil', 'Argentina', 'Uruguay'],
  },

  // UTC-2 to UTC+0 (Atlantic/Europe)
  {
    id: 'utc-2',
    name: 'Mid-Atlantic Time',
    offset: -2,
    displayName: 'UTC-2',
    majorCities: ['South Georgia'],
    regions: ['South Georgia', 'South Sandwich Islands'],
  },
  {
    id: 'utc-1',
    name: 'Azores Time',
    offset: -1,
    displayName: 'UTC-1',
    majorCities: ['Azores', 'Cape Verde'],
    regions: ['Azores', 'Cape Verde'],
  },
  {
    id: 'utc+0',
    name: 'Greenwich Mean Time',
    offset: 0,
    displayName: 'UTC±0',
    majorCities: ['London', 'Lisbon', 'Dublin', 'Reykjavik'],
    regions: ['UK', 'Ireland', 'Portugal', 'Iceland'],
  },

  // UTC+1 to UTC+2 (Europe/Africa)
  {
    id: 'utc+1',
    name: 'Central European Time',
    offset: 1,
    displayName: 'UTC+1',
    majorCities: ['Paris', 'Berlin', 'Rome', 'Madrid', 'Amsterdam'],
    regions: ['Western Europe', 'Central Europe', 'West Africa'],
  },
  {
    id: 'utc+2',
    name: 'Eastern European Time',
    offset: 2,
    displayName: 'UTC+2',
    majorCities: ['Helsinki', 'Athens', 'Cairo', 'Istanbul'],
    regions: ['Eastern Europe', 'Egypt', 'Turkey', 'South Africa'],
  },

  // UTC+3 to UTC+4 (Eastern Europe/Middle East)
  {
    id: 'utc+3',
    name: 'Moscow Time',
    offset: 3,
    displayName: 'UTC+3',
    majorCities: ['Moscow', 'St. Petersburg', 'Riyadh', 'Nairobi'],
    regions: ['Western Russia', 'Saudi Arabia', 'Kenya', 'Iraq'],
  },
  {
    id: 'utc+3.5',
    name: 'Iran Standard Time',
    offset: 3.5,
    displayName: 'UTC+3:30',
    majorCities: ['Tehran'],
    regions: ['Iran'],
  },
  {
    id: 'utc+4',
    name: 'Gulf Standard Time',
    offset: 4,
    displayName: 'UTC+4',
    majorCities: ['Dubai', 'Abu Dhabi', 'Baku'],
    regions: ['UAE', 'Oman', 'Azerbaijan', 'Georgia'],
  },
  {
    id: 'utc+4.5',
    name: 'Afghanistan Time',
    offset: 4.5,
    displayName: 'UTC+4:30',
    majorCities: ['Kabul'],
    regions: ['Afghanistan'],
  },

  // UTC+5 to UTC+6 (Central Asia/India)
  {
    id: 'utc+5',
    name: 'Pakistan Standard Time',
    offset: 5,
    displayName: 'UTC+5',
    majorCities: ['Karachi', 'Islamabad', 'Tashkent'],
    regions: ['Pakistan', 'Uzbekistan', 'Kazakhstan (west)'],
  },
  {
    id: 'utc+5.5',
    name: 'India Standard Time',
    offset: 5.5,
    displayName: 'UTC+5:30',
    majorCities: ['Mumbai', 'Delhi', 'Bangalore', 'Colombo'],
    regions: ['India', 'Sri Lanka'],
  },
  {
    id: 'utc+5.75',
    name: 'Nepal Time',
    offset: 5.75,
    displayName: 'UTC+5:45',
    majorCities: ['Kathmandu'],
    regions: ['Nepal'],
  },
  {
    id: 'utc+6',
    name: 'Bangladesh Standard Time',
    offset: 6,
    displayName: 'UTC+6',
    majorCities: ['Dhaka', 'Almaty'],
    regions: ['Bangladesh', 'Kazakhstan (east)', 'Kyrgyzstan'],
  },
  {
    id: 'utc+6.5',
    name: 'Myanmar Time',
    offset: 6.5,
    displayName: 'UTC+6:30',
    majorCities: ['Yangon'],
    regions: ['Myanmar', 'Cocos Islands'],
  },

  // UTC+7 to UTC+8 (Southeast Asia/China)
  {
    id: 'utc+7',
    name: 'Indochina Time',
    offset: 7,
    displayName: 'UTC+7',
    majorCities: ['Bangkok', 'Ho Chi Minh City', 'Jakarta'],
    regions: ['Thailand', 'Vietnam', 'Indonesia (west)'],
  },
  {
    id: 'utc+8',
    name: 'China Standard Time',
    offset: 8,
    displayName: 'UTC+8',
    majorCities: ['Beijing', 'Shanghai', 'Hong Kong', 'Singapore', 'Manila'],
    regions: ['China', 'Hong Kong', 'Singapore', 'Philippines', 'Malaysia'],
  },

  // UTC+9 to UTC+10 (East Asia/Australia)
  {
    id: 'utc+9',
    name: 'Japan Standard Time',
    offset: 9,
    displayName: 'UTC+9',
    majorCities: ['Tokyo', 'Seoul', 'Pyongyang'],
    regions: ['Japan', 'South Korea', 'North Korea'],
  },
  {
    id: 'utc+9.5',
    name: 'Australian Central Standard Time',
    offset: 9.5,
    displayName: 'UTC+9:30',
    majorCities: ['Adelaide', 'Darwin'],
    regions: ['South Australia', 'Northern Territory'],
  },
  {
    id: 'utc+10',
    name: 'Australian Eastern Standard Time',
    offset: 10,
    displayName: 'UTC+10',
    majorCities: ['Sydney', 'Melbourne', 'Brisbane'],
    regions: ['Eastern Australia', 'Tasmania'],
  },

  // UTC+11 to UTC+12 (Pacific)
  {
    id: 'utc+11',
    name: 'Solomon Islands Time',
    offset: 11,
    displayName: 'UTC+11',
    majorCities: ['Noumea', 'Honiara'],
    regions: ['New Caledonia', 'Solomon Islands'],
  },
  {
    id: 'utc+12',
    name: 'New Zealand Standard Time',
    offset: 12,
    displayName: 'UTC+12',
    majorCities: ['Auckland', 'Wellington', 'Suva'],
    regions: ['New Zealand', 'Fiji'],
  },
  {
    id: 'utc+13',
    name: 'Tonga Time',
    offset: 13,
    displayName: 'UTC+13',
    majorCities: ["Nuku'alofa"],
    regions: ['Tonga', 'Samoa'],
  },
  {
    id: 'utc+14',
    name: 'Line Islands Time',
    offset: 14,
    displayName: 'UTC+14',
    majorCities: ['Kiritimati'],
    regions: ['Line Islands', 'Kiribati'],
  },
];

// Special timezone categories for maritime use
export const SPECIAL_TIMEZONES: TimezoneOption[] = [
  {
    id: 'utc',
    name: 'Coordinated Universal Time',
    offset: 0,
    displayName: 'UTC',
    majorCities: ['Greenwich'],
    regions: ['Universal'],
  },
  {
    id: 'local_device',
    name: 'Device Local Time',
    offset: 0, // Will be calculated dynamically
    displayName: 'Device Local',
    majorCities: ['Current Location'],
    regions: ['Device Timezone'],
  },
  {
    id: 'ship_time',
    name: "Ship's Time Zone",
    offset: 0, // User configurable
    displayName: 'Ship Time',
    majorCities: ['Vessel'],
    regions: ['Ship Configuration'],
  },
];

// Get all available timezones
export function getAllTimezones(): TimezoneOption[] {
  return [...SPECIAL_TIMEZONES, ...MARITIME_TIMEZONES];
}

// Get timezone by ID
export function getTimezoneById(id: string): TimezoneOption | undefined {
  return getAllTimezones().find((tz) => tz.id === id);
}

// Get device timezone offset
export function getDeviceTimezoneOffset(): number {
  const offsetMinutes = new Date().getTimezoneOffset();
  return -offsetMinutes / 60; // Convert to hours and invert sign
}

// Format timezone display with cities
export function formatTimezoneDisplay(timezone: TimezoneOption): string {
  const cities = timezone.majorCities.slice(0, 3).join(', ');
  return `${timezone.displayName} (${cities})`;
}

// Apply timezone offset to date
export function applyTimezoneOffset(date: Date, timezoneId: string): Date {
  const timezone = getTimezoneById(timezoneId);
  if (!timezone) return date;

  let offset = timezone.offset;

  // Handle special cases
  if (timezoneId === 'local_device') {
    offset = getDeviceTimezoneOffset();
  } else if (timezoneId === 'ship_time') {
    // TODO: Get ship timezone offset from settings
    offset = 0; // Default to UTC for now
  }

  // Apply offset (convert hours to milliseconds)
  const offsetMs = offset * 60 * 60 * 1000;
  return new Date(date.getTime() + offsetMs);
}

// Group timezones by region for better UI organization
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
  const grouped: Record<string, TimezoneOption[]> = {
    Special: SPECIAL_TIMEZONES,
    Americas: [],
    'Europe & Africa': [],
    'Asia & Middle East': [],
    'Pacific & Oceania': [],
  };

  MARITIME_TIMEZONES.forEach((tz) => {
    if (tz.offset <= -3) {
      grouped.Americas.push(tz);
    } else if (tz.offset >= -2 && tz.offset <= 3) {
      grouped['Europe & Africa'].push(tz);
    } else if (tz.offset >= 3.5 && tz.offset <= 9) {
      grouped['Asia & Middle East'].push(tz);
    } else {
      grouped['Pacific & Oceania'].push(tz);
    }
  });

  return grouped;
}
