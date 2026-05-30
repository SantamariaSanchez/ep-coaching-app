export const MICRO_DAILY_REF = {
  vitamin_d:   { value: 15,    unit: 'µg', name: 'Vitamine D'   },
  magnesium:   { value: 400,   unit: 'mg', name: 'Magnésium'    },
  zinc:        { value: 11,    unit: 'mg', name: 'Zinc'         },
  iron:        { value: 8,     unit: 'mg', name: 'Fer'          },
  omega3:      { value: 1600,  unit: 'mg', name: 'Oméga-3'      },
  iodine:      { value: 150,   unit: 'µg', name: 'Iode'         },
  selenium:    { value: 55,    unit: 'µg', name: 'Sélénium'     },
  vitamin_b12: { value: 2.4,   unit: 'µg', name: 'Vitamine B12' },
  calcium:     { value: 1000,  unit: 'mg', name: 'Calcium'      },
  potassium:   { value: 3500,  unit: 'mg', name: 'Potassium'    },
  vitamin_k:   { value: 120,   unit: 'µg', name: 'Vitamine K'   },
  vitamin_e:   { value: 15,    unit: 'mg', name: 'Vitamine E'   },
  vitamin_a:   { value: 900,   unit: 'µg', name: 'Vitamine A'   },
  vitamin_b6:  { value: 1.3,   unit: 'mg', name: 'Vitamine B6'  },
  vitamin_b9:  { value: 400,   unit: 'µg', name: 'Folate B9'    },
  vitamin_c:   { value: 90,    unit: 'mg', name: 'Vitamine C'   },
  vitamin_b1:  { value: 1.2,   unit: 'mg', name: 'Vitamine B1'  },
  vitamin_b2:  { value: 1.3,   unit: 'mg', name: 'Vitamine B2'  },
  vitamin_b3:  { value: 16,    unit: 'mg', name: 'Vitamine B3'  },
  phosphorus:  { value: 700,   unit: 'mg', name: 'Phosphore'    },
  copper:      { value: 0.9,   unit: 'mg', name: 'Cuivre'       },
  manganese:   { value: 2.3,   unit: 'mg', name: 'Manganèse'    },
  sodium:      { value: 2300,  unit: 'mg', name: 'Sodium'       },
  omega6:      { value: 17000, unit: 'mg', name: 'Oméga-6'      },
} as const;

export type MicroKey = keyof typeof MICRO_DAILY_REF;

export const MICRO_KEYS = Object.keys(MICRO_DAILY_REF) as MicroKey[];
