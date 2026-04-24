import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { motion } from 'framer-motion';

const MODEL_PATHS = {
  male: '/models/male_body.glb',
  female: '/models/female_body.glb',
};

const preloadedModels = new Set();

function getModelPath(gender) {
  return String(gender || '').toLowerCase() === 'female' ? MODEL_PATHS.female : MODEL_PATHS.male;
}

function queueModelPreload(modelPath) {
  if (preloadedModels.has(modelPath)) {
    return;
  }

  preloadedModels.add(modelPath);
  useGLTF.preload(modelPath);
}

export function preloadBodyModels(gender) {
  const preferredPath = getModelPath(gender);
  const secondaryPath = preferredPath === MODEL_PATHS.female ? MODEL_PATHS.male : MODEL_PATHS.female;

  queueModelPreload(preferredPath);

  const preloadSecondary = () => queueModelPreload(secondaryPath);
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(preloadSecondary, { timeout: 4500 });
    return;
  }

  if (typeof window !== 'undefined') {
    window.setTimeout(preloadSecondary, 3500);
  }
}

const BODY_REGIONS = {
  head: {
    label: 'Head',
    position: [0, 0.42, 0.12],
    labelPosition: [0.62, 0.47, 0.42],
    keywords: ['headache', 'migraine', 'head pain', 'dizziness', 'vertigo', 'confusion'],
  },
  brain: {
    label: 'Nervous system',
    position: [0, 0.36, 0.13],
    labelPosition: [-0.66, 0.43, 0.42],
    keywords: ['seizure', 'anxiety', 'depression', 'drowsiness', 'sedation', 'insomnia', 'tremor', 'neuropathy'],
  },
  eyes: {
    label: 'Eyes',
    position: [0.06, 0.39, 0.13],
    labelPosition: [0.68, 0.39, 0.42],
    keywords: ['vision', 'blurred vision', 'eye', 'glaucoma', 'visual'],
  },
  mouth_throat: {
    label: 'Mouth and throat',
    position: [0, 0.31, 0.13],
    labelPosition: [0.68, 0.3, 0.42],
    keywords: ['dry mouth', 'mouth', 'throat', 'taste', 'swallowing', 'sore throat'],
  },
  heart: {
    label: 'Heart and chest',
    position: [-0.06, 0.17, 0.14],
    labelPosition: [-0.72, 0.23, 0.43],
    keywords: ['chest', 'heart', 'palpitation', 'arrhythmia', 'qt', 'blood pressure', 'hypertension', 'tachycardia'],
  },
  lungs: {
    label: 'Lungs',
    position: [0.07, 0.16, 0.14],
    labelPosition: [0.72, 0.19, 0.43],
    keywords: ['breathing', 'respiratory', 'bronchospasm', 'asthma', 'cough', 'shortness of breath', 'dyspnea'],
  },
  stomach: {
    label: 'Digestive system',
    position: [0, 0.02, 0.15],
    labelPosition: [0.72, 0.03, 0.43],
    keywords: ['nausea', 'vomiting', 'diarrhea', 'constipation', 'abdominal', 'stomach', 'gastric', 'gastrointestinal', 'appetite'],
  },
  liver: {
    label: 'Liver',
    position: [0.08, 0.07, 0.15],
    labelPosition: [0.72, 0.1, 0.43],
    keywords: ['liver', 'hepatic', 'jaundice', 'hepatotoxicity', 'transaminase'],
  },
  kidney: {
    label: 'Kidneys',
    position: [-0.08, -0.04, 0.14],
    labelPosition: [-0.72, 0, 0.43],
    keywords: ['kidney', 'renal', 'urination', 'urinary', 'bladder', 'creatinine'],
  },
  skin: {
    label: 'Skin',
    position: [0.18, 0.08, 0.12],
    labelPosition: [0.78, 0.14, 0.42],
    keywords: ['rash', 'itching', 'hives', 'swelling', 'photosensitivity', 'skin', 'urticaria', 'edema'],
  },
  muscle_joint: {
    label: 'Muscle and joints',
    position: [-0.16, -0.24, 0.12],
    labelPosition: [-0.78, -0.2, 0.42],
    keywords: ['muscle', 'joint', 'weakness', 'cramp', 'myalgia', 'arthralgia', 'pain'],
  },
  blood: {
    label: 'Blood',
    position: [0, 0.12, 0.15],
    labelPosition: [-0.72, 0.12, 0.43],
    keywords: ['bleeding', 'anemia', 'platelet', 'clot', 'blood', 'bruising', 'hemorrhage'],
  },
  reproductive: {
    label: 'Reproductive system',
    position: [0, -0.16, 0.14],
    labelPosition: [0.72, -0.15, 0.42],
    keywords: ['pregnancy', 'reproductive', 'menstrual', 'fertility', 'sexual'],
  },
};

