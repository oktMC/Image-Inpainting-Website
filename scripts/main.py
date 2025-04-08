import sys
import json
import numpy as np
import cv2
from functools import partial
import concurrent.futures
import time

from utils import LpMPv2


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

def main():
    
    imagePath = sys.argv[1]
    resultPath = sys.argv[2]  
    mode = int(sys.argv[3])

    json_data_str = sys.stdin.read()
    
    image  = cv2.imread(imagePath,mode)
    image  = image.astype(np.float64)

    if json_data_str == "null" :
        m, n = image.shape[:2]
        mask = np.ones((m, n))
    else :
        json_data = json.loads(json_data_str)

        data = json_data["data"]
        width = json_data["width"]
        height = json_data["height"]

        data_list = list(data.values())
        mask = np.array(data_list).reshape((height, width))
        mask = mask == 0
    match mode:
        case 0:
            start_time = time.time()
            image = LpMPv2(image,mask)
            print(f"--- {time.time() - start_time:.2f} seconds ---")
        case 1:
            start_time = time.time()
            image = process_image_channels(image, mask)
            print(f"--- {time.time() - start_time:.2f} seconds ---")
        case _:
            raise Exception("Wrong mode")

    cv2.imwrite(resultPath,image)

    # print(f"imagePath: {imagePath}")
    # print(f"Mask: {mask}")
    # print(f"resultPath: {resultPath}")

    # print(f'Image size:{image.shape}')
    # print(f'Mask size:{mask.shape}')

if __name__ == '__main__':
    main()