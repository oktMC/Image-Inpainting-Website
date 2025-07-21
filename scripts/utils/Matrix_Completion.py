import numpy as np
import time
import concurrent.futures
from functools import partial

def LpMPv2(X, mask, p=1.1, num_iterations=200, tol=1e-5):
    # start_time = time.time()
    n1, n2 = X.shape
    v = np.random.randn(n2, 1)  
    M = np.zeros((n1, n2))
    R = np.copy(X)
    epsilon = 1e-8
    
    row_indices = [np.where(mask[i, :])[0] for i in range(n1)]
    col_indices = [np.where(mask[:, j])[0] for j in range(n2)]
    
    mask_bool = mask.astype(bool)
    X_masked_norm = np.sum(np.abs(X[mask_bool]) ** p)
    
    def irls_solve_vectorized(a, b, p, max_iter=10):
        x = np.sum(a * b) / (np.sum(b * b) + epsilon)
         
        prev_E = float('inf')

        for _ in range(max_iter):
            residual = a - x * b
            w = 1.0 / (np.maximum(np.abs(residual), epsilon) ** (2-p))
            x_new = np.sum(w * a * b) / (np.sum(w * b * b) + epsilon)
            
            # stopping criterion
            if abs(x - x_new) < 1e-5 * abs(x):
                break
                
            x = x_new
            
        return x

    u = np.zeros((n1, 1))
    
    for k in range(num_iterations):
        prev_R_norm = np.sum(np.abs(R[mask_bool]) ** p)
        
        for i in range(n1):
            if len(row_indices[i]) > 0:
                a_i = R[i, row_indices[i]]
                b = v[row_indices[i], 0]
                u[i, 0] = irls_solve_vectorized(a_i, b, p)
        
        v_new = np.zeros((n2, 1))
        for j in range(n2):
            if len(col_indices[j]) > 0:
                c_j = R[col_indices[j], j]
                d = u[col_indices[j], 0]
                v_new[j, 0] = irls_solve_vectorized(c_j, d, p)
        v = v_new

        uv_outer = u @ v.T
        M += uv_outer
        R -= uv_outer * mask  

        current_R_norm = np.sum(np.abs(R[mask_bool]) ** p)
        eta = (prev_R_norm - current_R_norm) / X_masked_norm
        
        # print(f"Iteration {k+1}, Convergence measure: {eta:.6f}")
        
        # stopping criterion
        if eta <= tol:
            print(f"Converged at iteration {k+1}")
            break
    # M = X*mask + (1 - mask) * M # for no noise
    # print(f"--- {time.time() - start_time:.2f} seconds ---")
    return M

def LpMP_parallel(X, mask, p=1.1, num_iterations=200, tol=5e-7, max_workers=None):
    start_time = time.time()
    n1, n2 = X.shape
    v = np.random.randn(n2, 1)  
    M = np.zeros((n1, n2))
    R = np.copy(X)
    epsilon = 1e-8
    
    row_indices = [np.where(mask[i, :])[0] for i in range(n1)]
    col_indices = [np.where(mask[:, j])[0] for j in range(n2)]
    
    mask_bool = mask.astype(bool)
    X_masked_norm = np.sum(np.abs(X[mask_bool]) ** p)
    
    def irls_solve_vectorized(a, b, p, max_iter=10):
        x = np.sum(a * b) / (np.sum(b * b) + epsilon)
        
        prev_E = float('inf')

        for _ in range(max_iter):
            residual = a - x * b
            w = 1.0 / (np.maximum(np.abs(residual), epsilon) ** (2-p))
            x_new = np.sum(w * a * b) / (np.sum(w * b * b) + epsilon)
            
            # Early stopping check
            if abs(x - x_new) < 1e-5 * abs(x):
                break
                
            x = x_new
            
        return x

    def process_row(i, v_current, row_indices_list, R_current):
        if len(row_indices_list[i]) > 0:
            a_i = R_current[i, row_indices_list[i]]
            b = v_current[row_indices_list[i], 0]
            return i, irls_solve_vectorized(a_i, b, p)
        return i, 0

    def process_col(j, u_current, col_indices_list, R_current):
        if len(col_indices_list[j]) > 0:
            c_j = R_current[col_indices_list[j], j]
            d = u_current[col_indices_list[j], 0]
            return j, irls_solve_vectorized(c_j, d, p)
        return j, 0
    
    u = np.zeros((n1, 1))
    
    for k in range(num_iterations):
        prev_R_norm = np.sum(np.abs(R[mask_bool]) ** p)
        
        # Process rows in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            process_row_partial = partial(process_row, v_current=v, row_indices_list=row_indices, R_current=R)
            results = list(executor.map(process_row_partial, range(n1)))
            
            for i, u_i in results:
                u[i, 0] = u_i
        
        v_new = np.zeros((n2, 1))
        
        # Process columns in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            process_col_partial = partial(process_col, u_current=u, col_indices_list=col_indices, R_current=R)
            results = list(executor.map(process_col_partial, range(n2)))
            
            for j, v_j in results:
                v_new[j, 0] = v_j
                
        v = v_new

        uv_outer = u @ v.T
        M += uv_outer
        R -= uv_outer * mask  

        current_R_norm = np.sum(np.abs(R[mask_bool]) ** p)
        eta = (prev_R_norm - current_R_norm) / X_masked_norm
        
        if eta <= tol:
            break
    print(f"--- {time.time() - start_time:.2f} seconds ---")
    return M

