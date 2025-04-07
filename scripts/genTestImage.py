import cv2
import numpy as np

def draw_circle(event, x, y, flags, param):
    global drawing, image, mask
    if event == cv2.EVENT_LBUTTONDOWN:  # Start drawing 
        drawing = True
    elif event == cv2.EVENT_MOUSEMOVE:  # Draw
        if drawing:
            cv2.circle(image, (x, y), 5, (255, 255, 255), -1)  # Draw white circle on the image
            cv2.circle(mask, (x, y), 5, 255, -1)  # Draw on the mask
    elif event == cv2.EVENT_LBUTTONUP:  # Stop drawing when left mouse button is released
        drawing = False

def draw_and_return(image_path=None):
    global drawing, image, mask

    # Initialize global variables
    drawing = False

    # Load the image if provided, else create a blank black canvas
    if image_path:
        image = cv2.imread(image_path)  # Load the image
        image = add_salt_and_pepper_noise(image)
        if image is None:
            raise FileNotFoundError(f"Image at path '{image_path}' could not be loaded.")
        mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)  # Create a mask of the same size as the image
    else:
        image = np.zeros((512, 512, 3), dtype=np.uint8)  # Create a blank canvas
        mask = np.zeros((512, 512), dtype=np.uint8)  # Create a blank mask of the same size

    # Create a window and set the mouse callback
    cv2.namedWindow('Paint')
    cv2.setMouseCallback('Paint', draw_circle)

    print("Draw on the image. Close the window to return the painted image and mask matrix.")

    while True:
        cv2.imshow('Paint', image)  # Show the image
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # Press 'Esc' to exit
            break

    cv2.destroyAllWindows()

    # Return the painted image and mask
    return image, mask

def add_salt_and_pepper_noise(image, salt_prob = 0.02, pepper_prob = 0.02):

    noisy_image = np.copy(image)
    total_pixels = image.size

    # Add salt noise (white pixels)
    num_salt = int(total_pixels * salt_prob)
    coords_salt = [np.random.randint(0, i - 1, num_salt) for i in image.shape[:2]]
    noisy_image[tuple(coords_salt)] = 255

    # Add pepper noise (black pixels)
    num_pepper = int(total_pixels * pepper_prob)
    coords_pepper = [np.random.randint(0, i - 1, num_pepper) for i in image.shape[:2]]
    noisy_image[tuple(coords_pepper)] = 0

    return noisy_image

image_path = "d.jpg"  # Replace with the path to your image file
try:
    painted_image, mask_matrix = draw_and_return(image_path=image_path)

    # Display the painted image and mask for verification (optional)
    cv2.imshow("Painted Image", painted_image)
    cv2.imshow("Mask Matrix", mask_matrix)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    # Save the painted image and mask if needed
    cv2.imwrite('painted_image3.png', painted_image)
    cv2.imwrite('mask3.png', mask_matrix)

    # Print the mask matrix (optional)
    print("Mask matrix:")
    print(mask_matrix)

except FileNotFoundError as e:
    print(e)