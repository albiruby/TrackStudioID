import { ExportCardPayload } from './exportPayload';

export interface CardTemplate {
  id: string;
  name: string;
  category: 'Minimal' | 'Editorial' | 'Consumer' | 'Brutalist' | 'Map';
  description: string;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

export function validateTemplate(templateId: string, payload: ExportCardPayload): ValidationResult {
  if (templateId === 'route-poster') {
    if (!payload.routeSvgPath) {
      return { allowed: false, reason: 'GPS route data required' };
    }
  }
  
  if (templateId === 'pharmacy-rx') {
    if (payload.averageHeartRate === null || payload.averageHeartRate === undefined || payload.averageHeartRate <= 0) {
      return { allowed: false, reason: 'Heart rate data required' };
    }
  }

  if (templateId === 'power-intervals') {
    if (payload.averageWatts === null || payload.averageWatts === undefined || payload.averageWatts <= 0) {
      return { allowed: false, reason: 'Power data required' };
    }
  }

  return { allowed: true };
}

export const EXPORT_TEMPLATES: CardTemplate[] = [
  {
    id: 'minimal-performance',
    name: 'Minimal Performance Card',
    category: 'Minimal',
    description: 'A clean, high-contrast visual slate framing core athletic metrics with generous white space.'
  },
  {
    id: 'editorial-summary',
    name: 'Editorial Summary',
    category: 'Editorial',
    description: 'Serif layout pairing styled exactly like clean premium printed marathon reviews.'
  },
  {
    id: 'training-receipt',
    name: 'Training Receipt',
    category: 'Consumer',
    description: 'Monospaced point-of-sale checkout docket itemizing activity statistics.'
  },
  {
    id: 'nutrition-facts',
    name: 'Nutrition Facts Style',
    category: 'Consumer',
    description: 'Humorous nutrition values checklist of macronutrient training details.'
  },
  {
    id: 'shipping-label',
    name: 'Shipping Label Style',
    category: 'Consumer',
    description: 'Courier delivery parcel label featuring barcodes and recipient instructions.'
  },
  {
    id: 'pharmacy-rx',
    name: 'Pharmacy/RX Style',
    category: 'Consumer',
    description: 'Prescription treatment instructions mapping dosage periods and heart thresholds.'
  },
  {
    id: 'brutalist-metrics',
    name: 'Brutalist Metrics',
    category: 'Brutalist',
    description: 'Heavy borders, mono-spaced headers, high-contrast dark wireframes.'
  },
  {
    id: 'power-intervals',
    name: 'Power Intervals Lab',
    category: 'Brutalist',
    description: 'A performance interval layout showcasing wattage output and metabolic engine power. Requires power data.'
  },
  {
    id: 'route-poster',
    name: 'Route Poster',
    category: 'Map',
    description: 'Immersive path poster of GPS geographical coordinates trail. Requires map data.'
  }
];
