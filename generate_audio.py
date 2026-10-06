import numpy as np
import wave
import struct

def generate_cinematic_audio(output_wav_path, duration=20.0, sample_rate=48000):
    total_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    
    # Left and Right stereo channels
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)
    
    # 1. Warm cinematic sub drone (45Hz with 2nd and 3rd harmonics)
    drone_f = 46.25 # F#1 / D / whatever, let's use 55Hz (A1)
    drone_env = np.clip(t / 2.0, 0, 1) * np.clip((duration - t) / 1.5, 0, 1)
    drone = (
        0.35 * np.sin(2 * np.pi * 55.0 * t) +
        0.18 * np.sin(2 * np.pi * 110.0 * t + 0.2) +
        0.08 * np.sin(2 * np.pi * 165.0 * t + 0.5)
    ) * drone_env
    left += drone * 0.95
    right += drone * 1.05
    
    # 2. Cinematic Warm Ambient Chord Pads (detuned saw/sine blend with slow chorusing)
    # Chord progression:
    # 0s - 5s: D minor (D3 146.83, F3 174.61, A3 220.00, C4 261.63)
    # 5s - 10s: Bb major 7 (Bb2 116.54, F3 174.61, A3 220.00, D4 293.66)
    # 10s - 15s: C sus2 / Cadd9 (C3 130.81, G3 196.00, D4 293.66, E4 329.63)
    # 15s - 20s: D minor 9 (D3 146.83, A3 220.00, C4 261.63, E4 329.63, F4 349.23)
    
    chords = [
        (0.0, 5.2, [146.83, 174.61, 220.00, 261.63]),
        (4.8, 10.2, [116.54, 174.61, 220.00, 293.66]),
        (9.8, 15.2, [130.81, 196.00, 293.66, 329.63]),
        (14.8, 20.0, [146.83, 220.00, 261.63, 329.63, 349.23])
    ]
    
    for c_start, c_end, freqs in chords:
        mask = (t >= c_start) & (t <= c_end)
        idx = np.where(mask)[0]
        local_t = t[idx] - c_start
        chord_dur = c_end - c_start
        
        # Soft crossfade envelope
        attack = 1.2
        release = 1.2
        c_env = np.ones_like(local_t)
        c_env = np.minimum(c_env, local_t / attack)
        c_env = np.minimum(c_env, (chord_dur - local_t) / release)
        c_env = np.clip(c_env, 0, 1)
        # S-curve smoothing
        c_env = 0.5 * (1 - np.cos(np.pi * c_env))
        
        for i, f in enumerate(freqs):
            # Gentle detune for lush wide stereo
            detune = 1.002
            chorus_l = np.sin(2 * np.pi * f * local_t + 0.1 * np.sin(2 * np.pi * 0.3 * local_t))
            chorus_r = np.sin(2 * np.pi * (f * detune) * local_t + 0.1 * np.sin(2 * np.pi * 0.35 * local_t + 1.0))
            
            # Subtle warm harmonics
            harm_l = 0.3 * np.sin(2 * np.pi * f * 2 * local_t)
            harm_r = 0.3 * np.sin(2 * np.pi * (f * detune) * 2 * local_t)
            
            amp = 0.05 / len(freqs)
            left[idx] += (chorus_l + harm_l) * amp * c_env
            right[idx] += (chorus_r + harm_r) * amp * c_env

    # 3. Futuristic Sub-Pulse / Heartbeat rhythm (starts at 3.0s, BPM ~ 75, beats every 0.8s)
    beat_times = np.arange(3.2, 19.0, 0.8)
    for bt in beat_times:
        b_idx = np.where((t >= bt) & (t < bt + 0.35))[0]
        if len(b_idx) > 0:
            lt = t[b_idx] - bt
            # Pitch drop 85Hz -> 45Hz
            pitch = 85.0 * np.exp(-12.0 * lt) + 45.0
            phase = 2 * np.pi * np.cumsum(pitch) / sample_rate
            pulse = np.sin(phase) * np.exp(-10.0 * lt) * 0.18
            # Build up intensity smoothly
            pulse_build = np.clip((bt - 2.5) / 10.0, 0.4, 1.0)
            left[b_idx] += pulse * pulse_build
            right[b_idx] += pulse * pulse_build

    # 4. SOUND EFFECTS & UI CHIMES
    
    # SFX 1: Wake up tone / soft chime (0.8s)
    def add_chime(start_time, freqs, duration=1.5, amp=0.12, pan=0.0):
        c_idx = np.where((t >= start_time) & (t < start_time + duration))[0]
        if len(c_idx) == 0: return
        lt = t[c_idx] - start_time
        sig = np.zeros_like(lt)
        for f in freqs:
            sig += np.sin(2 * np.pi * f * lt) * np.exp(-3.5 * lt)
            sig += 0.25 * np.sin(2 * np.pi * f * 2 * lt) * np.exp(-6.0 * lt)
        sig *= (amp / len(freqs))
        l_weight = np.clip(1.0 - pan, 0, 1)
        r_weight = np.clip(1.0 + pan, 0, 1)
        left[c_idx] += sig * l_weight
        right[c_idx] += sig * r_weight

    # Wake-up chime
    add_chime(0.5, [523.25, 659.25, 783.99], duration=2.0, amp=0.15, pan=-0.2) # C Major
    # Holographic HUD boot hum (1.0s to 2.2s)
    h_idx = np.where((t >= 1.0) & (t < 2.2))[0]
    if len(h_idx) > 0:
        lt = t[h_idx] - 1.0
        sweep_f = 350.0 + 850.0 * (lt / 1.2)**2
        phase = 2 * np.pi * np.cumsum(sweep_f) / sample_rate
        hud_sound = np.sin(phase) * np.sin(np.pi * lt / 1.2) * 0.04
        left[h_idx] += hud_sound * 0.7
        right[h_idx] += hud_sound * 1.3

    # SFX 2: AI Assistant Greeting (3.5s - two delicate high tech pings)
    add_chime(3.5, [880.0, 1318.5], duration=1.0, amp=0.12, pan=0.3)
    add_chime(3.7, [1046.5, 1567.98], duration=1.2, amp=0.14, pan=0.2)

    # SFX 3: Holographic UI Rotate & Interaction (6.5s)
    add_chime(6.4, [587.33, 880.0], duration=0.8, amp=0.09, pan=-0.3)
    add_chime(6.7, [698.46, 1046.5], duration=0.8, amp=0.10, pan=0.1)
    
    # SFX 4: "CONCEPT MASTERED" Achievement Chime (9.0s - bright ascending chord)
    add_chime(9.0, [523.25], duration=1.2, amp=0.12, pan=-0.2)
    add_chime(9.15, [659.25], duration=1.2, amp=0.14, pan=0.0)
    add_chime(9.3, [783.99, 1046.5], duration=2.0, amp=0.18, pan=0.2)
    
    # SFX 5: Campus Transition Swell & Shuttle Hum (10.0s - 13.0s)
    trans_idx = np.where((t >= 9.8) & (t < 13.0))[0]
    if len(trans_idx) > 0:
        lt = t[trans_idx] - 9.8
        # Wind / airy sweep
        noise = np.random.uniform(-1, 1, len(lt))
        # Simple moving average for soft air sound
        kernel = np.ones(50) / 50
        smooth_noise = np.convolve(noise, kernel, mode='same')
        air_env = np.sin(np.pi * np.clip(lt / 3.0, 0, 1))
        # Shuttle electric hum (glide from 90Hz to 160Hz)
        shuttle_f = 90.0 + 70.0 * np.clip(lt / 3.0, 0, 1)
        shuttle_phase = 2 * np.pi * np.cumsum(shuttle_f) / sample_rate
        shuttle_sound = np.sin(shuttle_phase) * 0.05 * air_env
        
        left[trans_idx] += (smooth_noise * 0.03 * air_env) + shuttle_sound * 0.8
        right[trans_idx] += (smooth_noise * 0.03 * air_env) + shuttle_sound * 1.2

    # SFX 6: Classroom Transition (14.0s)
    add_chime(14.0, [440.0, 659.25], duration=1.5, amp=0.08, pan=-0.2)

    # SFX 7: Final Cinematic Title Boom & Sunset Shimmer (17.0s)
    boom_idx = np.where((t >= 17.0) & (t < 20.0))[0]
    if len(boom_idx) > 0:
        lt = t[boom_idx] - 17.0
        # Deep sub drop 70Hz -> 35Hz
        drop_f = 70.0 * np.exp(-3.0 * lt) + 35.0
        drop_phase = 2 * np.pi * np.cumsum(drop_f) / sample_rate
        boom = np.sin(drop_phase) * np.exp(-1.5 * lt) * 0.28
        left[boom_idx] += boom
        right[boom_idx] += boom
    
    # Crystalline shimmer at 17.3s
    add_chime(17.2, [1046.5, 1318.5, 1567.98, 2093.0], duration=2.5, amp=0.18, pan=0.0)

    # Master Fade In (0 to 0.5s) and Fade Out (19.0 to 20.0s)
    fade_in = np.clip(t / 0.5, 0, 1)
    fade_out = np.clip((duration - t) / 1.0, 0, 1)
    master_env = fade_in * fade_out
    
    left *= master_env
    right *= master_env

    # Soft Limiter / Normalization
    max_peak = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-6)
    target_peak = 0.88 # -1.1 dBFS headroom
    gain = target_peak / max_peak if max_peak > target_peak else 1.0
    
    left = np.clip(left * gain, -0.99, 0.99)
    right = np.clip(right * gain, -0.99, 0.99)
    
    # Convert to 16-bit PCM stereo
    left_int16 = (left * 32767).astype(np.int16)
    right_int16 = (right * 32767).astype(np.int16)
    
    # Interleave
    stereo = np.empty((total_samples * 2,), dtype=np.int16)
    stereo[0::2] = left_int16
    stereo[1::2] = right_int16
    
    with wave.open(output_wav_path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(stereo.tobytes())
    
    print(f"Successfully generated cinematic audio: {output_wav_path}")

if __name__ == '__main__':
    generate_cinematic_audio('cinematic_soundtrack.wav')
