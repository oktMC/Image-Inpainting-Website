import cv2
import numpy as np
import sys
import time
import concurrent.futures
from functools import partial
from utils import LpMPv2

def process_channel_wrapper(args, image, mask, p):
    channel_idx = args  # unpack if needed
    return LpMPv2(image[:, :, channel_idx], mask, p=p)

def process_image_channels(image, mask, p=1.1):
    result = np.copy(image)
    
    # Create a partial function with fixed arguments
    worker = partial(process_channel_wrapper, image=image, mask=mask, p=p)
    
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as executor:
        # Map the channel indices
        results = list(executor.map(worker, [0, 1, 2]))
        
        for idx, channel_result in enumerate(results):
            result[:, :, idx] = channel_result
            
    return result

def main():
    mode = 0
    image  = cv2.imread("painted_image3.png", mode) # 0:grayscale mode, 1:COLOR mode
    cv2.imshow("Image", image)
    cv2.waitKey(0)

    image  = image.astype(np.float64)
    # image2 = np.copy(image)

    # mask = cv2.imread("mask3.png",0)
    # mask = mask!=255

    if (mode == 0):
        mask = np.ones(image.shape) == 1
        start_time = time.time()
        image = LpMPv2(image,mask)
        print("Time : ", time.time() - start_time)
    else:
        mask = np.ones((image.shape[0], image.shape[1])) == 1

        start_time = time.time()
        X = process_image_channels(image, mask)
        print("Time : ", time.time() - start_time)

        start_time = time.time()
        image[:, :, 0] = LpMPv2(image[:, :, 0],mask) #blue_channel
        image[:, :, 1] = LpMPv2(image[:, :, 1],mask) #green_channel
        image[:, :, 2] = LpMPv2(image[:, :, 2],mask) #red_channel
        print("Time : ", time.time() - start_time)


    image=np.clip(image, 0, 255).astype(np.uint8)
    cv2.imshow("Image", image)
    cv2.waitKey(0)

    # image2=np.clip(image2, 0, 255).astype(np.uint8)
    # cv2.imshow("Image", image2)
    # cv2.waitKey(0)

    # cv2.imshow("Image", image-X)
    # cv2.waitKey(0)

    cv2.destroyAllWindows()

if __name__ == '__main__':
    # cProfile.run('main()')
    main()