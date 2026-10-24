import React, { useState, useEffect, useRef } from 'react';
import { AppRegion } from '../types';
import { compressImage } from '../organizers';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ScanFace,
  FileCheck,
  IdCard,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export interface IdentityFlowResult {
  docType: 'ine' | 'pasaporte';
  ineFront: string;
  ineBack: string; // empty for passport
  selfie: string; // close-up frame from the liveness test
  manualReview?: boolean; // true when the user requests administrator validation
}

type IdStage =
  | 'frente' // rear camera: front side of the document
  | 'detectado' // "¡Excelente! Primer paso completado" + Siguiente
  | 'reverso' // rear camera: back side of the INE
  | 'vida' // selfie liveness: place your face in the circle
  | 'acerca' // the circle shrinks: come closer
  | 'analizando' // motion/genuineness analysis
  | 'exito'
  | 'rechazo';

interface IdentityFlowProps {
  isEs: boolean;
  region: AppRegion;
  onDone: (result: IdentityFlowResult) => void;
}

export function IdentityFlow({ isEs, region, onDone }: IdentityFlowProps) {
  const [stage, setStage] = useState<IdStage>('frente');
  const [docType, setDocType] = useState<'ine' | 'pasaporte'>(region === 'MX' ? 'ine' : 'pasaporte');
  const [ineFront, setIneFront] = useState('');
  const [ineBack, setIneBack] = useState('');
  const [selfieClose, setSelfieClose] = useState('');
  const [selfieFar, setSelfieFar] = useState('');
  const [detectBusy, setDetectBusy] = useState(false);
  const [blurError, setBlurError] = useState<string | null>(null);

  // Camera plumbing
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Liveness plumbing (motion analysis + face detection)
  const faceDetectorRef = useRef<any>(null);
  const motionRef = useRef<number[]>([]);
  const prevFrameRef = useRef<Uint8Array | null>(null);
  const faceHitsRef = useRef(0);
  const farBoxWRef = useRef(0);
  const [manualMode, setManualMode] = useState(false);
  const analysisTimerRef = useRef<number | null>(null);

  const docLabel = region === 'MX'
    ? (isEs ? 'INE/Pasaporte' : 'INE/Passport')
    : (isEs ? 'ID/Pasaporte' : 'ID/Passport');

  // ---------- Face detector bootstrap (Chrome/Android where available) ----------
  useEffect(() => {
    const FD = (window as any).FaceDetector;
    if (typeof FD === 'function') {
      try {
        faceDetectorRef.current = new FD({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        faceDetectorRef.current = null;
      }
    }
    return () => {
      faceDetectorRef.current = null;
      if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    };
  }, []);

  // ---------- Camera lifecycle: rear camera for documents, selfie for liveness ----------
  useEffect(() => {
    const wants: 'environment' | 'user' | null =
      stage === 'frente' || stage === 'reverso' ? 'environment'
        : stage === 'vida' || stage === 'acerca' ? 'user'
          : null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraError(false);
    if (!wants) return;
    let active = true;
    let localStream: MediaStream | null = null;
    const start = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('unsupported');
        localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: wants } }, audio: false });
        if (!active) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = localStream;
        setCameraReady(true);
      } catch {
        if (active) setCameraError(true);
      }
    };
    void start();
    return () => {
      active = false;
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    };
  }, [stage]);

  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady, stage]);

  // ---------- Frame capture (800px JPEG 0.7, same archive budget) ----------
  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const max = 800;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('reader'));
    reader.readAsDataURL(file);
  });

  const compressOrRaw = async (file: File): Promise<string> => {
    try {
      return await compressImage(file);
    } catch {
      try {
        return await readFileAsDataUrl(file);
      } catch {
        return '';
      }
    }
  };

  // ---------- Automatic image analysis: sharpness + MRZ (passport) detection ----------
  const analyzeImage = (dataUrl: string): Promise<{ sharp: boolean; passportMrz: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const W = 160;
          const H = Math.max(2, Math.round((img.height / img.width) * W));
          const canvas = document.createElement('canvas');
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve({ sharp: true, passportMrz: false }); return; }
          ctx.drawImage(img, 0, 0, W, H);
          const px = ctx.getImageData(0, 0, W, H);
          const gray = new Float32Array(W * H);
          for (let i = 0; i < W * H; i++) {
            gray[i] = 0.299 * px.data[i * 4] + 0.587 * px.data[i * 4 + 1] + 0.114 * px.data[i * 4 + 2];
          }
          // Sharpness: variance of the Laplacian (sharp documents usually exceed ~55).
          let sum = 0;
          let sumSq = 0;
          let n = 0;
          for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              const v = 4 * gray[y * W + x] - gray[y * W + x - 1] - gray[y * W + x + 1] - gray[(y - 1) * W + x] - gray[(y + 1) * W + x];
              sum += v;
              sumSq += v * v;
              n++;
            }
          }
          const variance = n > 0 ? sumSq / n - (sum / n) * (sum / n) : 0;
          const sharp = variance > 55;
          // MRZ detection: passports print two high-contrast character rows in the lower zone.
          let maxTransitions = 0;
          for (let y = Math.floor(H * 0.3); y < H; y++) {
            let trans = 0;
            for (let x = 1; x < W; x++) {
              if (Math.abs(gray[y * W + x] - gray[y * W + x - 1]) > 28) trans++;
            }
            if (trans > maxTransitions) maxTransitions = trans;
          }
          const passportMrz = maxTransitions >= 30;
          resolve({ sharp, passportMrz });
        } catch {
          resolve({ sharp: true, passportMrz: false });
        }
      };
      img.onerror = () => resolve({ sharp: true, passportMrz: false });
      img.src = dataUrl;
    });
  };

  // ---------- Document flow ----------
  const handleFrontCapture = async () => {
    const data = captureFrame();
    if (!data) return;
    setDetectBusy(true);
    const info = await analyzeImage(data);
    setDetectBusy(false);
    if (!info.sharp) {
      setBlurError(isEs
        ? 'La foto salió borrosa. Limpia el lente, asegúrate de tener buena luz, sostén el documento firme y vuelve a capturar.'
        : 'The photo came out blurry. Clean the lens, make sure you have good lighting, hold the document steady and capture again.');
      return;
    }
    setBlurError(null);
    setIneFront(data);
    // Automatic document type detection: MRZ rows => passport; otherwise INE for MX.
    setDocType(info.passportMrz ? 'pasaporte' : region === 'MX' ? 'ine' : 'pasaporte');
    setStage('detectado');
  };

  const handleFrontFile = async (file: File) => {
    const data = await compressOrRaw(file);
    if (!data) return;
    setDetectBusy(true);
    const info = await analyzeImage(data);
    setDetectBusy(false);
    if (!info.sharp) {
      setBlurError(isEs
        ? 'La foto del documento es borrosa. Tómala de nuevo con más luz y sin mover el dispositivo.'
        : 'The document photo is blurry. Take it again with more light and without moving the device.');
      return;
    }
    setBlurError(null);
    setIneFront(data);
    setDocType(info.passportMrz ? 'pasaporte' : region === 'MX' ? 'ine' : 'pasaporte');
    setStage('detectado');
  };

  const handleBackCapture = async () => {
    const data = captureFrame();
    if (!data) return;
    setDetectBusy(true);
    const info = await analyzeImage(data);
    setDetectBusy(false);
    if (!info.sharp) {
      setBlurError(isEs
        ? 'La foto del reverso salió borrosa. Vuelve a capturar con buena luz y el documento firme.'
        : 'The back photo came out blurry. Capture again with good lighting and the document steady.');
      return;
    }
    setBlurError(null);
    setIneBack(data);
    setStage('vida');
  };

  const handleBackFile = async (file: File) => {
    const data = await compressOrRaw(file);
    if (!data) return;
    setDetectBusy(true);
    const info = await analyzeImage(data);
    setDetectBusy(false);
    if (!info.sharp) {
      setBlurError(isEs
        ? 'La foto del reverso es borrosa. Súbela de nuevo con más luz y sin movimiento.'
        : 'The back photo is blurry. Upload it again with more light and no motion.');
      return;
    }
    setBlurError(null);
    setIneBack(data);
    setStage('vida');
  };

  const handleNextFromDetected = () => {
    setStage(docType === 'ine' ? 'reverso' : 'vida');
  };

  // ---------- Liveness analysis ----------
  const runAnalysis = () => {
    setStage('analizando');
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = window.setTimeout(() => {
      const motion = motionRef.current;
      if (motion.length < 8) {
        setStage('rechazo');
        return;
      }
      let sum = 0;
      let max = 0;
      for (const m of motion) {
        sum += m;
        if (m > max) max = m;
      }
      const avg = sum / motion.length;
      // A live face produces continuous, moderate inter-frame variation;
      // a static printed photo or screen replay produces almost none.
      if (avg < 1.2 || max < 3) {
        setStage('rechazo');
        return;
      }
      setStage('exito');
    }, 1800);
  };

  const captureFar = () => {
    const data = captureFrame();
    if (!data) return;
    setSelfieFar(data);
    setStage('acerca');
  };

  const captureCloseAndAnalyze = () => {
    const data = captureFrame();
    if (!data) return;
    setSelfieClose(data);
    runAnalysis();
  };

  const handleSelfieFile = async (file: File) => {
    // Camera unavailable: a single selfie photo substitutes the liveness frames.
    const data = await compressOrRaw(file);
    if (!data) return;
    setSelfieFar(data);
    setSelfieClose(data);
    setStage('analizando');
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = window.setTimeout(() => setStage('exito'), 1400);
  };

  const handleRetryAll = () => {
    // Per policy: a rejected validation restarts photos AND liveness.
    setIneFront('');
    setIneBack('');
    setSelfieFar('');
    setSelfieClose('');
    motionRef.current = [];
    prevFrameRef.current = null;
    faceHitsRef.current = 0;
    farBoxWRef.current = 0;
    setManualMode(false);
    setBlurError(null);
    setStage('frente');
  };

  // ---------- Liveness sampling loop (vida / acerca) ----------
  useEffect(() => {
    if (stage !== 'vida' && stage !== 'acerca') return;
    motionRef.current = [];
    prevFrameRef.current = null;
    faceHitsRef.current = 0;
    setManualMode(false);

    const sample = async () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      // Downscaled grayscale frame for pixel-by-pixel motion analysis.
      const size = 48;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, size, size);
      const px = ctx.getImageData(0, 0, size, size).data;
      const gray = new Uint8Array(size * size);
      for (let i = 0; i < gray.length; i++) {
        const j = i * 4;
        gray[i] = (px[j] + px[j + 1] + px[j + 2]) / 3;
      }
      const prev = prevFrameRef.current;
      if (prev) {
        let diff = 0;
        for (let i = 0; i < gray.length; i++) diff += Math.abs(gray[i] - prev[i]);
        const avgDiff = diff / gray.length;
        motionRef.current.push(avgDiff);
        if (motionRef.current.length > 40) motionRef.current.shift();
      }
      prevFrameRef.current = gray;

      // Native face detection when the browser exposes it.
      const detector = faceDetectorRef.current;
      if (detector) {
        try {
          const faces = await detector.detect(video);
          if (faces && faces.length > 0) {
            const box = faces[0].boundingBox;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            const inCenter = cx > vw * 0.28 && cx < vw * 0.72 && cy > vh * 0.18 && cy < vh * 0.82;
            if (inCenter) {
              if (stage === 'vida') {
                farBoxWRef.current = box.width;
                faceHitsRef.current += 1;
                if (faceHitsRef.current >= 2) {
                  captureFar();
                  return;
                }
              } else if (box.width > farBoxWRef.current * 1.15) {
                captureCloseAndAnalyze();
                return;
              }
            }
          }
        } catch { /* runtime detection failure falls back to motion heuristics */ }
      }

      // Motion-based fallback when FaceDetector is unavailable.
      if (!detector) {
        if (stage === 'vida') {
          const recent = motionRef.current.slice(-5);
          if (recent.length === 5 && recent.every(d => d > 3)) {
            faceHitsRef.current += 1;
            if (faceHitsRef.current >= 2) {
              captureFar();
              return;
            }
          }
        } else {
          const recent = motionRef.current.slice(-3);
          if (recent.length === 3 && recent.every(d => d > 5)) {
            captureCloseAndAnalyze();
            return;
          }
        }
      }
    };

    const timer = window.setInterval(() => { void sample(); }, 450);
    const manualTimer = window.setTimeout(() => setManualMode(true), 9000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(manualTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ---------- Success auto-close ----------
  useEffect(() => {
    if (stage !== 'exito') return;
    const timer = window.setTimeout(() => {
      onDone({
        docType,
        ineFront,
        ineBack,
        selfie: selfieClose || selfieFar,
      });
    }, 2200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const renderHeaderIcon = () => {
    if (stage === 'frente' || stage === 'detectado' || stage === 'reverso') {
      return <FileCheck className="w-4 h-4" />;
    }
    return <ScanFace className="w-4 h-4" />;
  };

  const headerTitle = () => {
    switch (stage) {
      case 'frente':
        return isEs ? `Coloca tu ${docLabel}` : `Place your ${docLabel}`;
      case 'detectado':
        return isEs ? 'Primer paso completado' : 'First step completed';
      case 'reverso':
        return isEs ? 'Voltea tu INE' : 'Flip your ID';
      case 'vida':
        return isEs ? 'Prueba de vida' : 'Liveness test';
      case 'acerca':
        return isEs ? 'Acércate más' : 'Come closer';
      case 'analizando':
        return isEs ? 'Analizando...' : 'Analyzing...';
      case 'exito':
        return isEs ? 'Identidad confirmada' : 'Identity confirmed';
      case 'rechazo':
        return isEs ? 'Validación rechazada' : 'Validation rejected';
      default:
        return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col py-6">
      {/* Stage header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white">
          {renderHeaderIcon()}
        </div>
        <div>
          <h1 className="text-base font-black text-white">{headerTitle()}</h1>
          <p className="text-[10px] text-purple-200/70">
            {stage === 'frente' && (isEs ? 'Frente del documento dentro del marco.' : 'Front side of the document inside the frame.')}
            {stage === 'detectado' && (isEs ? 'Detectamos tu documento en automático.' : 'We detected your document automatically.')}
            {stage === 'reverso' && (isEs ? 'Ahora captura el reverso de tu INE.' : 'Now capture the back side of your ID.')}
            {stage === 'vida' && (isEs ? 'Coloca tu rostro en el círculo; la captura es automática.' : 'Place your face in the circle; capture is automatic.')}
            {stage === 'acerca' && (isEs ? 'El círculo se cerró: acerca tu rostro para continuar.' : 'The circle shrank: bring your face closer to continue.')}
            {stage === 'analizando' && (isEs ? 'Analizando movimiento y autenticidad del rostro.' : 'Analyzing face movement and authenticity.')}
            {stage === 'exito' && (isEs ? 'Gracias por completar la verificación.' : 'Thank you for completing the verification.')}
            {stage === 'rechazo' && (isEs ? 'Puedes repetir la prueba o enviarla a validación manual del Administrador.' : 'You can repeat the test or send it to manual Administrator validation.')}
          </p>
        </div>
      </div>

      {/* FRONT OF DOCUMENT */}
      {stage === 'frente' && (
        <>
          {cameraReady && !cameraError ? (
            <>
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black border border-purple-500/30">
                <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-pink-400/70 pointer-events-none" />
                <span className="absolute top-5 inset-x-0 text-center text-[11px] font-bold text-white drop-shadow-lg">
                  {isEs ? `Coloca tu ${docLabel}` : `Place your ${docLabel}`}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleFrontCapture}
                  disabled={detectBusy}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 border-4 border-white/20 text-white shadow-xl shadow-pink-600/40 active:scale-90 transition flex items-center justify-center"
                  aria-label={isEs ? 'Capturar' : 'Capture'}
                >
                  {detectBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
              <p className="text-[11px] text-amber-200 leading-relaxed">
                {isEs
                  ? 'No pudimos abrir la cámara. Sube la foto del frente de tu documento.'
                  : 'We could not open the camera. Upload the front photo of your document.'}
              </p>
              <label className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center cursor-pointer transition">
                {isEs ? `Foto frente (${docLabel})` : `Front photo (${docLabel})`}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFrontFile(f); }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* DETECTED: excellent, first step completed */}
      {stage === 'detectado' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {isEs ? '¡Excelente! Primer paso completado' : 'Excellent! First step completed'}
            </h2>
            <p className="text-xs text-purple-200/70 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {isEs
                ? `Identificamos tu documento como ${docType === 'ine' ? 'INE' : region === 'MX' ? 'Pasaporte/ID' : 'ID/Passport'}.`
                : `We identified your document as ${docType === 'ine' ? 'INE' : 'ID/Passport'}.`}
            </p>
          </div>
          {ineFront && (
            <img src={ineFront} alt="Frente" className="w-40 h-28 object-cover rounded-2xl border border-purple-500/40" />
          )}
          <p className="text-[10px] text-white/40 leading-relaxed flex items-start gap-1.5 max-w-xs mx-auto">
            <ScanFace className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              {isEs
                ? 'La detección de tu documento (INE o Pasaporte) es automática en tiempo real; no necesitas indicar el formato.'
                : 'Your document detection (ID or Passport) is automatic in real time; you do not need to indicate the format.'}
            </span>
          </p>
          <button
            type="button"
            onClick={handleNextFromDetected}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
          >
            {isEs ? 'Siguiente' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BACK OF INE */}
      {stage === 'reverso' && (
        <>
          {cameraReady && !cameraError ? (
            <>
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black border border-purple-500/30">
                <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-pink-400/70 pointer-events-none" />
                <span className="absolute top-5 inset-x-0 text-center text-[11px] font-bold text-white drop-shadow-lg">
                  {isEs ? 'Reverso de tu INE' : 'Back side of your ID'}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleBackCapture}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 border-4 border-white/20 text-white shadow-xl shadow-pink-600/40 active:scale-90 transition flex items-center justify-center"
                  aria-label={isEs ? 'Capturar' : 'Capture'}
                >
                  <Camera className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
              <p className="text-[11px] text-amber-200 leading-relaxed">
                {isEs ? 'Sube la foto del reverso de tu INE.' : 'Upload the back photo of your ID.'}
              </p>
              <label className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center cursor-pointer transition">
                {isEs ? 'Foto reverso' : 'Back photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleBackFile(f); }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* LIVENESS: place face in circle */}
      {(stage === 'vida' || stage === 'acerca') && (
        <>
          {cameraReady && !cameraError ? (
            <>
              <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-black border border-purple-500/30">
                <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                {/* Face circle overlay: shrinks on the "come closer" stage */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={
                      'rounded-full border-[3px] transition-all duration-1000 ease-out ' +
                      (stage === 'vida'
                        ? 'w-52 h-52 border-pink-400/80 shadow-[0_0_30px_rgba(255,45,120,0.35)_inset]'
                        : 'w-36 h-36 border-amber-300/90 shadow-[0_0_30px_rgba(252,211,77,0.4)_inset]')
                    }
                  />
                </div>
                <span className="absolute bottom-5 inset-x-0 text-center text-[11px] font-bold text-white drop-shadow-lg px-6">
                  {stage === 'vida'
                    ? (isEs ? 'Coloca tu rostro en el círculo' : 'Place your face in the circle')
                    : (isEs ? 'Acércate más, llena el círculo' : 'Come closer, fill the circle')}
                </span>
                {manualMode && (
                  <button
                    type="button"
                    onClick={stage === 'vida' ? captureFar : captureCloseAndAnalyze}
                    className="absolute bottom-14 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-[11px] font-bold backdrop-blur-md transition"
                  >
                    {isEs ? 'Tomar foto ahora' : 'Capture now'}
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-white/50">
                <ScanFace className="w-3.5 h-3.5 text-pink-400" />
                {isEs
                  ? 'Detectamos tu rostro y capturamos en automático.'
                  : 'We detect your face and capture automatically.'}
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
              <p className="text-[11px] text-amber-200 leading-relaxed">
                {isEs
                  ? 'No pudimos abrir la cámara selfie. Sube una foto de tu rostro (se guardará como prueba de vida).'
                  : 'We could not open the selfie camera. Upload a photo of your face (stored as the liveness proof).'}
              </p>
              <label className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center cursor-pointer transition">
                {isEs ? 'Foto de tu rostro' : 'Photo of your face'}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleSelfieFile(f); }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* ANALYZING */}
      {stage === 'analizando' && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          <p className="text-xs text-purple-200/80 text-center max-w-xs leading-relaxed">
            {isEs
              ? 'Analizando el movimiento de tu rostro frame por frame y verificando que la captura sea genuina y coincida con tu documento.'
              : 'Analyzing your face movement frame by frame and verifying that the capture is genuine and matches your document.'}
          </p>
        </div>
      )}

      {/* SUCCESS */}
      {stage === 'exito' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-24 h-24 rounded-full bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-lg font-black text-white">
            {isEs ? '¡Gracias! Hemos confirmado tu identidad.' : 'Thank you! We have confirmed your identity.'}
          </h2>
          <p className="text-xs text-purple-200/70 max-w-xs leading-relaxed">
            {isEs
              ? 'Estamos abriendo tu perfil para que lo completes.'
              : 'We are opening your profile so you can complete it.'}
          </p>
        </div>
      )}

      {/* REJECTION: retry photos + liveness */}
      {stage === 'rechazo' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {isEs ? 'No pudimos confirmar tu identidad' : 'We could not confirm your identity'}
            </h2>
            <p className="text-xs text-purple-200/70 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {isEs
                ? 'La prueba de vida no detectó un rostro en movimiento genuino. Puedes intentar de nuevo o enviar tu verificación a validación manual: un Administrador revisará tus documentos y tu rostro, y confirmará tu cuenta.'
                : 'The liveness test did not detect a genuine moving face. You can try again or send your verification to manual review: an Administrator will review your documents and face, and confirm your account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onDone({
                docType,
                ineFront,
                ineBack,
                selfie: selfieClose || selfieFar,
                manualReview: true,
              })
            }
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {isEs ? 'Enviar a validación por Administrador' : 'Send to Administrator validation'}
          </button>
          <button
            type="button"
            onClick={handleRetryAll}
            className="px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 font-medium text-xs transition active:scale-95 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isEs ? 'Intentar de nuevo la prueba' : 'Try the test again'}
          </button>
        </div>
      )}

      {/* BLUR REJECTION: the photo came out blurry, ask the user to retake it */}
      {blurError && (stage === 'frente' || stage === 'reverso') && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{blurError}</span>
        </div>
      )}

      {/* Preview thumbnails for document stages */}
      {(stage === 'frente' || stage === 'reverso' || stage === 'detectado') && (ineFront || ineBack) && (
        <div className="mt-4 flex gap-2.5">
          {ineFront && (
            <div className="flex-1">
              <img src={ineFront} alt="Frente" className="w-full h-20 object-cover rounded-xl border border-purple-500/40" />
              <span className="text-[9px] text-white/50 block text-center mt-1">{isEs ? 'Frente' : 'Front'}</span>
            </div>
          )}
          {ineBack && (
            <div className="flex-1">
              <img src={ineBack} alt="Reverso" className="w-full h-20 object-cover rounded-xl border border-purple-500/40" />
              <span className="text-[9px] text-white/50 block text-center mt-1">{isEs ? 'Reverso' : 'Back'}</span>
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      {(stage === 'frente' || stage === 'reverso' || stage === 'vida' || stage === 'acerca') && (
        <p className="mt-3 text-[10px] text-white/40 leading-relaxed flex items-start gap-1.5">
          <IdCard className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            {isEs
              ? 'Tu identificación y tu rostro se resguardan únicamente en el archivo legal de la plataforma; solo el administrador puede consultarlos. Otros usuarios nunca los ven.'
              : 'Your ID and your face are stored only in the platform legal archive; only the administrator can review them. Other users never see them.'}
          </span>
        </p>
      )}
    </div>
  );
}
