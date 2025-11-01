// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";

// Metronome component with onMetronomeClick event
// Uses Web Audio API + requestAnimationFrame (no setTimeout / setInterval)

export default function Metronome({ onMetronomeClick }: { onMetronomeClick?: (isAccent: boolean) => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [currentBeat, setCurrentBeat] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const nextNoteTimeRef = useRef(0);
  const beatIndexRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const recentTapsRef = useRef<number[]>([]);

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainRef.current = master;
    }
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  };

  const spb = useMemo(() => 60 / Math.max(20, Math.min(300, bpm)), [bpm]);

  const scheduleClick = (time: number, isAccent: boolean, beatIndex: number) => {
    const ctx = audioCtxRef.current!;
    const out = gainRef.current!;

    const osc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(isAccent ? 1800 : 1200, time);

    const peak = isAccent ? 0.9 : 0.6;
    const dur = 0.04;
    clickGain.gain.setValueAtTime(0.0001, time);
    clickGain.gain.exponentialRampToValueAtTime(peak, time + 0.005);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(clickGain);
    clickGain.connect(out);

    osc.start(time);
    osc.stop(time + dur + 0.01);

    // Fire event callback
    if (onMetronomeClick) {
      onMetronomeClick(isAccent);
    }
  };

  const scheduler = () => {
    const ctx = audioCtxRef.current!;
    const scheduleAheadTime = 0.1;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isAccent = beatIndexRef.current % beatsPerMeasure === 0;
      scheduleClick(nextNoteTimeRef.current, isAccent, beatIndexRef.current);

      const uiBeat = beatIndexRef.current % beatsPerMeasure;
      requestAnimationFrame(() => setCurrentBeat(uiBeat));

      nextNoteTimeRef.current += spb;
      beatIndexRef.current += 1;
    }

    rafIdRef.current = requestAnimationFrame(scheduler);
  };

  const start = async () => {
    await ensureAudio();
    const ctx = audioCtxRef.current!;

    beatIndexRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    setIsRunning(true);
    rafIdRef.current = requestAnimationFrame(scheduler);
  };

  const stop = () => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    setIsRunning(false);
    setCurrentBeat(null);
  };

  const toggle = () => (isRunning ? stop() : start());

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRunning]);

  const tap = () => {
    const now = performance.now();
    const arr = recentTapsRef.current;
    arr.push(now);

    if (arr.length > 6) arr.shift();
    if (arr.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < arr.length; i++) intervals.push(arr[i] - arr[i - 1]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.max(20, Math.min(300, Math.round(60000 / avgMs)));
      setBpm(newBpm);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <kbd className="text-xs text-neutral-600">Press Space to {isRunning ? "stop" : "start"}</kbd>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl shadow border">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-neutral-500">Tempo</span>
            <span className="text-3xl font-bold tabular-nums">{bpm} BPM</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full mt-4"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-xl border shadow-sm text-sm"
              onClick={() => setBpm((b) => Math.max(20, b - 1))}
            >
              -1
            </button>
            <button
              className="px-3 py-1.5 rounded-xl border shadow-sm text-sm"
              onClick={() => setBpm((b) => Math.min(300, b + 1))}
            >
              +1
            </button>
            <button
              className="ml-auto px-3 py-1.5 rounded-xl border shadow-sm text-sm"
              onClick={tap}
              title="Tap tempo"
            >
              Tap
            </button>
          </div>
        </div>

        {/* <div className="p-5 rounded-2xl shadow border">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-neutral-500">Beats per measure</span>
            <span className="text-3xl font-bold tabular-nums">{beatsPerMeasure}</span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            value={beatsPerMeasure}
            onChange={(e) => setBeatsPerMeasure(parseInt(e.target.value))}
            className="w-full mt-4"
          />
          <div className="mt-3 text-sm text-neutral-600">Accent on beat 1</div>
        </div> */}
      </div>

      <div className="flex items-center gap-3 justify-center">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => {
          const isActive = currentBeat === i && isRunning;
          const isAccent = i === 0;
          return (
            <div
              key={i}
              className={[
                "h-6 w-6 rounded-full transition-transform duration-80",
                isAccent ? "ring-2 ring-neutral-400" : "",
                isActive ? "scale-125 bg-black" : "bg-neutral-300",
              ].join(" ")}
            />
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={toggle}
          className={`px-5 py-2 rounded-2xl shadow border text-sm ${
            isRunning ? "bg-black text-white" : "bg-white"
          }`}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
        <button
          onClick={() => {
            stop();
            setBpm(100);
            setBeatsPerMeasure(4);
          }}
          className="px-5 py-2 rounded-2xl shadow border text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}