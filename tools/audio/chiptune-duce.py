"""Make a chiptune cover of "The Duce Puts On His Uniform" that lines up with the recording sample for sample.

    python3 tools/audio/chiptune-duce.py assets/audio/duce-uniform.mp3 assets/audio/duce-chiptune.mp3

The recording is analysed (beat times, key, melody, bass, chords, drum hits), the notes are written down on the recording's
own beat grid (so tempo drift in the performance is followed, not averaged away), and the result is synthesised with
pulse, triangle and noise channels and rendered to exactly the recording's length. Only note data derived from the tune is
used; no audio from the recording is kept. Needs numpy, scipy, librosa, soundfile and ffmpeg.
"""
import subprocess, sys, json, os, tempfile
import numpy as np, librosa, soundfile as sf

SR_ANALYSIS = 22050
SR_OUT = 32000
OFFSET = float(os.environ.get('CHIP_OFFSET', '-0.033'))  # seconds added to every note: calibrates the cover against the recording's onsets
src, dst = sys.argv[1], sys.argv[2]
tmp = tempfile.mkdtemp()
wav = os.path.join(tmp, 'in.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SR_ANALYSIS), wav], check=True)
y, sr = librosa.load(wav, sr=SR_ANALYSIS)
dur = len(y) / sr
print('duration', round(dur, 3))

# ---------- Beat grid ----------
yh, yp = librosa.effects.hpss(y)
onset_env = librosa.onset.onset_strength(y=yp, sr=sr)
tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, tightness=120)
beats = librosa.frames_to_time(beat_frames, sr=sr)
tempo = float(np.atleast_1d(tempo)[0])
ibi = np.diff(beats)
print('tempo', round(tempo, 1), 'beats', len(beats), 'ibi median', round(float(np.median(ibi)), 3), 'std', round(float(ibi.std()), 3))
# Extend the grid to cover the whole recording (before the first and after the last detected beat).
med = float(np.median(ibi))
pre = []
t = beats[0] - med
while t > -med:
    pre.append(t)
    t -= med
post = []
t = beats[-1] + med
while t < dur + med:
    post.append(t)
    t += med
beats = np.array(sorted(pre) + list(beats) + post)
SUB = 4  # 16th-note grid
def grid_times():
    out = []
    for a, b in zip(beats[:-1], beats[1:]):
        for k in range(SUB):
            out.append(a + (b - a) * k / SUB)
    return np.array(out)
G = grid_times()
print('grid points', len(G))

# ---------- Key ----------
chroma = librosa.feature.chroma_cqt(y=yh, sr=sr, hop_length=512)
ctimes = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=512)
prof = chroma.mean(axis=1)
maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
best = (-2, None)
for k in range(12):
    for name, p in (('major', maj), ('minor', mnr)):
        c = np.corrcoef(prof, np.roll(p, k))[0, 1]
        if c > best[0]:
            best = (c, (k, name))
tonic, mode = best[1]
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
print('key', NAMES[tonic], mode, round(best[0], 2))
scale = [(tonic + i) % 12 for i in ([0, 2, 4, 5, 7, 9, 11] if mode == 'major' else [0, 2, 3, 5, 7, 8, 10])]
# Allow the harmonic-minor raised seventh, common in this kind of tune.
if mode == 'minor':
    scale.append((tonic + 11) % 12)

def snap_to_scale(m):
    m = int(round(m))
    if m % 12 in scale:
        return m
    for d in (1, -1, 2, -2):
        if (m + d) % 12 in scale:
            return m + d
    return m

# ---------- Melody (voice / lead) ----------
f0, voiced, prob = librosa.pyin(yh, fmin=librosa.note_to_hz('A2'), fmax=librosa.note_to_hz('E6'), sr=sr, frame_length=2048, hop_length=256, fill_na=np.nan)
ftimes = librosa.times_like(f0, sr=sr, hop_length=256)
midi = np.where(voiced & ~np.isnan(f0), librosa.hz_to_midi(np.where(np.isnan(f0), 1, f0)), np.nan)
print('voiced fraction', round(float(np.mean(~np.isnan(midi))), 2))

def grid_index(t):
    return int(np.clip(np.searchsorted(G, t - 1e-6), 0, len(G) - 1))

# Per grid cell: median pitch over the cell.
cell_pitch = np.full(len(G), np.nan)
for i in range(len(G) - 1):
    m = (ftimes >= G[i]) & (ftimes < G[i + 1])
    v = midi[m]
    v = v[~np.isnan(v)]
    if len(v) >= max(2, 0.5 * m.sum()):
        cell_pitch[i] = np.median(v)
