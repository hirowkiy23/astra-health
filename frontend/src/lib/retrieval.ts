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

/** NASA HRP source summaries used to ground ASTRA. Research background, not treatment protocols. */
const SUPPLEMENTAL: CorpusEntry[] = [
  ['hazard-radiation', 'Space Radiation', 'Five Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/', 'Space radiation is invisible and considered one of the most hazardous aspects of spaceflight. NASA studies its effects through research on Earth and in space.', 'radiation dose exposure cosmic shielding'],
  ['hazard-isolation', 'Isolation and Confinement', 'Five Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/', 'Behavioral responses can occur when groups are isolated and confined in a small space far from Earth over long periods. Crew selection, training and support are important.', 'isolation confined confinement stress mood anxiety depressed lonely'],
  ['hazard-distance', 'Distance from Earth', 'Five Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/', 'As astronauts venture deeper into space, instructions, supplies and medical care become increasingly challenging to receive. Planning and self-sufficiency are important.', 'distance earth communication delayed ground offline remote'],
  ['hazard-gravity', 'Gravity Fields', 'Five Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/', 'Muscles, bones, the inner ear and organs must adjust to different gravitational environments during spaceflight, lunar or Martian surface operations, and return to Earth.', 'microgravity gravity lunar mars bone muscle spine'],
  ['hazard-environment', 'Hostile/Closed Environments', 'Five Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/', 'Maintaining a safe spacecraft ecosystem includes optimal temperatures, pressures and lighting, reducing noise, monitoring microbial communities and tracking immune responses.', 'cabin humidity pressure noise lighting microbial environment closed'],
  ['immune', 'Risk of Altered Immune System Responses', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'The stresses of spaceflight can awaken inactive viruses inside astronauts, leading to rashes and other symptoms. Researchers seek to understand these immune-system changes.', 'immune virus rash infection saliva immunity'],
  ['decompression', 'Risk of Decompression Sickness', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'Moving from a pressurized spacecraft to a lower-pressure spacesuit can cause dissolved nitrogen to bubble within body tissues. Research concerns prevention and faster treatment.', 'decompression bends nitrogen spacesuit eva'],
  ['microorganism', 'Risk of Host-Microorganism Interactions', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'Skin and gut microbiomes can change in space, potentially increasing the risk of illness. Researchers are exploring these evolving microbial ecosystems.', 'microbiome gut skin microbe microbial'],
  ['nutrition', 'Risk of Inadequate Food and Nutrition', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'A healthy balanced diet is essential for crew health and performance. Research focuses on enjoyable, long-lasting, nutritious meals and the consequences of inadequate nutrition.', 'food nutrition diet meal hydration vitamin b-complex'],
  ['eva-risk', 'Risk of Injury and Compromised Performance from Spacewalks', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'Working in a spacesuit involves cognitive fatigue, injury and environmental risks including decompression sickness, low oxygen and high carbon dioxide levels.', 'spacewalk suit eva cognitive fatigue injury carbon dioxide co2'],
  ['fitness', 'Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'Astronauts exercise to counter losses in bone density, muscle strength and cardiovascular performance. Research studies exercise that protects health and spacewalk capability.', 'exercise fitness strength treadmill workout cardiorespiratory'],
  ['sans', 'Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'The structure of the eyes and brain can change with spaceflight. Research seeks to understand long-term consequences and prevention.', 'eye vision ocular sans brain pressure headache'],
  ['bone', 'Risk of Spaceflight-Induced Bone Changes', 'Risks Involving Human Physiology', 'https://www.nasa.gov/hrp/risks/', 'Without gravity, bones break down and become more brittle. Research seeks to quantify losses and preserve bone strength through diet, exercise and medication.', 'bone density fracture spinal spine'],
  ['psychiatric', 'Risk of Behavioral Changes and Psychiatric Disorders', 'Behavioral Performance and Human Factors', 'https://www.nasa.gov/hrp/risks/', 'Isolation, radiation, distance from Earth and other stressors may affect mental health. Research seeks to better understand and quantify these psychological risks.', 'mental psychiatric psychological mood stress anxiety'],
  ['teamwork', 'Risk of Inadequate Teamwork', 'Behavioral Performance and Human Factors', 'https://www.nasa.gov/hrp/risks/', 'Researchers study how teams in prolonged isolation and confinement function efficiently and recover after setbacks, including miscommunication and team tensions.', 'team teamwork communication conflict crew'],
  ['operations', 'Risk of Inadequate Systems Operations Support', 'Behavioral Performance and Human Factors', 'https://www.nasa.gov/hrp/risks/', 'Deep-space crews may face unexpected problems with software, vehicles or other systems. Research concerns timely information, training and support.', 'software procedure training operations support'],
  ['loads', 'Risk of Injury from Dynamic Loads', 'Behavioral Performance and Human Factors', 'https://www.nasa.gov/hrp/risks/', 'Crews risk injury during landing activities. Research seeks to understand the likelihood of such injuries and better prevention.', 'landing impact dynamic loads injury'],
  ['cancer', 'Risk of Radiation-Induced Cancers', 'Risks Involving Space Radiation', 'https://www.nasa.gov/hrp/risks/', 'Crew exposure to space radiation may increase cancer risk. Research priorities include mitigation and understanding potential interventions.', 'cancer radiation dose cumulative exposure'],
  ['archer', 'ARCHeR: Well-being, Activity and Sleep', 'Ongoing HRP Research in Space', 'https://www.nasa.gov/hrp/ongoing-hrp-research/', 'ARCHeR studied Artemis II astronauts’ well-being, activity and sleep patterns to understand health and performance in deep space. Actigraphy measured motion, sleep and light exposure.', 'actigraphy light well-being wellbeing activity archer'],
  ['standard-measures', 'Standard Measures', 'Ongoing HRP Research in Space', 'https://www.nasa.gov/hrp/ongoing-hrp-research/', 'Standard Measures collects consistent physiological and psychological measurements to understand how spaceflight affects bodies and minds.', 'standard measures baseline physiological psychological'],
  ['tempus', 'Tempus Pro Telemedicine', 'Past Human Investigations', 'https://www.nasa.gov/hrp/ongoing-hrp-research/', 'Tempus Pro tested a commercial telemedicine device for collecting and integrating health data, potentially enabling remote, near-real-time diagnoses.', 'telemedicine tempus device remote monitoring'],
  ['omics', 'Omics Archive', 'Past Human Investigations', 'https://www.nasa.gov/hrp/ongoing-hrp-research/', 'The Omics Archive collects blood, urine, saliva, feces and cells to document how long-duration spaceflight affects health at the molecular level.', 'omics blood urine saliva biomarker sample'],
  ['gardening', 'Space Gardening', 'Past Human Investigations', 'https://www.nasa.gov/hrp/ongoing-hrp-research/', 'Space Gardening surveyed whether growing fresh vegetables in space could ease astronauts’ sense of isolation and confinement.', 'garden plants vegetables veggie gardening'],
].map(([id, title, section, url, text, keywords]) => ({ id, title, section, source: 'NASA Human Research Program', url, text, keywords: keywords.split(' ') }));

CORPUS.push(...SUPPLEMENTAL);

/** Keyword retrieval over a small curated corpus. Returns at most two references. */
export function retrieve(message: string): Reference[] {
  const text = message.toLowerCase();
  return CORPUS
    .filter(entry => entry.keywords.some(keyword => text.includes(keyword)))
    .slice(0, 2)
    .map(({ keywords: _keywords, ...reference }) => reference);
}
