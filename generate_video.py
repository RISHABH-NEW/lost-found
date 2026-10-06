import os
import glob
import subprocess
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import imageio_ffmpeg

def create_cinematic_video():
    brain_dir = r"C:\Users\rv347\.gemini\antigravity-ide\brain\bb022a80-6778-4b84-80cd-e88657c8788d"
    output_mp4 = r"c:\Users\rv347\LOST_FOUND\POV_College_Student_2035.mp4"
    audio_wav = r"c:\Users\rv347\LOST_FOUND\cinematic_soundtrack.wav"
    
    # 1. Identify the 6 scene images in correct order
    scene_files = [
        "scene1_wake_up_1791238247101.jpg",
        "scene2_smart_room_1791238258365.jpg",
        "scene3_ai_study_1791238270162.jpg",
        "scene4_campus_1791238279942.jpg",
        "scene5_classroom_1791238291272.jpg",
        "scene6_final_shot_1791238301254.jpg",
    ]
    
    scene_paths = [os.path.join(brain_dir, f) for f in scene_files]
    for p in scene_paths:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing scene image: {p}")
            
    print("All 6 scene images verified.")
    
    # Video specs
    W, H = 1080, 1920
    FPS = 30
    TOTAL_DURATION = 20.0
    TOTAL_FRAMES = int(TOTAL_DURATION * FPS) # 600 frames
    
    # Prepare oversized source images to allow smooth camera pans, zooms, and bobs
    # Buffer factor 1.25 gives ample room for dynamic camera moves
    BW = int(W * 1.25) # 1350
    BH = int(H * 1.25) # 2400
    
    loaded_imgs = []
    for path in scene_paths:
        img = Image.open(path).convert('RGB')
        # High quality resize to buffer dimensions
        img_buffered = img.resize((BW, BH), Image.Resampling.LANCZOS)
        loaded_imgs.append(img_buffered)
        
    print("Images loaded and upscaled with Lanczos buffer.")
    
    # Scene timing in seconds
    # Scene 1: 0.0 - 3.2 (96 frames)
    # Scene 2: 3.0 - 6.2 (frames 90 - 186)
    # Scene 3: 6.0 - 10.2 (frames 180 - 306)
    # Scene 4: 10.0 - 14.2 (frames 300 - 426)
    # Scene 5: 14.0 - 17.2 (frames 420 - 516)
    # Scene 6: 17.0 - 20.0 (frames 510 - 600)
    
    scene_windows = [
        (0.0, 3.2),
        (3.0, 6.2),
        (6.0, 10.2),
        (10.0, 14.2),
        (14.0, 17.2),
        (17.0, 20.0)
    ]
    
    def smoothstep(t):
        t = np.clip(t, 0.0, 1.0)
        return t * t * (3.0 - 2.0 * t)
        
    def render_scene_frame(scene_idx, t_scene, dur_scene):
        # Base image
        img = loaded_imgs[scene_idx]
        norm_t = np.clip(t_scene / dur_scene, 0.0, 1.0)
        
        # Center coordinates in buffer image
        cx = BW / 2.0
        cy = BH / 2.0
        
        if scene_idx == 0:
            # Scene 1: WAKE UP
            # Camera starts slightly lower down (in bed) and tilts/rises up
            # Zoom slightly from 1.02 to 1.08
            zoom = 1.02 + 0.06 * smoothstep(norm_t)
            # Y movement: rises from pillow up toward eye-level
            y_offset = (1.0 - smoothstep(norm_t)) * (BH * 0.04)
            x_offset = np.sin(norm_t * np.pi * 1.5) * 6.0
            
        elif scene_idx == 1:
            # Scene 2: SMART ROOM
            # Walking towards desk: natural walking bob & dolly in
            zoom = 1.0 + 0.08 * smoothstep(norm_t)
            # Rhythmic footstep bob (~2 steps per second)
            step_phase = norm_t * 6.0 * np.pi
            y_bob = np.abs(np.sin(step_phase)) * 12.0
            x_sway = np.cos(step_phase * 0.5) * 8.0
            y_offset = y_bob - (norm_t * 15.0)
            x_offset = x_sway
            
        elif scene_idx == 2:
            # Scene 3: AI STUDY
            # Smooth cinematic push-in over shoulder towards rotating holographic model
            zoom = 1.0 + 0.10 * smoothstep(norm_t)
            # Gentle drift slightly towards the hologram on the right
            x_offset = smoothstep(norm_t) * 15.0
            y_offset = -smoothstep(norm_t) * 10.0
            
        elif scene_idx == 3:
            # Scene 4: FUTURISTIC CAMPUS
            # Wide majestic tracking forward across the campus
            zoom = 1.0 + 0.09 * (norm_t ** 1.2)
            # Slight slow pan to follow pathway
            x_offset = np.sin(norm_t * np.pi * 0.8) * 18.0
            y_offset = -norm_t * 12.0
            
        elif scene_idx == 4:
            # Scene 5: CLASSROOM
            # Slow cinematic push-in over student toward podium
            zoom = 1.0 + 0.08 * smoothstep(norm_t)
            x_offset = -smoothstep(norm_t) * 10.0
            y_offset = -smoothstep(norm_t) * 8.0
            
        else:
            # Scene 6: FINAL SHOT
            # Walking forward towards the grand building in golden hour
            zoom = 1.0 + 0.07 * norm_t
            step_phase = norm_t * 5.0 * np.pi
            y_bob = np.abs(np.sin(step_phase)) * 10.0
            x_sway = np.sin(step_phase * 0.5) * 7.0
            x_offset = x_sway
            y_offset = y_bob - (norm_t * 10.0)
            
        # Target crop box in buffer image
        crop_w = W / zoom
        crop_h = H / zoom
        
        box_left = (cx + x_offset) - crop_w / 2.0
        box_top = (cy + y_offset) - crop_h / 2.0
        box_right = box_left + crop_w
        box_bottom = box_top + crop_h
        
        # Crop and resize to exactly W x H
        cropped = img.crop((box_left, box_top, box_right, box_bottom))
        frame = cropped.resize((W, H), Image.Resampling.BILINEAR)
        frame_arr = np.array(frame, dtype=np.float32)
        
        # Post-processing per scene
        if scene_idx == 0:
            # Eyelids opening effect for first 0.8 seconds (t_scene < 0.8)
            if t_scene < 0.8:
                eye_open = smoothstep(t_scene / 0.8)
                # Height of open eye slit
                slit_h = eye_open * (H / 2.0)
                y_coords = np.arange(H)[:, None]
                # Distance from vertical center
                dist_center = np.abs(y_coords - H / 2.0)
                # Vignette eyelid mask
                eyelid_mask = np.clip(1.0 - (dist_center - slit_h) / 120.0, 0.0, 1.0)
                eyelid_mask = eyelid_mask[:, :, None] # Shape (H, 1, 1)
                
                # Initial blur when opening eyes
                if eye_open < 0.6:
                    blur_r = int((0.6 - eye_open) * 12)
                    if blur_r > 0:
                        frame_blurred = np.array(frame.filter(ImageFilter.GaussianBlur(blur_r)), dtype=np.float32)
                        frame_arr = frame_blurred
                        
                frame_arr = frame_arr * eyelid_mask
                
        elif scene_idx == 1:
            # Automatic lighting adjustment pulse (lighting warms/cools around 1.0s into scene)
            if 0.5 < t_scene < 2.0:
                light_t = np.sin((t_scene - 0.5) / 1.5 * np.pi)
                # Subtle exposure lift
                frame_arr[:, :, :2] += light_t * 8.0 # warm glow
                
        elif scene_idx == 2:
            # Hologram shimmer pulse around 2.5s - 3.2s
            if 2.5 < t_scene < 3.5:
                pulse = np.sin((t_scene - 2.5) * np.pi) * 15.0
                frame_arr[:, :, 2] += pulse # subtle blue/cyan highlight
                
        elif scene_idx == 5:
            # Golden hour sun flare pulse & final fade to black
            if t_scene < 2.5:
                flare = np.sin(t_scene * np.pi * 0.8) * 6.0
                frame_arr[:, :, 0] += flare * 1.5 # warm gold
                frame_arr[:, :, 1] += flare * 0.8
            # Fade out at the very end (19.4 to 20.0s -> t_scene 2.4 to 3.0)
            if t_scene > 2.4:
                fade = smoothstep((3.0 - t_scene) / 0.6)
                frame_arr *= fade
                
        return frame_arr

    # Start FFmpeg subprocess
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{W}x{H}',
        '-pix_fmt', 'rgb24',
        '-r', str(FPS),
        '-i', '-', # Video stream from pipe
        '-i', audio_wav, # Audio stream from wav file
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '320k',
        '-movflags', '+faststart',
        '-shortest',
        output_mp4
    ]
    
    print("Launching FFmpeg encoder...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Render all 600 frames
    print(f"Rendering {TOTAL_FRAMES} frames ({TOTAL_DURATION}s @ {FPS}fps)...")
    
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / float(FPS)
        
        # Determine active scene(s)
        # Check if in transition overlap
        # Scene transition windows:
        # Scene 0: 0.0 - 3.2
        # Transition 0 -> 1: 3.0 - 3.2 (duration 0.2s = 6 frames)
        # Scene 1: 3.0 - 6.2
        # Transition 1 -> 2: 6.0 - 6.2
        # Scene 2: 6.0 - 10.2
        # Transition 2 -> 3: 10.0 - 10.2
        # Scene 3: 10.0 - 14.2
        # Transition 3 -> 4: 14.0 - 14.2
        # Scene 4: 14.0 - 17.2
        # Transition 4 -> 5: 17.0 - 17.2
        # Scene 5: 17.0 - 20.0
        
        # Transitions are at [3.0, 6.0, 10.0, 14.0, 17.0] with 0.3s duration
        trans_points = [
            (3.0, 0, 1),
            (6.0, 1, 2),
            (10.0, 2, 3),
            (14.0, 3, 4),
            (17.0, 4, 5)
        ]
        
        trans_dur = 0.30
        in_trans = False
        
        for t_trans, s_from, s_to in trans_points:
            if t_trans <= t < t_trans + trans_dur:
                # Transition blending
                progress = smoothstep((t - t_trans) / trans_dur)
                
                # Scene from
                s0_start = scene_windows[s_from][0]
                s0_dur = scene_windows[s_from][1] - s0_start
                f_from = render_scene_frame(s_from, t - s0_start, s0_dur)
                
                # Scene to
                s1_start = scene_windows[s_to][0]
                s1_dur = scene_windows[s_to][1] - s1_start
                f_to = render_scene_frame(s_to, t - s1_start, s1_dur)
                
                # Cross dissolve blend
                frame_arr = (1.0 - progress) * f_from + progress * f_to
                in_trans = True
                break
                
        if not in_trans:
            # Single scene active
            # Find which scene
            active_s = 0
            for s_idx, (s_start, s_end) in enumerate(scene_windows):
                if s_start <= t <= s_end:
                    active_s = s_idx
                    break
            s_start = scene_windows[active_s][0]
            s_dur = scene_windows[active_s][1] - s_start
            frame_arr = render_scene_frame(active_s, t - s_start, s_dur)
            
        frame_arr = np.clip(frame_arr, 0, 255).astype(np.uint8)
        proc.stdin.write(frame_arr.tobytes())
        
        if (frame_idx + 1) % 60 == 0 or frame_idx == TOTAL_FRAMES - 1:
            print(f"Rendered {frame_idx + 1}/{TOTAL_FRAMES} frames ({(frame_idx + 1) / FPS:.1f}s)")
            
    proc.stdin.close()
    stderr_output = proc.stderr.read().decode('utf-8', errors='ignore')
    proc.wait()
    
    if proc.returncode != 0:
        print("FFmpeg error:", stderr_output)
        raise RuntimeError("FFmpeg encoding failed.")
        
    print(f"\n Master video successfully generated:\n{output_mp4}")
    
    # Check output file size and details
    if os.path.exists(output_mp4):
        size_mb = os.path.getsize(output_mp4) / (1024 * 1024)
        print(f"File size: {size_mb:.2f} MB")

if __name__ == '__main__':
    create_cinematic_video()
