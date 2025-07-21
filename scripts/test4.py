import numpy as np
import matplotlib.pyplot as plt
from skimage import io, util
import time

# Import your custom function
from utils import LpMPv2, IRLS, ALS

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

def evaluate_psnr_vs_missing_data_all(snr_db=9, p=1.1):
    """Plot PSNR vs missing data percentage for LpMP, IRLS, and ALS algorithms"""
    m, n, rank = 150, 300, 10
    original = generate_low_rank_matrix(m, n, rank)
    
    missing_rates = np.linspace(0.05, 0.5, 10)  # 5% to 50% missing
    results = {
        'LpMP': {'psnrs': [], 'times': []},
        'IRLS': {'psnrs': [], 'times': []},
        'ALS': {'psnrs': [], 'times': []}
    }
    
    for rate in missing_rates:
        noisy = add_salt_and_pepper_2d(original, snr_db)
        X = apply_missing_data_2d(noisy, rate)
        mask = (X != 0).astype(float)
        
        # Debug visualization for first iteration
        if rate == missing_rates[0]:
            plt.figure(figsize=(15,4))
            plt.subplot(141); plt.imshow(original); plt.title('Original')
            plt.subplot(142); plt.imshow(X); plt.title(f'Corrupted ({rate*100:.0f}% missing)')
        
        # Test each algorithm
        algorithms = [
            ('LpMP', lambda: LpMPv2(X, mask, p)),
            ('IRLS', lambda: IRLS(X, mask, rank, 1)),
            ('ALS', lambda: ALS(X, mask, rank))
        ]
        
        for name, algorithm in algorithms:
            start = time.time()
            completed = algorithm()
            elapsed = time.time() - start
            
            if rate == missing_rates[0]:
                plt.subplot(143 if name == 'LpMP' else 144)
                plt.imshow(completed)
                plt.title(f'{name} Recovered')
            
            psnr = calculate_psnr(original, completed)
            results[name]['psnrs'].append(psnr)
            results[name]['times'].append(elapsed)
            print(f"{name} | Missing {rate*100:.0f}% | PSNR: {psnr:.2f} dB | Time: {elapsed:.2f}s")
        
        if rate == missing_rates[0]:
            plt.show()
    
    # Plot PSNR comparison
    plt.figure(figsize=(10,5))
    for name in results:
        plt.plot(missing_rates * 100, results[name]['psnrs'], 'o-', label=name)
    plt.xlabel('Missing Data Percentage (%)')
    plt.ylabel('PSNR (dB)')
    plt.title(f'PSNR vs Missing Data (SNR={snr_db}dB)')
    plt.legend()
    plt.grid(True)
    plt.show()
    
    # Plot Time comparison
    plt.figure(figsize=(10,5))
    for name in results:
        plt.plot(missing_rates * 100, results[name]['times'], 'o-', label=name)
    plt.xlabel('Missing Data Percentage (%)')
    plt.ylabel('Time (seconds)')
    plt.title(f'Computation Time vs Missing Data')
    plt.legend()
    plt.grid(True)
    plt.show()
    
    return results

