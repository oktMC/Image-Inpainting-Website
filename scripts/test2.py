import numpy as np
import matplotlib.pyplot as plt
from skimage import io, util
import time
from functools import partial
import concurrent.futures

from utils import LpMPv2

np.random.seed(42)  # For reproducibility


def process_channel_wrapper(args, image, mask, p):
    channel_id = args  
    return LpMPv2(image[:, :, channel_id], mask, p=p)

def process_image_channels(image, mask, p=1.1):
    result = np.copy(image)
    
    worker = partial(process_channel_wrapper, image=image, mask=mask, p=p)
    
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as executor:
        # Map the channel indices
        results = list(executor.map(worker, [0, 1, 2]))
        
        for idx, channel_result in enumerate(results):
            result[:, :, idx] = channel_result
            
    return result

def calculate_psnr(original, reconstructed, max_pixel=1.0):
    mse = np.mean((original - reconstructed) ** 2)
    return 10 * np.log10((max_pixel ** 2) / mse)

def main():
    # Load RGB image
    img = io.imread('1.jpg')  # Shape: (height, width, 3)
    img = util.img_as_float(img)  # Convert to [0, 1]

    # --- Step 1: Generate 2D Missing Mask (same for all channels) ---
    m, n, c = img.shape
    missing_rate = 0.3  # 30% missing pixels
    mask_2d = np.ones((m, n))  # 2D mask
    missing_indices = np.random.choice(m * n, int(m * n * missing_rate), replace=False)
    mask_2d.flat[missing_indices] = 0
    mask_3d = np.repeat(mask_2d[:, :, np.newaxis], 3, axis=2)  # Broadcast to 3 channels

    # --- Step 2: Add Salt-and-Pepper Noise (same for all channels) ---
    snr = 9  # dB (lower = more noise)
    noise_intensity = 1 / snr

    # Generate a single noise mask for all channels
    noise_mask = np.random.random((m, n))
    salt = (noise_mask < noise_intensity / 2)  # Salt (white)
    pepper = (noise_mask > 1 - noise_intensity / 2)  # Pepper (black)

    # Apply the same noise to all channels
    noisy_img = img.copy()
    for channel in range(c):
        noisy_img[:, :, channel][salt] = 1.0  # Salt (max value)
        noisy_img[:, :, channel][pepper] = 0.0  # Pepper (min value)

    # --- Step 3: Apply Missing Data to Noisy Image ---
    X = noisy_img * mask_3d  # Element-wise multiplication

    # --- Step 4: Image Completion (Replace with Your Method) ---
    start_time = time.time()
    completed_img = process_image_channels(noisy_img, mask_2d)
    elapsed_time = time.time() - start_time

    # --- Step 5: PSNR Calculation ---
    psnr_r = calculate_psnr(img[:, :, 0], completed_img[:, :, 0])
    psnr_g = calculate_psnr(img[:, :, 1], completed_img[:, :, 1])
    psnr_b = calculate_psnr(img[:, :, 2], completed_img[:, :, 2])
    psnr_avg = np.mean([psnr_r, psnr_g, psnr_b])

    # --- Step 6: Visualize Results ---
    plt.figure(figsize=(15, 5))
    plt.subplot(141)
    plt.imshow(img)
    plt.title('Original Image')

    plt.subplot(142)
    plt.imshow(X)
    plt.title(f'Corrupted (SNR={snr}dB, {missing_rate*100:.0f}% Missing)')

    plt.subplot(143)
    plt.imshow(completed_img)
    plt.title(f'Recovered (PSNR: {psnr_avg:.2f} dB)')

    plt.subplot(144)
    plt.imshow(np.abs(img - completed_img), cmap='hot', vmin=0, vmax=0.5)
    plt.title('Absolute Error')
    plt.colorbar()

    plt.tight_layout()
    plt.show()

    print(f"Time: {elapsed_time:.2f} sec")
    print(f"PSNR (R/G/B): {psnr_r:.2f} dB, {psnr_g:.2f} dB, {psnr_b:.2f} dB")
    print(f"Mean PSNR: {psnr_avg:.2f} dB")

if __name__ == '__main__':
    main()