import numpy as np
import matplotlib.pyplot as plt
from skimage import util
import time

# Import your custom function
from utils import LpMPv2

np.random.seed(42)  # For reproducibility

def generate_low_rank_matrix(m, n, rank):
    """Generate m x n matrix with given rank and normalize to [0,1]"""
    U = np.random.randn(m, rank)
    V = np.random.randn(rank, n)
    matrix = U @ V
    # Normalize to [0,1] range
    matrix = (matrix - matrix.min()) / (matrix.max() - matrix.min())
    return matrix

def add_salt_and_pepper_2d(image, snr_db):
    """Add salt-and-pepper noise to normalized 2D matrix"""
    snr_linear = 10 ** (snr_db / 10)
    noise_intensity = 1 / snr_linear
    noisy = image.copy()
    mask = np.random.random(image.shape)
    salt = mask < noise_intensity/2
    pepper = mask > 1 - noise_intensity/2
    noisy[salt] = 1.0  # Salt (max normalized value)
    noisy[pepper] = 0.0 # Pepper (min normalized value)
    return noisy

def apply_missing_data_2d(image, missing_rate):
    """Apply random missing data to 2D matrix"""
    mask = np.random.random(image.shape) > missing_rate
    return image * mask

def calculate_psnr(original, reconstructed, max_pixel=1.0):
    mse = np.mean((original - reconstructed) ** 2)
    return 10 * np.log10((max_pixel ** 2) / mse) if mse != 0 else float('inf')

def evaluate_psnr_vs_missing_data(snr_db=20, p=1.1):  # Start with higher SNR
    """Plot PSNR vs missing data percentage"""
    m, n, rank = 150, 300, 10
    original = generate_low_rank_matrix(m, n, rank)
    
    missing_rates = np.linspace(0.05, 0.5, 10)  # 5% to 50% missing (more reasonable range)
    psnrs = []
    
    for rate in missing_rates:
        noisy = add_salt_and_pepper_2d(original, snr_db)
        X = apply_missing_data_2d(noisy, rate)
        mask = (X != 0).astype(float)
        
        # Debug: Visualize first iteration
        if rate == missing_rates[0]:
            plt.figure(figsize=(12,4))
            plt.subplot(131); plt.imshow(original); plt.title('Original')
            plt.subplot(132); plt.imshow(X); plt.title(f'Corrupted ({rate*100:.0f}% missing)')
        
        start = time.time()
        completed = LpMPv2(X, mask, p)
        elapsed = time.time() - start
        
        if rate == missing_rates[0]:
            plt.subplot(133); plt.imshow(completed); plt.title('Recovered')
            plt.show()
        
        psnr = calculate_psnr(original, completed)
        psnrs.append(psnr)
        print(f"Missing {rate*100:.0f}% | PSNR: {psnr:.2f} dB | Time: {elapsed:.2f}s")
    
    plt.figure(figsize=(10,5))
    plt.plot(missing_rates * 100, psnrs, 'o-')
    plt.xlabel('Missing Data Percentage (%)')
    plt.ylabel('PSNR (dB)')
    plt.title(f'PSNR vs Missing Data (SNR={snr_db}dB)')
    plt.grid(True)
    plt.show()

def evaluate_psnr_vs_snr(missing_rate=0.3, p=1.1):
    """Plot PSNR vs SNR at fixed missing rate"""
    m, n, rank = 150, 300, 10
    original = generate_low_rank_matrix(m, n, rank)
    
    snrs_db = np.arange(6, 21, 2)  # 1dB to 20dB in steps of 2
    psnrs = []
    
    for snr_db in snrs_db:
        noisy = add_salt_and_pepper_2d(original, snr_db)
        X = apply_missing_data_2d(noisy, missing_rate)
        mask = (X != 0).astype(float)
        
        completed = LpMPv2(X, mask, p)
        psnr = calculate_psnr(original, completed)
        psnrs.append(psnr)
        print(f"SNR={snr_db} dB | PSNR: {psnr:.2f} dB")
    
    plt.figure(figsize=(10, 5))
    plt.plot(snrs_db, psnrs, 'o-')
    plt.xlabel('SNR (dB)')
    plt.ylabel('PSNR (dB)')
    plt.title(f'PSNR vs SNR ({missing_rate*100:.0f}% Missing Data)')
    plt.grid(True)
    plt.show()

if __name__ == '__main__':
    # First test with easier conditions (higher SNR, less missing data)
    evaluate_psnr_vs_snr()