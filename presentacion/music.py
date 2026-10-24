"""Generates a soft 30 s ambient pad (music.wav) with the standard library only."""
import math, wave, struct, sys
SR, DUR = 44100, 30.0
out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
# chord progression (Hz): Am9 - Fmaj7 - C - G(add9), 7.5 s each
chords = [[220.0, 261.63, 329.63, 493.88], [174.61, 220.0, 261.63, 329.63],
          [130.81, 196.0, 261.63, 329.63], [196.0, 246.94, 293.66, 440.0]]
seg = DUR / len(chords)
n = int(SR * DUR)
frames = bytearray()
for i in range(n):
    t = i / SR
    k = min(int(t // seg), len(chords) - 1)
    lt = t - k * seg
    env_c = min(1.0, lt / 1.2) * min(1.0, (seg - lt) / 1.2 + 0.25)
    s = 0.0
    for j, f in enumerate(chords[k]):
        s += math.sin(2 * math.pi * f * t + j) * (0.9 if j else 1.0)
        s += 0.25 * math.sin(2 * math.pi * f * 2.003 * t)
    s *= env_c / 6.0
    # gentle pulse
    s *= 0.85 + 0.15 * math.sin(2 * math.pi * 0.5 * t)
    master = min(1.0, t / 1.5) * min(1.0, (DUR - t) / 2.0)
    v = int(max(-1, min(1, s * 0.22 * master)) * 32767)
    frames += struct.pack('<hh', v, v)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(frames))
