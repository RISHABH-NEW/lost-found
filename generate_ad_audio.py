import numpy as np
import wave

def generate_uplifting_soundtrack(output_wav_path, duration=20.0, sample_rate=48000):
    total_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)
    
    # -------------------------------------------------------------
    # 1. UPLIFTING CINEMATIC MUSIC BED (D Major / G Major / B Minor)
    # Bright piano & acoustic guitar-style plucked synth arpeggio
    # -------------------------------------------------------------
    # Note frequencies
    D3, E3, Fs3, G3, A3, B3 = 146.83, 164.81, 185.00, 196.00, 220.00, 246.94
    D4, E4, Fs4, G4, A4, B4, Cs5, D5, E5, Fs5, A5 = (
        293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33, 659.25, 739.99, 880.00
    )
    G5, B5 = 783.99, 987.77
    
    # Bass warm drone & chords
    # 0 - 4s: G (Lost something)
    # 4 - 8s: Bm (Someone found it)
    # 8 - 12s: A / Em (Reporting it)
    # 12 - 16s: D / G (Relief / Notification)
    # 16 - 20s: D major full resolution
    chords = [
        (0.0, 4.2, [G3, D4, G4, B4], 98.0),       # G maj
        (4.0, 8.2, [B3, Fs4, B4, D5], 123.47),     # B min
        (8.0, 12.2, [E3, B3, E4, G4, B4], 82.41),  # E min
        (12.0, 16.2, [A3, E4, A4, Cs5], 110.0),    # A maj / D
        (16.0, 20.0, [D3, A3, D4, Fs4, A4], 73.42) # D maj warm resolution
    ]
    
    for c_start, c_end, freqs, bass_f in chords:
        mask = (t >= c_start) & (t <= c_end)
        idx = np.where(mask)[0]
        lt = t[idx] - c_start
        dur = c_end - c_start
        env = np.clip(lt / 0.8, 0, 1) * np.clip((dur - lt) / 0.8, 0, 1)
        env = 0.5 * (1.0 - np.cos(np.pi * env))
        
        # Warm sub bass
        b_sig = (0.20 * np.sin(2 * np.pi * bass_f * lt) + 
                 0.10 * np.sin(2 * np.pi * (bass_f * 2) * lt)) * env
        left[idx] += b_sig
        right[idx] += b_sig
        
        # Warm pad chords with gentle stereo chorus
        for f in freqs:
            pad_l = np.sin(2 * np.pi * f * lt + 0.1 * np.sin(2 * np.pi * 0.4 * lt))
            pad_r = np.sin(2 * np.pi * (f * 1.003) * lt + 0.1 * np.sin(2 * np.pi * 0.45 * lt + 1.5))
            pad_harm = 0.25 * np.sin(2 * np.pi * (f * 2) * lt)
            amp = 0.04 / len(freqs)
            left[idx] += (pad_l + pad_harm) * amp * env
            right[idx] += (pad_r + pad_harm) * amp * env

    # Bright rhythmic piano / acoustic pluck pattern (16th notes, tempo = 110 BPM -> 0.2727s per beat)
    # Uplifting arpeggio pattern
    beat_dur = 0.2727
    arpeggio_notes = [
        # 0 - 4s (G)
        D4, G4, B4, D5, G4, B4, D5, G5,
        D4, G4, B4, D5, G4, B4, D5, G5,
        # 4 - 8s (Bm)
        Fs4, B4, D5, Fs5, B4, D5, Fs5, A5,
        Fs4, B4, D5, Fs5, B4, D5, Fs5, A5,
        # 8 - 12s (Em / A)
        E4, G4, B4, E5, G4, B4, E5, G5,
        E4, A4, Cs5, E5, A4, Cs5, E5, A5,
        # 12 - 16s (D / G - uplifting relief)
        Fs4, A4, D5, Fs5, A4, D5, Fs5, A5,
        G4, B4, D5, G5, B4, D5, G5, B5,
        # 16 - 20s (D resolution)
        Fs4, A4, D5, Fs5, A4, D5, Fs5, A5,
        D4, Fs4, A4, D5, Fs4, A4, D5, Fs5
    ]
    
    for i, note_f in enumerate(arpeggio_notes):
        note_t = i * (beat_dur / 2.0) # 8th notes
        if note_t >= duration - 0.5:
            break
        n_idx = np.where((t >= note_t) & (t < note_t + 0.6))[0]
        if len(n_idx) == 0: continue
        lt = t[n_idx] - note_t
        # Acoustic pluck decay envelope
        pluck = (np.sin(2 * np.pi * note_f * lt) + 
                 0.4 * np.sin(2 * np.pi * note_f * 2 * lt) +
                 0.15 * np.sin(2 * np.pi * note_f * 3 * lt)) * np.exp(-9.0 * lt)
        
        # Build velocity gradually
        intensity = 0.05 + 0.07 * np.clip(note_t / 15.0, 0, 1)
        pan = np.sin(note_t * 1.5) * 0.4
        left[n_idx] += pluck * intensity * (1.0 - pan)
        right[n_idx] += pluck * intensity * (1.0 + pan)

    # Subtle rhythmic heartbeat / modern kick (enters gently at 4s, drives through 18s)
    kick_times = np.arange(4.0, 18.5, 0.5454) # quarter notes at 110 BPM
    for kt in kick_times:
        k_idx = np.where((t >= kt) & (t < kt + 0.25))[0]
        if len(k_idx) > 0:
            lt = t[k_idx] - kt
            k_f = 95.0 * np.exp(-25.0 * lt) + 40.0
            k_phase = 2 * np.pi * np.cumsum(k_f) / sample_rate
            k_sound = np.sin(k_phase) * np.exp(-12.0 * lt) * 0.14
            left[k_idx] += k_sound
            right[k_idx] += k_sound

    # -------------------------------------------------------------
    # 2. SUBTLE REALISTIC SOUND EFFECTS (SFX)
    # -------------------------------------------------------------
    
    # SFX 1: Corridor footstep taps (0.0s - 3.5s)
    for st in [0.4, 0.9, 1.4, 1.9, 2.3]:
        s_idx = np.where((t >= st) & (t < st + 0.12))[0]
        if len(s_idx) > 0:
            lt = t[s_idx] - st
            step_noise = np.random.uniform(-1, 1, len(lt)) * np.exp(-35.0 * lt) * 0.03
            left[s_idx] += step_noise
            right[s_idx] += step_noise

    # SFX 2: Phone slips and drops on polished floor (at 2.4s)
    # Initial clack of phone edge hitting marble + bounce
    drop_times = [(2.38, 0.22, 1200.0), (2.52, 0.12, 1400.0), (2.62, 0.06, 1600.0)]
    for dt, vol, f_clack in drop_times:
        d_idx = np.where((t >= dt) & (t < dt + 0.15))[0]
        if len(d_idx) > 0:
            lt = t[d_idx] - dt
            # Sharp transient click + resonant body
            click = (np.sin(2 * np.pi * f_clack * lt) + 0.5 * np.sin(2 * np.pi * (f_clack * 1.8) * lt)) * np.exp(-55.0 * lt)
            scrape = np.random.uniform(-1, 1, len(lt)) * np.exp(-40.0 * lt) * 0.5
            hit = (click + scrape) * vol * 0.35
            left[d_idx] += hit * 0.9
            right[d_idx] += hit * 1.1

    # SFX 3: Student crouches and picks up phone (4.5s)
    p_idx = np.where((t >= 4.5) & (t < 4.7))[0]
    if len(p_idx) > 0:
        lt = t[p_idx] - 4.5
        pickup_scrape = np.random.uniform(-1, 1, len(lt)) * np.exp(-25.0 * lt) * 0.035
        left[p_idx] += pickup_scrape * 1.1
        right[p_idx] += pickup_scrape * 0.9

    # SFX 4: App screen interaction click (8.6s)
    tap_idx = np.where((t >= 8.6) & (t < 8.75))[0]
    if len(tap_idx) > 0:
        lt = t[tap_idx] - 8.6
        tap_sound = np.sin(2 * np.pi * 1800.0 * lt) * np.exp(-60.0 * lt) * 0.06
        left[tap_idx] += tap_sound
        right[tap_idx] += tap_sound

    # SFX 5: Report submitted success whoosh (11.0s)
    sub_idx = np.where((t >= 11.0) & (t < 11.8))[0]
    if len(sub_idx) > 0:
        lt = t[sub_idx] - 11.0
        whoosh_f = 400.0 + 1200.0 * (lt / 0.8)**2
        whoosh_phase = 2 * np.pi * np.cumsum(whoosh_f) / sample_rate
        whoosh = np.sin(whoosh_phase) * np.sin(np.pi * lt / 0.8) * 0.05
        left[sub_idx] += whoosh * 0.8
        right[sub_idx] += whoosh * 1.2

    # SFX 6: CRYSTAL CLEAR NOTIFICATION CHIME (12.15s)
    # Distinctive, elegant Apple/Google-style two-tone ding: E6 (1318.5 Hz) -> B6 (1975.5 Hz)
    notif_notes = [(12.15, 1318.5, 0.22), (12.28, 1975.5, 0.28)]
    for nt, nf, n_amp in notif_notes:
        n_idx = np.where((t >= nt) & (t < nt + 1.2))[0]
        if len(n_idx) > 0:
            lt = t[n_idx] - nt
            bell = (np.sin(2 * np.pi * nf * lt) + 
                    0.25 * np.sin(2 * np.pi * nf * 2 * lt) + 
                    0.08 * np.sin(2 * np.pi * nf * 3 * lt)) * np.exp(-5.0 * lt) * n_amp
            left[n_idx] += bell * 0.95
            right[n_idx] += bell * 1.05

    # SFX 7: Gentle campus ambient breeze & light atmosphere (12.0s - 17.0s)
    camp_idx = np.where((t >= 12.0) & (t < 17.0))[0]
    if len(camp_idx) > 0:
        lt = t[camp_idx] - 12.0
        noise = np.random.uniform(-1, 1, len(lt))
        # Soft moving average
        breeze = np.convolve(noise, np.ones(80)/80, mode='same') * 0.015
        left[camp_idx] += breeze
        right[camp_idx] += breeze

    # SFX 8: Meeting & Phone handoff soft rustle (16.4s)
    meet_idx = np.where((t >= 16.4) & (t < 16.8))[0]
    if len(meet_idx) > 0:
        lt = t[meet_idx] - 16.4
        rustle = np.random.uniform(-1, 1, len(lt)) * np.exp(-15.0 * lt) * 0.02
        left[meet_idx] += rustle
        right[meet_idx] += rustle

    # SFX 9: Final cinematic brand reveal chime & warm chord swell (18.8s)
    rev_idx = np.where((t >= 18.8) & (t < 20.0))[0]
    if len(rev_idx) > 0:
        lt = t[rev_idx] - 18.8
        shimmer = (np.sin(2 * np.pi * 1174.66 * lt) + 
                   np.sin(2 * np.pi * 1760.00 * lt) + 
                   np.sin(2 * np.pi * 2349.32 * lt)) * np.exp(-3.0 * lt) * 0.07
        left[rev_idx] += shimmer
        right[rev_idx] += shimmer

    # Master Fade In (0 to 0.4s) and Fade Out (19.4 to 20.0s)
    fade_in = np.clip(t / 0.4, 0, 1)
    fade_out = np.clip((duration - t) / 0.6, 0, 1)
    master_env = fade_in * fade_out
    
    left *= master_env
    right *= master_env
    
    # Normalize with headroom
    max_val = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-5)
    gain = 0.88 / max_val
    left = np.clip(left * gain, -0.99, 0.99)
    right = np.clip(right * gain, -0.99, 0.99)
    
    # 16-bit PCM stereo
    left_16 = (left * 32767).astype(np.int16)
    right_16 = (right * 32767).astype(np.int16)
    stereo = np.empty((total_samples * 2,), dtype=np.int16)
    stereo[0::2] = left_16
    stereo[1::2] = right_16
    
    with wave.open(output_wav_path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(stereo.tobytes())
        
    print(f"Uplifting ad soundtrack generated: {output_wav_path}")

if __name__ == '__main__':
    generate_uplifting_soundtrack('lost_found_ad_audio.wav')