def irls_solve_vectorized(a, b, p, epsilon=1e-8, max_iter=10):
    x = np.sum(a * b) / (np.sum(b * b) + epsilon)
    
    for _ in range(max_iter):
        residual = a - x * b
        w = 1.0 / (np.maximum(np.abs(residual), epsilon) ** (2-p))
        x_new = np.sum(w * a * b) / (np.sum(w * b * b) + epsilon)
        
        # stopping criterion
        if abs(x - x_new) < 1e-5 * abs(x):
            break
            
        x = x_new
        
    return x

def process_row(row_data, p=1.1):
    i, v_current, row_indices_i, R_row = row_data
    if len(row_indices_i) > 0:
        a_i = R_row[row_indices_i]
        b = v_current[row_indices_i]
        return i, irls_solve_vectorized(a_i, b, p)
    return i, 0

def process_col(col_data, p=1.1):
    j, u_current, col_indices_j, R_col = col_data
    if len(col_indices_j) > 0:
        c_j = R_col[col_indices_j]
        d = u_current[col_indices_j]
        return j, irls_solve_vectorized(c_j, d, p)
    return j, 0

def LpMP_multiprocessing(X, mask, p=1.1, num_iterations=200, tol=5e-7, max_workers=None):
    start_time = time.time()
    n1, n2 = X.shape
    v = np.random.randn(n2, 1)  
    M = np.zeros((n1, n2))
    R = np.copy(X)
    epsilon = 1e-8
    
    row_indices = [np.where(mask[i, :])[0] for i in range(n1)]
    col_indices = [np.where(mask[:, j])[0] for j in range(n2)]
    
    mask_bool = mask.astype(bool)
    X_masked_norm = np.sum(np.abs(X[mask_bool]) ** p)
    
    u = np.zeros((n1, 1))
    
    for k in range(num_iterations):
        prev_R_norm = np.sum(np.abs(R[mask_bool]) ** p)
        
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            row_data = [(i, v.flatten(), row_indices[i], R[i, :]) for i in range(n1)]
            process_row_with_p = partial(process_row, p=p)
            results = list(executor.map(process_row_with_p, row_data))
            
            for i, u_i in results:
                u[i, 0] = u_i
        
        v_new = np.zeros((n2, 1))

        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            col_data = [(j, u.flatten(), col_indices[j], R[:, j]) for j in range(n2)]
            process_col_with_p = partial(process_col, p=p)
            results = list(executor.map(process_col_with_p, col_data))
            
            for j, v_j in results:
                v_new[j, 0] = v_j
                
        v = v_new

        uv_outer = u @ v.T
        M += uv_outer
        R -= uv_outer * mask  

        current_R_norm = np.sum(np.abs(R[mask_bool]) ** p)
        eta = (prev_R_norm - current_R_norm) / X_masked_norm
        
        # stopping criterion
        if eta <= tol:
            break
            
    print(f"--- {time.time() - start_time:.2f} seconds ---")
    return M

def generate_low_rank_matrix(m, n, rank):
    A = np.random.randn(m,rank)
    B = np.random.randn(rank,n)
    M=A@B
    return M

def gen_mask(rows,cols):
    percentage=0.45 #1:45%,0:55%
    return np.random.rand(rows,cols) < percentage

def RMSE(M,X): 
    diff_norm = np.linalg.norm(M - X)
    actual_norm = np.linalg.norm(M)
    return np.sqrt((diff_norm ** 2) / (actual_norm ** 2))

def ALS(X, mask, rank, num_iterations=40):
    start_time = time.time()
    n1, n2 = X.shape
    U = np.random.randn(n1, rank)
    V = np.random.randn(rank, n2)
    mask = mask.astype(bool)

    for k in range(num_iterations):
        print(f"Iteration {k + 1}/{num_iterations}")
        for j in range(n2):
            UI = U[mask[:, j]]
            bI = X[mask[:, j], j]
            V[:, j] = np.linalg.solve(UI.T @ UI, UI.T @ bI)

        for i in range(n1):
            VJ = V[:, mask[i]]
            bJ = X[i, mask[i]]
            U[i] = np.linalg.solve(VJ @ VJ.T, VJ @ bJ)

    print("--- %.2f seconds ---" % (time.time() - start_time))
    return U@V

