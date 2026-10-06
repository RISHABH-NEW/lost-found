import os
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

def build_advertisement_video():
    brain_dir = r"C:\Users\rv347\.gemini\antigravity-ide\brain\bb022a80-6778-4b84-80cd-e88657c8788d"
    output_mp4 = r"c:\Users\rv347\LOST_FOUND\Lost_And_Found_Ad_20s.mp4"
    audio_wav = r"c:\Users\rv347\LOST_FOUND\lost_found_ad_audio.wav"
    
    if not os.path.exists(audio_wav):
        raise FileNotFoundError(f"Missing audio file: {audio_wav}")
        
    # Assets
    asset_keys = {
        's1_walk': os.path.join(brain_dir, "ad_scene1_walk_1791240275334.jpg"),
        's1_drop': os.path.join(brain_dir, "ad_scene1_drop_1791240284899.jpg"),
        's2_pickup': os.path.join(brain_dir, "ad_scene2_pickup_1791240303070.jpg"),
        's2_look': os.path.join(brain_dir, "ad_scene2_lookaround_1791240312951.jpg"),
        's3_app': os.path.join(brain_dir, "ad_scene3_app_1791240331265.jpg"),
        's4_notify': os.path.join(brain_dir, "ad_scene4_notify_1791240347290.jpg"),
        's4_smile': os.path.join(brain_dir, "ad_scene4_smile_1791240356971.jpg"),
    }
    
    for k, p in asset_keys.items():
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing image asset: {k} -> {p}")
            
    print("All image assets verified.")
    
    # Target video specs
    W, H = 1080, 1920
    FPS = 30
    TOTAL_DURATION = 20.00
    TOTAL_FRAMES = int(TOTAL_DURATION * FPS) # exactly 600 frames
    
    # Oversize buffer for smooth camera operations (zoom, tilt, pan)
    BW = int(W * 1.25) # 1350
    BH = int(H * 1.25) # 2400
    
    raw_imgs = {}
    for k, path in asset_keys.items():
        with Image.open(path) as img:
            raw_imgs[k] = img.convert('RGB').resize((BW, BH), Image.Resampling.LANCZOS)
            
    print("All images resized to buffer resolution with Lanczos.")
    
    # Fonts
    font_bold_xl = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 76)
    font_bold_lg = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 56)
    font_bold_md = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 44)
    font_bold_sm = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 30)
    font_reg_md = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 36)
    font_reg_sm = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 32)
    font_reg_xs = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 24)

    def smoothstep(t):
        t = np.clip(t, 0.0, 1.0)
        return t * t * (3.0 - 2.0 * t)
        
    def get_camera_frame(img, zoom=1.0, x_off=0.0, y_off=0.0):
        cx = BW / 2.0 + x_off
        cy = BH / 2.0 + y_off
        crop_w = W / zoom
        crop_h = H / zoom
        
        box_l = cx - crop_w / 2.0
        box_t = cy - crop_h / 2.0
        box_r = box_l + crop_w
        box_b = box_t + crop_h
        
        cropped = img.crop((box_l, box_t, box_r, box_b))
        return cropped.resize((W, H), Image.Resampling.BILINEAR)

    # -------------------------------------------------------------
    # RENDERERS FOR INDIVIDUAL BEATS
    # -------------------------------------------------------------
    
    # SCENE 1 (0.0s - 4.0s)
    def render_scene_1(t):
        # 0.0 - 2.0: Student walking
        # 2.0 - 4.0: Phone drops on floor
        if t < 2.0:
            nt = t / 2.0
            zoom = 1.0 + 0.06 * smoothstep(nt)
            step_phase = nt * 4.0 * np.pi
            y_bob = np.abs(np.sin(step_phase)) * 10.0
            x_sway = np.cos(step_phase * 0.5) * 6.0
            frame = get_camera_frame(raw_imgs['s1_walk'], zoom, x_sway, y_bob)
        elif t < 2.2:
            # Quick transition whip / cross-cut
            alpha = smoothstep((t - 2.0) / 0.2)
            f1 = get_camera_frame(raw_imgs['s1_walk'], 1.06, 0.0, 5.0)
            f2 = get_camera_frame(raw_imgs['s1_drop'], 1.02, 0.0, 15.0)
            arr1 = np.array(f1, dtype=np.float32)
            arr2 = np.array(f2, dtype=np.float32)
            frame = Image.fromarray(((1.0 - alpha) * arr1 + alpha * arr2).astype(np.uint8))
        else:
            # 2.2 - 4.0: Phone on floor
            nt = (t - 2.2) / 1.8
            zoom = 1.02 + 0.08 * smoothstep(nt)
            y_pan = (1.0 - smoothstep(nt)) * 25.0
            frame = get_camera_frame(raw_imgs['s1_drop'], zoom, 0.0, y_pan)
            
        # Text overlay only during final second (3.0s - 4.0s): "LOST SOMETHING?"
        if t >= 3.0:
            text_alpha = smoothstep((t - 3.0) / 0.3)
            overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            odraw = ImageDraw.Draw(overlay)
            
            msg = "LOST SOMETHING?"
            bbox = odraw.textbbox((0, 0), msg, font=font_bold_lg)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            
            cx, cy = W // 2, 1530
            px, py = 52, 22
            bg_a = int(220 * text_alpha)
            tx_a = int(255 * text_alpha)
            
            odraw.rounded_rectangle([cx - tw//2 - px, cy - th//2 - py, cx + tw//2 + px, cy + th//2 + py],
                                    radius=28, fill=(15, 23, 42, bg_a), outline=(239, 68, 68, int(180 * text_alpha)), width=3)
            odraw.text((cx - tw//2, cy - th//2 - 4), msg, font=font_bold_lg, fill=(255, 255, 255, tx_a))
            
            frame = Image.alpha_composite(frame.convert('RGBA'), overlay).convert('RGB')
            
        return frame

    # SCENE 2 (4.0s - 8.0s)
    def render_scene_2(t):
        # 4.0 - 6.0: Notice & pick up phone
        # 6.0 - 8.0: Look around for owner
        local_t = t - 4.0
        if local_t < 2.0:
            nt = local_t / 2.0
            zoom = 1.0 + 0.08 * smoothstep(nt)
            y_tilt = smoothstep(nt) * 15.0
            frame = get_camera_frame(raw_imgs['s2_pickup'], zoom, 0.0, y_tilt)
        elif local_t < 2.25:
            # Smooth cut to looking around
            alpha = smoothstep((local_t - 2.0) / 0.25)
            f1 = get_camera_frame(raw_imgs['s2_pickup'], 1.08, 0.0, 15.0)
            f2 = get_camera_frame(raw_imgs['s2_look'], 1.0, 0.0, 0.0)
            arr1 = np.array(f1, dtype=np.float32)
            arr2 = np.array(f2, dtype=np.float32)
            frame = Image.fromarray(((1.0 - alpha) * arr1 + alpha * arr2).astype(np.uint8))
        else:
            nt = (local_t - 2.25) / 1.75
            zoom = 1.0 + 0.06 * smoothstep(nt)
            # Gentle horizontal searching pan
            x_pan = np.sin(nt * np.pi) * 14.0
            frame = get_camera_frame(raw_imgs['s2_look'], zoom, x_pan, 0.0)
            
        # On-screen text: "Someone found it."
        if local_t >= 1.5:
            text_alpha = smoothstep((local_t - 1.5) / 0.4)
            overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            odraw = ImageDraw.Draw(overlay)
            
            msg = "Someone found it."
            bbox = odraw.textbbox((0, 0), msg, font=font_bold_md)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            
            cx, cy = W // 2, 1530
            px, py = 46, 20
            bg_a = int(220 * text_alpha)
            tx_a = int(255 * text_alpha)
            
            odraw.rounded_rectangle([cx - tw//2 - px, cy - th//2 - py, cx + tw//2 + px, cy + th//2 + py],
                                    radius=26, fill=(15, 23, 42, bg_a), outline=(56, 189, 248, int(160 * text_alpha)), width=2)
            odraw.text((cx - tw//2, cy - th//2 - 4), msg, font=font_bold_md, fill=(255, 255, 255, tx_a))
            
            frame = Image.alpha_composite(frame.convert('RGBA'), overlay).convert('RGB')
            
        return frame

    # SCENE 3 (8.0s - 12.0s)
    def render_scene_3(t):
        # 8.0 - 10.0: Open Lost & Found
        # 10.0 - 12.0: Select "Report Found Item", upload photo, submit location
        local_t = t - 8.0
        nt = local_t / 4.0
        zoom = 1.0 + 0.12 * smoothstep(nt)
        y_pan = -smoothstep(nt) * 12.0
        frame = get_camera_frame(raw_imgs['s3_app'], zoom, 0.0, y_pan)
        
        # Subtle tap highlight pulse on submit button at 10.8s
        if 2.6 < local_t < 3.2:
            pulse = np.sin((local_t - 2.6) / 0.6 * np.pi) * 20.0
            arr = np.array(frame, dtype=np.float32)
            arr[1200:1350, 400:680, 2] += pulse # subtle blue flash on button
            frame = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
            
        # On-screen text: "REPORT IT. RETURN IT."
        if local_t >= 1.5:
            text_alpha = smoothstep((local_t - 1.5) / 0.4)
            overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            odraw = ImageDraw.Draw(overlay)
            
            msg = "REPORT IT. RETURN IT."
            bbox = odraw.textbbox((0, 0), msg, font=font_bold_lg)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            
            cx, cy = W // 2, 1600
            px, py = 50, 22
            bg_a = int(230 * text_alpha)
            tx_a = int(255 * text_alpha)
            
            odraw.rounded_rectangle([cx - tw//2 - px, cy - th//2 - py, cx + tw//2 + px, cy + th//2 + py],
                                    radius=28, fill=(15, 23, 42, bg_a), outline=(14, 165, 233, int(200 * text_alpha)), width=3)
            odraw.text((cx - tw//2, cy - th//2 - 4), msg, font=font_bold_lg, fill=(255, 255, 255, tx_a))
            
            frame = Image.alpha_composite(frame.convert('RGBA'), overlay).convert('RGB')
            
        return frame

    # SCENE 4 (12.0s - 16.0s)
    def render_scene_4(t):
        # 12.0 - 14.0: Notification appears "Your lost item may have been found."
        # 14.0 - 16.0: Student looks relieved and smiles
        local_t = t - 12.0
        if local_t < 2.0:
            nt = local_t / 2.0
            zoom = 1.0 + 0.06 * smoothstep(nt)
            step_phase = nt * 4.0 * np.pi
            y_bob = np.abs(np.sin(step_phase)) * 8.0
            frame = get_camera_frame(raw_imgs['s4_notify'], zoom, 0.0, y_bob)
            
            # Animate crystal clear notification banner sliding down from top
            slide_prog = smoothstep(np.clip(local_t / 0.4, 0.0, 1.0))
            ny_start = -220
            ny_target = 130
            ny = int(ny_start + slide_prog * (ny_target - ny_start))
            
            overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            odraw = ImageDraw.Draw(overlay)
            nw, nh = 980, 200
            nx = (W - nw) // 2
            
            # Frosted glass card
            odraw.rounded_rectangle([nx, ny, nx + nw, ny + nh], radius=34,
                                    fill=(15, 23, 42, 240), outline=(56, 189, 248, 120), width=2)
            
            # App icon
            odraw.ellipse([nx + 32, ny + 32, nx + 32 + 56, ny + 32 + 56], fill=(14, 165, 233, 255))
            odraw.text((nx + 46, ny + 36), "📍", font=font_bold_sm, fill=(255, 255, 255, 255))
            
            odraw.text((nx + 106, ny + 34), "CAMPUS LOST & FOUND", font=font_bold_sm, fill=(255, 255, 255, 255))
            odraw.text((nx + nw - 100, ny + 36), "now", font=font_reg_xs, fill=(148, 163, 184, 255))
            
            notif_msg = "Your lost item may have been found."
            odraw.text((nx + 34, ny + 108), notif_msg, font=font_bold_md, fill=(255, 255, 255, 255))
            odraw.text((nx + 34, ny + 154), "Match detected: Electronics / Phone • Click to review", font=font_reg_xs, fill=(56, 189, 248, 240))
            
            frame = Image.alpha_composite(frame.convert('RGBA'), overlay).convert('RGB')
        elif local_t < 2.25:
            # Seamless cut to smiling face
            alpha = smoothstep((local_t - 2.0) / 0.25)
            f1 = get_camera_frame(raw_imgs['s4_notify'], 1.06, 0.0, 4.0)
            f2 = get_camera_frame(raw_imgs['s4_smile'], 1.0, 0.0, 0.0)
            arr1 = np.array(f1, dtype=np.float32)
            arr2 = np.array(f2, dtype=np.float32)
            frame = Image.fromarray(((1.0 - alpha) * arr1 + alpha * arr2).astype(np.uint8))
        else:
            nt = (local_t - 2.25) / 1.75
            zoom = 1.0 + 0.08 * smoothstep(nt)
            frame = get_camera_frame(raw_imgs['s4_smile'], zoom, 0.0, -smoothstep(nt) * 8.0)
            
        return frame

    # SCENE 5 (16.0s - 20.0s)
    def render_scene_5(t):
        # 16.0 - 18.0: Finder hands phone back
        # 18.0 - 19.0: Owner smiles gratefully
        # 19.0 - 20.0: Clean final advertisement screen
        local_t = t - 16.0
        
        if local_t < 1.8:
            # 16.0 - 17.8: Finder approaching and handing back phone
            nt = local_t / 1.8
            zoom = 1.0 + 0.07 * smoothstep(nt)
            frame = get_camera_frame(raw_imgs['s2_look'], zoom, smoothstep(nt) * 10.0, 0.0)
            
            # Subtle indicator badge
            overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            odraw = ImageDraw.Draw(overlay)
            badge_text = "Returning the item..."
            bbox = odraw.textbbox((0, 0), badge_text, font=font_reg_md)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            cx, cy = W // 2, 1540
            odraw.rounded_rectangle([cx - tw//2 - 36, cy - th//2 - 16, cx + tw//2 + 36, cy + th//2 + 16],
                                    radius=22, fill=(15, 23, 42, 210), outline=(56, 189, 248, 140), width=2)
            odraw.text((cx - tw//2, cy - th//2 - 2), badge_text, font=font_reg_md, fill=(255, 255, 255, 240))
            frame = Image.alpha_composite(frame.convert('RGBA'), overlay).convert('RGB')
            
        elif local_t < 3.0:
            # 17.8 - 19.0: Owner holding phone smiling with relief
            nt = (local_t - 1.8) / 1.2
            zoom = 1.02 + 0.06 * smoothstep(nt)
            frame = get_camera_frame(raw_imgs['s4_smile'], zoom, 0.0, 0.0)
            
        else:
            # 19.0 - 20.0: Clean final advertisement screen
            end_t = local_t - 3.0 # 0.0 to 1.0s
            end_prog = smoothstep(end_t / 0.35)
            
            # Dark navy / blue gradient card
            card = Image.new('RGB', (W, H), (15, 23, 42))
            cdraw = ImageDraw.Draw(card)
            
            # Subtle vertical gradient
            for y in range(H):
                r = int(10 + (y / H) * 12)
                g = int(16 + (y / H) * 20)
                b = int(32 + (y / H) * 36)
                cdraw.line([(0, y), (W, y)], fill=(r, g, b))
                
            # Icon
            icon_cx, icon_cy = W // 2, 700
            cdraw.ellipse([icon_cx - 50, icon_cy - 50, icon_cx + 50, icon_cy + 50],
                          fill=(14, 165, 233), outline=(56, 189, 248), width=3)
            # Stylized magnifying / location pin inside icon
            cdraw.ellipse([icon_cx - 24, icon_cy - 24, icon_cx + 10, icon_cy + 10], outline=(255, 255, 255), width=4)
            cdraw.line([(icon_cx + 6, icon_cy + 6), (icon_cx + 28, icon_cy + 28)], fill=(255, 255, 255), width=5)
            
            # Main Title: "LOST & FOUND"
            t1 = "LOST & FOUND"
            b1 = cdraw.textbbox((0, 0), t1, font=font_bold_xl)
            cdraw.text(((W - (b1[2]-b1[0])) // 2, 820), t1, font=font_bold_xl, fill=(255, 255, 255))
            
            # Cyan decorative divider
            cdraw.line([(W//2 - 90, 930), (W//2 + 90, 930)], fill=(56, 189, 248), width=4)
            
            # Tagline: "Lost it? Find it. Found it? Return it."
            t2 = "Lost it? Find it. Found it? Return it."
            b2 = cdraw.textbbox((0, 0), t2, font=font_bold_md)
            cdraw.text(((W - (b2[2]-b2[0])) // 2, 970), t2, font=font_bold_md, fill=(241, 245, 249))
            
            # Subtext: "“One report can make someone's day.”"
            t3 = "“One report can make someone's day.”"
            b3 = cdraw.textbbox((0, 0), t3, font=font_reg_sm)
            cdraw.text(((W - (b3[2]-b3[0])) // 2, 1070), t3, font=font_reg_sm, fill=(148, 163, 184))
            
            # Call to action footer
            t_cta = "campuslostfound.edu"
            b_cta = cdraw.textbbox((0, 0), t_cta, font=font_bold_sm)
            cta_w = b_cta[2] - b_cta[0]
            cdraw.rounded_rectangle([(W - cta_w)//2 - 30, 1200, (W + cta_w)//2 + 30, 1260],
                                    radius=20, fill=(30, 41, 59), outline=(56, 189, 248), width=2)
            cdraw.text(((W - cta_w) // 2, 1214), t_cta, font=font_bold_sm, fill=(56, 189, 248))
            
            # Transition from previous frame to final card
            f_prev = get_camera_frame(raw_imgs['s4_smile'], 1.08, 0.0, 0.0)
            arr_prev = np.array(f_prev, dtype=np.float32)
            arr_card = np.array(card, dtype=np.float32)
            frame = Image.fromarray(((1.0 - end_prog) * arr_prev + end_prog * arr_card).astype(np.uint8))
            
        return frame

    # -------------------------------------------------------------
    # TIMELINE CONTROLLER (Exactly 5 scenes x 4 seconds = 20.00s)
    # -------------------------------------------------------------
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{W}x{H}',
        '-pix_fmt', 'rgb24',
        '-r', str(FPS),
        '-i', '-',
        '-i', audio_wav,
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
    
    print("Launching FFmpeg...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    
    print(f"Encoding {TOTAL_FRAMES} frames ({TOTAL_DURATION}s @ {FPS}fps)...")
    
    # Cross dissolve between the 5 scenes is handled seamlessly
    for f_idx in range(TOTAL_FRAMES):
        t = f_idx / float(FPS)
        
        # Determine scene
        if t < 4.0:
            frame = render_scene_1(t)
        elif t < 8.0:
            # 0.2s cross dissolve from scene 1 at boundary 4.0s
            if t < 4.2:
                alpha = smoothstep((t - 4.0) / 0.2)
                f_a = render_scene_1(4.0)
                f_b = render_scene_2(4.0)
                arr_a = np.array(f_a, dtype=np.float32)
                arr_b = np.array(f_b, dtype=np.float32)
                frame = Image.fromarray(((1.0 - alpha) * arr_a + alpha * arr_b).astype(np.uint8))
            else:
                frame = render_scene_2(t)
        elif t < 12.0:
            if t < 8.2:
                alpha = smoothstep((t - 8.0) / 0.2)
                f_a = render_scene_2(8.0)
                f_b = render_scene_3(8.0)
                arr_a = np.array(f_a, dtype=np.float32)
                arr_b = np.array(f_b, dtype=np.float32)
                frame = Image.fromarray(((1.0 - alpha) * arr_a + alpha * arr_b).astype(np.uint8))
            else:
                frame = render_scene_3(t)
        elif t < 16.0:
            if t < 12.2:
                alpha = smoothstep((t - 12.0) / 0.2)
                f_a = render_scene_3(12.0)
                f_b = render_scene_4(12.0)
                arr_a = np.array(f_a, dtype=np.float32)
                arr_b = np.array(f_b, dtype=np.float32)
                frame = Image.fromarray(((1.0 - alpha) * arr_a + alpha * arr_b).astype(np.uint8))
            else:
                frame = render_scene_4(t)
        else: # 16.0 to 20.0
            if t < 16.2:
                alpha = smoothstep((t - 16.0) / 0.2)
                f_a = render_scene_4(16.0)
                f_b = render_scene_5(16.0)
                arr_a = np.array(f_a, dtype=np.float32)
                arr_b = np.array(f_b, dtype=np.float32)
                frame = Image.fromarray(((1.0 - alpha) * arr_a + alpha * arr_b).astype(np.uint8))
            else:
                frame = render_scene_5(t)
                
        # Fade to black on the final 0.15s (19.85s to 20.0s)
        if t > 19.85:
            fade = smoothstep((20.0 - t) / 0.15)
            arr = np.array(frame, dtype=np.float32) * fade
            frame = Image.fromarray(arr.astype(np.uint8))
            
        proc.stdin.write(np.array(frame, dtype=np.uint8).tobytes())
        
        if (f_idx + 1) % 60 == 0 or f_idx == TOTAL_FRAMES - 1:
            print(f"Rendered {f_idx + 1}/{TOTAL_FRAMES} frames ({(f_idx + 1)/FPS:.2f}s)")
            
    proc.stdin.close()
    stderr = proc.stderr.read().decode('utf-8', errors='ignore')
    proc.wait()
    
    if proc.returncode != 0:
        print("FFmpeg error:", stderr)
        raise RuntimeError("Encoding failed")
        
    print(f"\n Finished advertisement video: {output_mp4}")
    
    if os.path.exists(output_mp4):
        size_mb = os.path.getsize(output_mp4) / (1024 * 1024)
        print(f"File size: {size_mb:.2f} MB")

if __name__ == '__main__':
    build_advertisement_video()