mel = []  # (start_cell, length_cells, midi)
i = 0
while i < len(G) - 1:
    if np.isnan(cell_pitch[i]):
        i += 1
        continue
    p = snap_to_scale(cell_pitch[i])
    j = i + 1
    while j < len(G) - 1 and not np.isnan(cell_pitch[j]) and abs(snap_to_scale(cell_pitch[j]) - p) == 0:
        j += 1
    mel.append([i, j - i, p])
    i = j
# Drop one-cell blips that jump far from both neighbours, and fill 1-cell gaps by extending the previous note.
clean = []
for k, (s, n, p) in enumerate(mel):
    prev = mel[k - 1] if k else None
    nxt = mel[k + 1] if k + 1 < len(mel) else None
    if n == 1 and prev and nxt and abs(p - prev[2]) > 4 and abs(p - nxt[2]) > 4:
        continue
    clean.append([s, n, p])
mel = clean
print('melody notes', len(mel))

# ---------- Bass and chords (per beat) ----------
cqt = np.abs(librosa.cqt(yh, sr=sr, hop_length=512, fmin=librosa.note_to_hz('C1'), n_bins=36, bins_per_octave=12))  # C1..B3
bass_midi = []
for a, b in zip(beats[:-1], beats[1:]):
    m = (ctimes >= a) & (ctimes < b)
    if m.sum() == 0:
        bass_midi.append(None)
        continue
    e = cqt[:, m].mean(axis=1)
    k = int(np.argmax(e))
    bass_midi.append(24 + k if e[k] > 0.15 * cqt.max() else None)
TRIADS = {}
for r in range(12):
    TRIADS[(r, 'maj')] = [(r) % 12, (r + 4) % 12, (r + 7) % 12]
    TRIADS[(r, 'min')] = [(r) % 12, (r + 3) % 12, (r + 7) % 12]
chords = []
for a, b in zip(beats[:-1], beats[1:]):
    m = (ctimes >= a) & (ctimes < b)
    c = chroma[:, m].mean(axis=1) if m.sum() else prof
    bestc, bn = -1, None
    for key, notes in TRIADS.items():
        score = c[notes].sum() - 0.4 * c[[n for n in range(12) if n not in notes]].mean() * 3
        if score > bestc:
            bestc, bn = score, key
    chords.append(bn)

# ---------- Drums ----------
# Kick/snare feel from the low and mid onset energy at each beat; the pattern is then regularised to the metre.
S = np.abs(librosa.stft(yp, n_fft=1024, hop_length=256))
freqs = librosa.fft_frequencies(sr=sr, n_fft=1024)
low = S[freqs < 150].sum(axis=0)
mid = S[(freqs > 1500) & (freqs < 5000)].sum(axis=0)
dtimes = librosa.times_like(low, sr=sr, hop_length=256)
def energy_at(sig, t, w=0.06):
    m = (dtimes >= t) & (dtimes < t + w)
    return float(sig[m].max()) if m.any() else 0.0
lo_beat = np.array([energy_at(low, t) for t in beats])
mi_beat = np.array([energy_at(mid, t) for t in beats])
# Downbeat phase: which of 4 positions has the strongest low-end.
phase = int(np.argmax([lo_beat[p::4].mean() for p in range(4)]))
print('downbeat phase', phase)

# ---------- Synthesis ----------
sr_o = SR_OUT
N = int(dur * sr_o)
mix = np.zeros(N, dtype=np.float32)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(buf, start, sig, gain):
    i0 = int((start + OFFSET) * sr_o)
    if i0 >= N or i0 < 0:
        return
    i1 = min(N, i0 + len(sig))
    buf[i0:i1] += gain * sig[: i1 - i0]

def pulse(freq, length, duty=0.5, vib=0.0, vib_delay=0.15):
    t = np.arange(int(length * sr_o)) / sr_o
    f = freq * (1 + vib * np.where(t > vib_delay, np.sin(2 * np.pi * 5.5 * t), 0))
    ph = np.cumsum(f) / sr_o
    return np.where((ph % 1.0) < duty, 1.0, -1.0).astype(np.float32)

def tri(freq, length):
    t = np.arange(int(length * sr_o)) / sr_o
    ph = (freq * t) % 1.0
    return (4 * np.abs(ph - 0.5) - 1).astype(np.float32)

def env(length, attack=0.004, release=0.04, decay=0.0):
    n = int(length * sr_o)
    e = np.ones(n, dtype=np.float32)
    a = max(1, int(attack * sr_o))
    e[:a] = np.linspace(0, 1, a)
    r = max(1, int(release * sr_o))
    e[-r:] *= np.linspace(1, 0, r)
    if decay:
        e *= np.exp(-np.arange(n) / sr_o / decay).astype(np.float32)
    return e

