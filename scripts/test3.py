import numpy as np
import concurrent.futures
import sys
import multiprocessing
from threading import Thread, Lock
import threading
import matplotlib.pyplot as plt
from skimage import io, util
import time
from utils import LpMPv2


# Example usage:
if __name__ == "__main__":

    # Load image
    img = io.imread('1.jpg', as_gray=True)
    img = util.img_as_float(img)
    
    # Add missing values (30%)
    m, n = img.shape
    m, n, c = img.shape
    missing_rate = 0.3
    mask = np.ones((m, n))
    missing_indices = np.random.choice(m*n, int(m*n*missing_rate), replace=False)
    mask.flat[missing_indices] = 0
    
    # Add salt-and-pepper noise
    snr = 9  # dB
    noise_intensity = 1/snr
    noisy_img = util.random_noise(img, mode='s&p', amount=noise_intensity)
    
    # Apply mask
    X = noisy_img * mask
    
    # Apply p-MP with GIL-free multithreading if available
    start_time = time.time()
    completed_img = LpMPv2(X, mask)
    elapsed_time = time.time() - start_time
    print(f"Time taken: {elapsed_time:.2f} seconds")
    
    # Calculate PSNR
    def calculate_psnr(original, reconstructed):
        mse = np.mean((original - reconstructed)**2)
        max_pixel = 1.0
        psnr = 10 * np.log10((max_pixel**2) / mse)
        return psnr
    
    psnr_value = calculate_psnr(img, completed_img)
    
    # Display results
    plt.figure(figsize=(12, 4))
    plt.subplot(131)
    plt.imshow(img, cmap='gray')
    plt.title('Original Image')
    
    plt.subplot(132)
    plt.imshow(X, cmap='gray')
    plt.title('Noisy Image with Missing Data')
    
    plt.subplot(133)
    plt.imshow(completed_img, cmap='gray')
    plt.title(f'Recovered Image (PSNR: {psnr_value:.2f}dB)')
    
    plt.tight_layout()
    plt.show()