def IRLS(X, mask, rank, p, num_iterations=40):
    start_time = time.time()
    mask = mask.astype(bool)
    n1, n2 = X.shape
    U = np.random.randn(n1, rank)
    V = np.random.randn(rank, n2)
    epsilon = 1e-5
    # y = []

    for k in range(num_iterations):
        print(f"Iteration {k + 1}/{num_iterations}")
        for j in range(n2):
            UI = U[mask[:, j]]
            bI = X[mask[:, j], j]
            r = bI - UI @ V[:, j]
            for _ in range(5):
                W = np.diag((np.abs(r) ** p) / (r ** 2 + epsilon))
                V[:, j] = np.linalg.solve(UI.T @ W @ UI, UI.T @ W @ bI)
                r = bI - UI @ V[:, j]
            # W = np.diag(1.0 / (np.abs(r)**2 + epsilon)**((1-p/2)/2))
            # W = np.diag((np.abs(r) ** p) / (r ** 2 + epsilon))
            # V[:, j] = np.linalg.solve(UI.T @ W @ UI, UI.T @ W @ bI)

        for i in range(n1):
            VJ = V[:, mask[i, :]]
            bJ = X[i, mask[i, :]]
            r = bJ - VJ.T @ U[i]
            for _ in range(5):
                W = np.diag((np.abs(r) ** p) / (r ** 2 + epsilon))
                U[i] = np.linalg.solve(VJ @ W @ VJ.T, VJ @ W @ bJ)
                r = bJ - VJ.T @ U[i]
            # W = np.diag(1.0 / (np.abs(r)**2 + epsilon)**((1-p/2)/2))
            # W = np.diag((np.abs(r) ** p) / (r ** 2 + epsilon))
            # U[i] = np.linalg.solve(VJ @ W @ VJ.T, VJ @ W @ bJ)

    #     m = U @ V
    #     y = np.append(y,RMSE(X,m))
    
    # x = np.arange(1, num_iterations+1)
    # plt.plot(x,y, marker='o')
    # plt.yscale('log')
    # plt.xlabel('Iteration Number')
    # plt.ylabel('RMSE')
    # plt.show()
    print("--- %.2f seconds ---" % (time.time() - start_time))
    return U@V

def LpMP(X, mask, p, num_iterations=200, num_threads=1):
    start_time = time.time()
    n1, n2 = X.shape
    v = np.random.randn(n2)
    M = np.zeros((n1, n2))
    R = np.copy(X)
    epsilon = 1e-5
    t1 = 0

    def update_u(i):
        mask_row = mask[i, :]

        if np.sum(mask_row) == 0:
            return 0  
        
        a_i = R[i, mask_row].reshape(-1, 1)
        b = v[mask_row].reshape(-1, 1)
        residual = a_i - (b.T @ a_i / (b.T @ b)) * b
        u_i = 0

        for _ in range(3):  
            w = 1 / ((np.abs(residual) + epsilon) ** ((2 - p) / 2))
            W = np.diag(w.flatten())
            u_i = np.linalg.solve(b.T @ W @ b, b.T @ W @ a_i).item()
            residual = a_i - u_i * b

        return u_i

    def update_v(j):
        mask_col = mask[:, j]
        if np.sum(mask_col) == 0:
            return 0  

        c_j = R[mask_col, j].reshape(-1, 1)
        d = u[mask_col].reshape(-1, 1)
        residual = c_j - (d.T @ c_j / (d.T @ d)) * d
        v_j = 0

        for _ in range(3):
            w = 1 / ((np.abs(residual) + epsilon) ** ((2 - p) / 2))
            W = np.diag(w.flatten())
            v_j = np.linalg.solve(d.T @ W @ d, d.T @ W @ c_j).item()
            residual = c_j - v_j * d

        return v_j

    for k in range(num_iterations):
        # print(f"Iteration {k + 1}/{num_iterations}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            results = executor.map(update_u, range(n1))
        u = np.array(list(results))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            results = executor.map(update_v, range(n2))
        v = np.array(list(results))
    
        u = u.reshape(-1, 1)
        v = v.reshape(-1, 1)

        temp = u @ v.T
        A = temp * mask
        M += temp
        R -= A  

        t2 = np.linalg.norm(R * mask, ord='fro') / np.linalg.norm(X * mask, ord='fro')
        diff = abs(t1 - t2)
        t1 = t2
        # print(f"Normalized Residual Error: {t2*100:.2f}%")

        if diff < 0.001:
            # print(f"Converged at iteration {k + 1} with normalized error {t2 * 100:.2f}%")
            break
           
    print("--- %.2f seconds ---" % (time.time() - start_time))
    # M = X*mask + (1 - mask) * M # for no noise
    return M



def main():
    rank = 20
    p = 1
    M = generate_low_rank_matrix(200,200,rank)
    mask = gen_mask(M.shape[0],M.shape[1])
    # X_noise = add_ImpulsiveNoise(1, M, mask, 6)
    # print(RMSE(M,X_noise))
    # U, V = ALS(X_noise, mask, rank)
    # X = U @ V
    # print(f"RMSE:{RMSE(M,X)}")
    # U, V = IRLS(X_noise, mask, rank, p)

    # X = U @ V

    X = LpMP_parallel(M*mask, mask, max_workers=1)
    # print(f"RMSE:{RMSE(M,X)}")
    Y = LpMPv2(M*mask, mask)
    # print(f"RMSE:{RMSE(M,Y)}")

if __name__=='__main__':
    main()