rng = np.random.default_rng(7)
def noise_hit(length, decay, hp=False):
    n = int(length * sr_o)
    x = rng.uniform(-1, 1, n).astype(np.float32)
    # 1-bit-ish noise: hold samples to lower the pitch
    hold = 3 if not hp else 1
    x = np.repeat(x[:: hold], hold)[:n]
    return x * np.exp(-np.arange(n) / sr_o / decay).astype(np.float32)
def kick(length=0.14):
    t = np.arange(int(length * sr_o)) / sr_o
    f = 130 * np.exp(-t * 28) + 42
    return (np.sin(2 * np.pi * np.cumsum(f) / sr_o) * np.exp(-t / 0.07)).astype(np.float32)

cell_dur = lambda i: G[min(i + 1, len(G) - 1)] - G[i] if i + 1 < len(G) else 0.1

# Lead: pulse 25%, with vibrato on long notes, an octave of headroom taken from the sung line.
for s, n, p in mel:
    t0 = G[s]
    length = (G[min(s + n, len(G) - 1)] - t0) * 0.96
    if length < 0.03:
        continue
    sig = pulse(mtof(p), length, duty=0.25, vib=0.004 if length > 0.35 else 0.0) * env(length, release=0.03)
    add(mix, t0, sig, 0.22)
    # A quiet 50% pulse an octave up for the sparkle.
    add(mix, t0, pulse(mtof(p + 12), length, duty=0.5) * env(length, release=0.03), 0.04)

# Bass: triangle on the detected root (folded to C2..B3), a walking feel via the 8th between beats.
for bi, (a, b) in enumerate(zip(beats[:-1], beats[1:])):
    ch = chords[bi]
    root = ch[0] if ch else tonic
    bm = bass_midi[bi]
    if bm is None:
        bm = 36 + ((root - 36) % 12)
    else:
        bm = 36 + ((bm - 36) % 24) if bm >= 36 else bm
    bm = int(np.clip(bm, 33, 55))
    L = (b - a) * 0.9
    add(mix, a, tri(mtof(bm), L) * env(L, release=0.03), 0.34)
    # off-beat fifth
    if (bi - phase) % 2 == 1 and ch:
        fifth = bm + 7 if bm + 7 < 58 else bm - 5
        Lh = (b - a) * 0.45
        add(mix, a + (b - a) * 0.5, tri(mtof(fifth), Lh) * env(Lh, release=0.02), 0.2)

# Arpeggio on a thin pulse: chord tones on the 16th grid, quiet.
for bi, (a, b) in enumerate(zip(beats[:-1], beats[1:])):
    ch = chords[bi]
    if not ch:
        continue
    notes = [60 + ((n - 60) % 12) for n in TRIADS[ch]]
    for k in range(SUB):
        t0 = a + (b - a) * k / SUB
        m = notes[(k + (1 if k % 2 else 0)) % 3] + (12 if k == 2 else 0)
        L = (b - a) / SUB * 0.7
        add(mix, t0, pulse(mtof(m), L, duty=0.125) * env(L, attack=0.002, release=0.01), 0.055)

# Drums: kick on 1 and 3, snare on 2 and 4, closed hat on the 8ths; a fill into every fourth bar.
for bi, (a, b) in enumerate(zip(beats[:-1], beats[1:])):
    pos = (bi - phase) % 4
    bar = (bi - phase) // 4
    if pos in (0, 2):
        add(mix, a, kick(), 0.5)
    if pos in (1, 3):
        add(mix, a, noise_hit(0.12, 0.05), 0.32)
    for k in (0, 2):
        add(mix, a + (b - a) * k / SUB, noise_hit(0.03, 0.012, hp=True), 0.08)
    if pos == 3 and bar % 4 == 3:  # fill: 16th snares
        for k in (2, 3):
            add(mix, a + (b - a) * k / SUB, noise_hit(0.07, 0.03), 0.22)

# Gentle limiter, normalise.
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
target_rms = float(np.sqrt(np.mean(y ** 2)))  # same loudness as the recording, so the crossfade does not jump in level
mix *= target_rms / max(1e-6, float(np.sqrt(np.mean(mix ** 2))))
peak = float(np.abs(mix).max())
if peak > 0.95:
    mix *= 0.95 / peak
print('rms', round(target_rms, 4), 'peak', round(float(np.abs(mix).max()), 3))
# Fade the very ends so the loop point is click-free.
f = int(0.01 * sr_o)
mix[:f] *= np.linspace(0, 1, f)
mix[-f:] *= np.linspace(1, 0, f)
out_wav = os.path.join(tmp, 'chip.wav')
sf.write(out_wav, mix, sr_o)
# Same length as the recording: pad or trim to the exact sample count, then encode (mono, the recording is mono).
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out_wav, '-af', f'apad=whole_dur={dur}', '-t', f'{dur}', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', dst], check=True)
print('wrote', dst, os.path.getsize(dst) // 1024, 'KB')
