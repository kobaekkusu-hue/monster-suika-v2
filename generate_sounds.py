import math
import struct
import wave
import os
import random

def generate_wav(filename, duration, func, volume=0.5, sample_rate=44100):
    path = os.path.join("src", "assets", "sounds", filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with wave.open(path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        num_samples = int(duration * sample_rate)
        for i in range(num_samples):
            t = float(i) / sample_rate
            sample = func(t, duration) * volume
            
            # 16-bit PCM conversion
            int_sample = int(max(-32767, min(32767, sample * 32767)))
            wav_file.writeframes(struct.pack('<h', int_sample))
    print(f"Generated: {path}")

def drop_func(t, d):
    freq = 600 * math.exp(-t * 10)
    return math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 15)

def merge_func(t, d):
    freq1 = 400 + 800 * (t/d)
    freq2 = 600 + 400 * (t/d)
    val = (math.sin(2 * math.pi * freq1 * t) + 0.5 * math.sin(2 * math.pi * freq2 * t)) / 1.5
    return val * (1.0 - t/d)

def bgm_func(t, d):
    chords = [
        [261.63, 329.63, 392.00], # C
        [196.00, 246.94, 293.66], # G
        [220.00, 261.63, 329.63], # Am
        [174.61, 220.00, 261.63]  # F
    ]
    beat_time = 0.5
    measure_time = beat_time * 4
    chord_idx = int((t % d) / measure_time) % len(chords)
    current_chord = chords[chord_idx]
    
    chord_val = 0
    for freq in current_chord:
        chord_val += math.sin(2 * math.pi * freq * t)
    chord_val *= 0.15 
    
    note_idx = int((t / beat_time) % 4)
    melody_notes = current_chord + [current_chord[1] * 1.5]
    freq_melody = melody_notes[note_idx]
    melody_val = math.sin(2 * math.pi * freq_melody * t)
    env_m = (1.0 - (t % beat_time) / beat_time) ** 2
    melody_val *= 0.2 * env_m
    
    rhythm_val = 0
    if (t / (beat_time / 2)) % 1 < 0.1: 
        rhythm_val = (random.random() * 2 - 1) * 0.05 * math.exp(-(t % (beat_time / 2)) * 100)
    
    bass_freq = current_chord[0] / 2
    bass_val = math.sin(2 * math.pi * bass_freq * t) * 0.1
    
    return chord_val + melody_val + rhythm_val + bass_val

if __name__ == "__main__":
    generate_wav("drop.wav", 0.3, drop_func, volume=0.5)
    generate_wav("merge.wav", 0.5, merge_func, volume=0.6)
    generate_wav("bgm.wav", 8.0, bgm_func, volume=0.4)