def evaluate_LpMP_tolerance(snr_db=20, p=1.1, missing_rate=0.3):
    """Evaluate LpMPv2 with different tolerance parameters"""
    m, n, rank = 150, 300, 10
    original = generate_low_rank_matrix(m, n, rank)
    
    # Generate corrupted data
    noisy = add_salt_and_pepper_2d(original, snr_db)
    X = apply_missing_data_2d(noisy, missing_rate)
    mask = (X != 0).astype(float)
    
    # Test different tolerance values
    tolerance_values = [1e-4, 5e-5, 1e-5, 5e-6, 1e-6, 5e-7, 1e-7]
    results = {'tol': [], 'psnr': [], 'time': [], 'iterations': []}
    
    plt.figure(figsize=(15, 4))
    plt.subplot(131); plt.imshow(original); plt.title('Original')
    plt.subplot(132); plt.imshow(X); plt.title(f'Corrupted ({missing_rate*100:.0f}% missing)')
    
    for tol in tolerance_values:
        print(f"\nTesting tol = {tol:.1e}")
        start_time = time.time()
        completed = LpMPv2(X, mask, p=p, tol=tol)
        elapsed = time.time() - start_time
        
        # Calculate metrics
        psnr = calculate_psnr(original, completed)
        iterations = int(tol * 1000000)  # Placeholder - you should track actual iterations
        
        results['tol'].append(tol)
        results['psnr'].append(psnr)
        results['time'].append(elapsed)
        results['iterations'].append(iterations)
        
        print(f"tol={tol:.1e} | PSNR: {psnr:.2f} dB | Time: {elapsed:.2f}s | Iter: {iterations}")
        
        # Show first result for visualization
        if tol == tolerance_values[0]:
            plt.subplot(133); plt.imshow(completed)
            plt.title(f'Recovered (tol={tol:.1e})')
    
    plt.show()
    
    # Plot results
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    # PSNR vs Tolerance
    ax1.semilogx(results['tol'], results['psnr'], 'o-')
    ax1.set_xlabel('Tolerance')
    ax1.set_ylabel('PSNR (dB)')
    ax1.set_title('PSNR vs Tolerance')
    ax1.grid(True)
    
    # Time vs Tolerance
    ax2.semilogx(results['tol'], results['time'], 'o-')
    ax2.set_xlabel('Tolerance')
    ax2.set_ylabel('Time (seconds)')
    ax2.set_title('Computation Time vs Tolerance')
    ax2.grid(True)
    
    plt.tight_layout()
    plt.show()
    
    return results

def compare_algorithms_visual(snr_db=20, p=1.1, missing_rate=0.3):
    """
    Visual comparison of different matrix completion algorithms
    Shows: Original, Corrupted, and Recovered images from each algorithm
    Displays PSNR but not computation time
    """
    # Load and prepare image
    original = io.imread("scripts/buildingorg.jpg", as_gray=True)
    original = util.img_as_float(original)
    rank = 7
    
    # Create corrupted data (30% missing + noise)
    noisy = add_salt_and_pepper_2d(original, snr_db)
    X = apply_missing_data_2d(noisy, missing_rate)
    mask = (X != 0).astype(float)
    
    # Prepare algorithms to compare
    algorithms = [
        ('LpMP', lambda: LpMPv2(X, mask, p)),
        ('IRLS', lambda: IRLS(X, mask, rank, p)),
        ('ALS', lambda: ALS(X, mask, rank))
    ]
    
    # Create figure
    plt.figure(figsize=(15, 8))
    
    # Show original and corrupted images
    plt.subplot(2, 3, 1)
    plt.imshow(original, cmap='gray')
    plt.title('Original Image')
    plt.colorbar()
    
    plt.subplot(2, 3, 2)
    plt.imshow(X, cmap='gray')
    plt.title(f'Corrupted Image\n({missing_rate*100:.0f}% missing + {snr_db}dB noise)')
    plt.colorbar()
    
    # Show recovered images and compute PSNR
    for i, (name, algorithm) in enumerate(algorithms, start=3):
        try:
            completed = algorithm()  # Removed time measurement
            psnr = calculate_psnr(original, completed)
            
            plt.subplot(2, 3, i)
            plt.imshow(completed, cmap='gray')
            plt.title(f'{name} Recovery\nPSNR: {psnr:.2f} dB')  # Removed time display
            plt.colorbar()
            
        except Exception as e:
            plt.subplot(2, 3, i)
            plt.text(0.5, 0.5, f'{name} Failed\n{str(e)}', 
                    ha='center', va='center')
            plt.title(f'{name} Failed')
            plt.axis('off')
    
    plt.tight_layout()
    plt.show()
    
    return {
        'original': original,
        'corrupted': X,
        'mask': mask,
        'algorithms': [name for name, _ in algorithms]
    }

if __name__ == '__main__':
   
    evaluate_psnr_vs_missing_data_all()