const SEVERITY_RANK = {
  severe: 3,
  contraindicated: 3,
  major: 3,
  moderate: 2,
  minor: 1,
  mild: 1,
};

function getSeverityRank(value) {
  return SEVERITY_RANK[String(value || '').toLowerCase()] || 1;
}

function getEffectText(item) {
  return [
    item?.side_effect,
    item?.mechanism,
    item?.patient_specific_risk,
    item?.management,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function mapPredictionsToRegions(predictions = []) {
  const regionMap = new Map();

  predictions.forEach((item) => {
    const text = getEffectText(item);
    const matchedRegion = Object.entries(BODY_REGIONS).find(([, region]) =>
      region.keywords.some((keyword) => text.includes(keyword)),
    );

    if (!matchedRegion) {
      return;
    }

    const [regionKey, region] = matchedRegion;
    const current = regionMap.get(regionKey);
    const candidate = {
      key: regionKey,
      region,
      primaryEffect: item.side_effect || region.label,
      probability: Number(item.probability) || 0,
      severity: item.severity || 'Moderate',
      count: 1,
      score: getSeverityRank(item.severity) * 100 + (Number(item.probability) || 0),
    };

    if (!current) {
      regionMap.set(regionKey, candidate);
      return;
    }

    regionMap.set(regionKey, {
      ...current,
      count: current.count + 1,
      ...(candidate.score > current.score
        ? {
            primaryEffect: candidate.primaryEffect,
            probability: candidate.probability,
            severity: candidate.severity,
            score: candidate.score,
          }
        : {}),
    });
  });

  return Array.from(regionMap.values())
    .sort((first, second) => second.score - first.score)
    .slice(0, 6);
}

function BodyModel({ gender }) {
  const modelPath = getModelPath(gender);
  const { scene } = useGLTF(modelPath);

  return <primitive object={scene} position={[0, 0, 0]} rotation={[0, 0, 0]} />;
}

function MarkerLine({ start, end }) {
  const points = useMemo(
    () => new Float32Array([...start, ...end]),
    [start, end],
  );

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2} array={points} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#5eead4" transparent opacity={0.75} />
    </line>
  );
}

function AreaMarker({ marker }) {
  const { region } = marker;
  const label = `${region.label}: ${marker.primaryEffect}${marker.count > 1 ? ` +${marker.count - 1}` : ''}`;

  return (
    <group>
      <mesh position={region.position}>
        <sphereGeometry args={[0.028, 24, 24]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#14b8a6" emissiveIntensity={1.8} />
      </mesh>
      <mesh position={region.position}>
        <sphereGeometry args={[0.05, 24, 24]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.2} />
      </mesh>
      <MarkerLine start={region.position} end={region.labelPosition} />
      <Html position={region.labelPosition} center distanceFactor={3.45}>
        <div className="pointer-events-none max-w-40 rounded-lg border border-cyan-300/25 bg-black/72 px-2.5 py-1.5 text-left shadow-lg shadow-black/35 backdrop-blur-md">
          <p className="text-[10px] font-semibold leading-snug text-cyan-100">{label}</p>
          <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-white/45">
            {marker.severity} | {marker.probability}% risk
          </p>
        </div>
      </Html>
    </group>
  );
}

const BodyImpactViewer = ({ gender, predictions }) => {
  const normalizedGender = String(gender || '').toLowerCase() === 'female' ? 'female' : 'male';
  const markers = useMemo(() => mapPredictionsToRegions(predictions), [predictions]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="glass-panel w-full max-w-2xl p-5 md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Affected Areas</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/45">
          {normalizedGender === 'female' ? 'Female model' : 'Male model'}
        </span>
      </div>

      <div className="relative h-[28rem] overflow-hidden rounded-2xl border border-white/10 bg-black/25">
        {markers.length === 0 && (
          <div className="absolute left-4 top-4 z-10 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white/60 backdrop-blur">
            No specific body region mapped for this result.
          </div>
        )}
        <Canvas camera={{ position: [0, 0.2, 3.1], fov: 38 }} dpr={[1, 1.6]}>
          <color attach="background" args={['#071111']} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 3, 4]} intensity={2.2} />
          <directionalLight position={[-2, 1.5, 2]} intensity={0.8} />
          <Suspense
            fallback={
              <Html center>
                <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white/70">
                  Loading body model...
                </div>
              </Html>
            }
          >
            <BodyModel gender={normalizedGender} />
            {markers.map((marker) => (
              <AreaMarker key={marker.key} marker={marker} />
            ))}
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={2.1}
            maxDistance={4.2}
            target={[0, 0.08, 0]}
          />
        </Canvas>
      </div>
    </motion.section>
  );
};

export default BodyImpactViewer;
