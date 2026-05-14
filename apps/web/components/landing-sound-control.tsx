"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function LandingSoundControl() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<{
    context: AudioContext;
    oscillators: OscillatorNode[];
    gain: GainNode;
    filter: BiquadFilterNode;
  } | null>(null);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.04);
      for (const oscillator of audio.oscillators) oscillator.stop(audio.context.currentTime + 0.12);
      void audio.context.close();
      audioRef.current = null;
    };
  }, []);

  async function toggleSound() {
    if (enabled) {
      const audio = audioRef.current;
      if (audio) {
        audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.04);
        for (const oscillator of audio.oscillators) oscillator.stop(audio.context.currentTime + 0.14);
        window.setTimeout(() => void audio.context.close(), 180);
        audioRef.current = null;
      }
      setEnabled(false);
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const frequencies = [55, 82.41, 110];

    gain.gain.value = 0;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    filter.connect(gain);
    gain.connect(context.destination);

    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const oscillatorGain = context.createGain();

      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillatorGain.gain.value = index === 0 ? 0.34 : 0.12;
      oscillator.connect(oscillatorGain);
      oscillatorGain.connect(filter);
      oscillator.start();
      return oscillator;
    });

    gain.gain.setTargetAtTime(0.035, context.currentTime, 0.18);
    audioRef.current = { context, oscillators, gain, filter };
    await context.resume();
    setEnabled(true);
  }

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 border border-white/14 bg-black/20 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8a8f98] backdrop-blur transition-colors hover:border-white/28 hover:text-[#e7e9ed]"
      onClick={() => void toggleSound()}
      aria-pressed={enabled}
      title={enabled ? "Mute landing sound" : "Enable landing sound"}
    >
      {enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
      {enabled ? "Sound on" : "Sound"}
    </button>
  );
}
