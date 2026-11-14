export interface CorpusEntry {
  id: string;
  title: string;
  section: string;
  source: string;
  url: string;
  text: string;
  keywords: string[];
}

export type Reference = Omit<CorpusEntry, 'keywords'>;

const CORPUS: CorpusEntry[] = [
  {
    id: 'nasa-vestibular',
    title: 'Risk of Altered Sensorimotor and Vestibular Function',
    section: 'Risks Involving Human Physiology',
    source: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/risks/',
    text: 'Astronauts can experience motion sickness, issues with hand-eye or gait coordination, and dizziness during gravitational changes. Research seeks to help astronauts recover faster from these changes.',
    keywords: ['dizzy', 'dizziness', 'gravity', 'balance', 'coordination', 'vestibular', 'motion sickness'],
  },
  {
    id: 'nasa-cardiovascular',
    title: 'Risk of Cardiovascular Adaptations',
    section: 'Risks Involving Human Physiology',
    source: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/risks/',
    text: 'Weightlessness alters blood circulation and how the heart and blood vessels function, potentially increasing the risk of cardiovascular events.',
    keywords: ['chest', 'heart', 'cardiovascular', 'circulation', 'blood pressure'],
  },
  {
    id: 'nasa-hypoxia',
    title: 'Risk of Hypoxia',
    section: 'Risks Involving Human Physiology',
    source: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/risks/',
    text: 'Mild hypoxia occurs when oxygen levels in body tissues become lower than normal. This is relevant to deep-space mission planning and spacewalk preparation.',
    keywords: ['breathing', 'breath', 'oxygen', 'hypoxia', 'spo2', 'shortness'],
  },
  {
    id: 'nasa-sleep',
    title: 'Risk of Inadequate Sleep and Irregular Schedules',
    section: 'Behavioral Performance and Human Factors',
    source: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/risks/',
    text: 'Space crews may experience chronic sleep loss, constant work demands, and irregularities in their internal biological clocks.',
    keywords: ['sleep', 'tired', 'fatigue', 'circadian', 'schedule'],
  },
];

/** Keyword retrieval over a small curated corpus. Returns at most two references. */
export function retrieve(message: string): Reference[] {
  const text = message.toLowerCase();
  return CORPUS
    .filter(entry => entry.keywords.some(keyword => text.includes(keyword)))
    .slice(0, 2)
    .map(({ keywords: _keywords, ...reference }) => reference);
}
