document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const uploadArea = document.getElementById("upload-area")
  const uploadMessage = document.getElementById("upload-message")
  const fileInput = document.getElementById("file-input")
  const imagePreviewContainer = document.getElementById("image-preview-container")
  const imagePreview = document.getElementById("image-preview")
  const imageOverlay = document.getElementById("image-overlay")
  const uploadBtn = document.getElementById("upload-btn")
  const resetBtn = document.getElementById("reset-btn")
  const uploadStatus = document.getElementById("upload-status")
  const canvas = document.getElementById("resultCanvas")
  const magicWandTool = document.getElementById("magic-wand-tool")
  const { body, documentElement } = document;

  //Toggle Switch
  const switchCheckbox = document.getElementById('switch');
  const modeIcon = document.getElementById('mode-icon');
  
  // Tool buttons
  const toolButtons = document.querySelectorAll(".tool-btn")
  const modeButtons = document.querySelectorAll(".mode-btn")

  // Processing element
  const processingModal = document.getElementById("processing-modal")
  const processingContainer = document.getElementById("processing-container")
  const resultContainer = document.getElementById("result-container")
  const processedImage = document.getElementById("processed-image")
  const downloadBtn = document.getElementById("download-btn")
  const saveGalleryBtn = document.getElementById("save-gallery-btn")
  const backBtn = document.getElementById("back-btn")
  const closeModalBtn = document.getElementById("close-modal-btn")

  // Login elements
  const authIcon = document.getElementById("auth-icon")
  const loginModal = document.getElementById("login-modal")
  const closeLoginBtn = document.getElementById("close-login-btn")
  const loginForm = document.getElementById("login-form")

  // SignUp element
  const signupModal = document.getElementById("signup-modal")
  const closeSignupBtn = document.getElementById("close-signup-btn")
  const signupForm = document.getElementById("signup-form")
  const showSignupLink = document.getElementById("show-signup-link")
  const backToLoginBtn = document.getElementById("back-to-login-btn")

  // Add these elements to the top with the other element declarations
  const navLinks = document.querySelectorAll(".nav-links a")
  const editorView = document.getElementById("editor-view")
  const galleryView = document.getElementById("gallery-view")
  const galleryGrid = document.getElementById("gallery-grid")
  const galleryEmpty = document.getElementById("gallery-empty")
  const searchInput = document.getElementById("search-gallery")
  const filterSelect = document.getElementById("filter-gallery")
  const goToUploadBtn = document.getElementById("go-to-upload-btn")

  // Preview modal elements
  const imagePreviewModal = document.getElementById("image-preview-modal")
  const previewImage = document.getElementById("preview-image")
  const previewImageTitle = document.getElementById("preview-image-title")
  const previewImageDate = document.getElementById("preview-image-date")
  const previewImageSize = document.getElementById("preview-image-size")
  const previewImageDimensions = document.getElementById("preview-image-dimensions")
  const closePreviewBtn = document.getElementById("close-preview-btn")
  const downloadPreviewBtn = document.getElementById("download-preview-btn")
  const deleteImageBtn = document.getElementById("delete-image-btn")

  // Variables
  let currentFile = null
  let activeTool = null
  let activeMode = null
  let isLoggedIn = false
  let { scrollTop } = document.documentElement;
  let uploadStatusTimeout = null;
  let processedImageID = null;
  let savedGallery = false

  // Add these variables to the variables section
  let currentView = "editor"
  let galleryImages = []
  let currentFilter = "all"
  let searchQuery = ""

  // 
  let isPainting = false
  const brushSize = 10
  let isCtrlPressed = false
  let brushPreview = null

  silentLogin()
  // Event Listeners

  const savedTheme = localStorage.getItem('theme') || window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Set the initial state of the toggle
  switchCheckbox.checked = savedTheme === 'dark';
  updateModeIcon(savedTheme);

  // Update the toggle switch event listener
  switchCheckbox.addEventListener('change', () => {
    const newTheme = switchCheckbox.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateModeIcon(newTheme);
  });

  // Event listener for the checkbox
  // switchCheckbox.addEventListener('change', () => {
  //   // Update the mode icon based on the checkbox state
  //   modeIcon.src = switchCheckbox.checked
  //     ? 'https://developer.mozilla.org/static/media/theme-dark.2204a73b9b7fbc5e0219.svg' // Dark mode icon
  //     : 'https://developer.mozilla.org/static/media/theme-light.af1aa3887c0deadaaf2e.svg'; // Light mode icon
  // });

  uploadArea.addEventListener("click", () => {
    if (!imagePreviewContainer.classList.contains("active")) {
      fileInput.click()
    }
  })

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    uploadArea.classList.add("drag-over")
  })

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over")
  })

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("drag-over")

    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files)
    }
  })

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFiles(fileInput.files)
    }
  })

  resetBtn.addEventListener("click", resetUpload)

  uploadBtn.addEventListener("click", sendData)

  // Modal event listeners
  closeModalBtn.addEventListener("click", closeModal)
  backBtn.addEventListener("click", closeModal)
  downloadBtn.addEventListener("click", downloadImageResult)
  saveGalleryBtn.addEventListener("click", saveToGallery) 

  // Tool button event listeners
  toolButtons.forEach((button) => {
    button.addEventListener("click", function() {
        // Deactivate all tools
        toolButtons.forEach((btn) => btn.classList.remove("active"));
        // If clicking the same tool, deactivate it
        if (activeTool === this.id) {
          activeTool = null;
          if (this.id === "paint-tool") {
              stopPainting();
          }
          if (this.id === "magic-wand-tool") {
              resetMagicWand();
          }
          return;
        }
        
        // Activate the clicked tool
        this.classList.add("active");
        if (activeTool) {
          if (activeTool === "paint-tool") {
              stopPainting();
          } else if (activeTool === "magic-wand-tool") {
              resetMagicWand();
          }
        }

        activeTool = this.id;

        if (this.id === "paint-tool") {
          startPainting();
        } else if (this.id === "magic-wand-tool") {
          runMagicWand();
        }
    });
  });


  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const view = link.getAttribute("data-view")
      if (view) {
        switchView(view)
      }
    })
  })

  // Go to upload button
  goToUploadBtn.addEventListener("click", () => {
    switchView("editor")
  })

  // Search input
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase()
    filterGalleryImages()
  })

  // Filter select
  filterSelect.addEventListener("change", (e) => {
    currentFilter = e.target.value
    filterGalleryImages()
  })

  // Preview modal
  closePreviewBtn.addEventListener("click", closePreviewModal)
  imagePreviewModal.addEventListener("click", (e) => {
    if (e.target === imagePreviewModal) {
      closePreviewModal()
    }
  })

  downloadPreviewBtn.addEventListener("click", downloadPreviewImage)

  modeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Deactivate all tools
      modeButtons.forEach((btn) => btn.classList.remove("active"))
      mode = null
      if (activeMode === this.id) {
        activeMode = null
        return
      }

      this.classList.add("active")
      activeMode = this.id

      if (this.id === "Grayscale") {
        mode = 0
      }
      if (this.id === "RGB") {
        mode = 1
      }
    })
  })

  processingModal.addEventListener("click", (e) => {
    if (e.target === processingModal) {
      closeModal()
    }
  })

  // Auth icon event listener
  authIcon.addEventListener("click", toggleAuth)

  // Login modal event listeners
  closeLoginBtn.addEventListener("click", closeLoginModal)
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      closeLoginModal()
    }
  })

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    // Get form values (trim whitespace)
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
  
    // Validate inputs
    if (!username || !password) {
      showFormError("username", "Username and password are required");
      return;
    }
  
    try {
      // Show loading state (disable submit button)
      const submitButton = loginForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Logging in...";
  
      // Send login request
      const response = await axios.post('/api/login', {
        username: username,
        password: password,
      });
  
      // Handle successful login
      isLoggedIn = true;
      updateAuthIcon();
      closeLoginModal();
      showUploadStatus(`Welcome back, ${username}!`, "success");
      // Optional: Save token to localStorage/sessionStorage
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
  
    } catch (error) {
      console.error("Login error:", error);
  
      // Handle specific error messages
      if (error.response) {
        switch (error.response.status) {
          case 401:
            showFormError("password", "Invalid username or password");
            break;
          case 404:
            showFormError("username", "User not found");
            break;
          default:
            showUploadStatus("Login failed. Please try again.", "error");
        }
      } else if (error.request) {
        showUploadStatus("Network error. Check your connection.", "error");
      } else {
        showUploadStatus("An unexpected error occurred.", "error");
      }
    } finally {
      // Reset submit button
      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Log In";
      }
    }
  });

  // Show signup form
  showSignupLink.addEventListener("click", (e) => {
    e.preventDefault()
    closeLoginModal()
    openSignupModal()
  })

  // Back to login
  backToLoginBtn.addEventListener("click", () => {
    closeSignupModal()
    openLoginModal()
  })

  // Close signup modal
  closeSignupBtn.addEventListener("click", closeSignupModal)
  signupModal.addEventListener("click", (e) => {
    if (e.target === signupModal) {
      closeSignupModal()
    }
  })

  // Signup form submission
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    // Get form values (trim whitespace)
    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
  
    // Validate inputs
    if (!username || !password || !confirmPassword) {
      showFormError("signup-username", "All fields are required");
      return;
    }
  
    if (password.length < 8) {
      showFormError("signup-password", "Password must be at least 8 characters");
      return;
    }
  
    if (password !== confirmPassword) {
      showFormError("confirm-password", "Passwords do not match");
      return;
    }
  
    try {
      // Show loading state (e.g., disable submit button)
      const submitButton = signupForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Creating account...";
  
      // Send request to server
      const response = await axios.post('/api/register', {
        username: username,
        password: password,
      });
  
      // Handle success
      isLoggedIn = true;
      updateAuthIcon();
      closeSignupModal();
      showUploadStatus(`Welcome, ${username}! Your account has been created.`, "success");
  
    } catch (error) {
      console.error('Signup error:', error);
  
      // Handle specific error messages from the server
      if (error.response) {
        const { data } = error.response;
        if (data.error === "Username already exists") {
          showFormError("signup-username", "Username is already taken");
        } else {
          showUploadStatus("Failed to create account. Please try again.", "error");
        }
      } else {
        showUploadStatus("Network error. Please check your connection.", "error");
      }
    } finally {
      // Reset submit button
      const submitButton = signupForm.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.textContent = "Sign Up";
    }
  });
  
  // Image overlay for tool interactions
  // imageOverlay.addEventListener("click", (e) => {
  //   if (activeTool === "magic-wand-tool") {
  //     // Get click coordinates relative to the image
  //     const rect = imagePreview.getBoundingClientRect()
  //     const x = e.clientX - rect.left
  //     const y = e.clientY - rect.top

  //     // Run magic wand code
  //     runMagicWandCode(x, y)
  //   }
  // })

  // Functions
  function updateModeIcon(theme) {
    modeIcon.src = theme === 'dark' 
      ? 'https://developer.mozilla.org/static/media/theme-dark.2204a73b9b7fbc5e0219.svg'
      : 'https://developer.mozilla.org/static/media/theme-light.af1aa3887c0deadaaf2e.svg';
    
    // Also update the icon color if needed
    const icon = document.querySelector('.auth-icon i');
    if (icon) {
      icon.style.color = theme === 'dark' ? '#e0e0e0' : '#555';
    }
  }

  function handleFiles(files) {
    const file = files[0]

    // Validate file type and size
    if (!file.type.match("image.*")) {
      showUploadStatus("Please select an image file (JPG, PNG, GIF).", "error")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      showUploadStatus("File size exceeds 5MB limit.", "error")
      return
    }

    currentFile = file

    // Create file reader to display preview
    const reader = new FileReader()

    reader.onload = (e) => {
      imagePreview.src = e.target.result
      uploadMessage.style.display = "none"
      imagePreviewContainer.classList.add("active")
      // uploadArea.classList.add("has-image")
      uploadBtn.disabled = false
      imagePreview.onload = function() {
        window.initCanvas(imagePreview);
      };
    }

    reader.readAsDataURL(file)
  }

  function resetUpload() {
    uploadMessage.style.display = "flex"
    imagePreviewContainer.classList.remove("active")
    uploadArea.classList.remove("has-image")
    imagePreview.src = ""
    fileInput.value = ""
    uploadBtn.disabled = true
    currentFile = null
    uploadStatus.style.display = "none"

    // Reset tools
    toolButtons.forEach((btn) => btn.classList.remove("active"))
    activeTool = null
    modeButtons.forEach((btn) => btn.classList.remove("active"))
    activeMode = null
    mode = null
    resetMagicWand()
    stopPainting()
  }

  // function uploadImage() {
  //   if (!currentFile) return

  //   // Simulate upload with progress
  //   uploadBtn.disabled = true
  //   showUploadStatus("Uploading image...", "info")

  //   // Simulate API call to backend
  //   setTimeout(() => {
  //     // This is where you would normally send the file to your backend
  //     // using FormData and fetch or XMLHttpRequest

  //     // For demo purposes, we'll just simulate a successful upload
  //     showUploadStatus("Image uploaded successfully!", "success")
  //     uploadBtn.disabled = false
  //   }, 2000)
  // }

  async function sendData(){
    // const imgData = document.getElementById('file-input')
    // const processedImage = document.getElementById('processedImage');
    const formData = new FormData();

    // const file = imgData.files[0];
    
    if (!currentFile || !mask || mode === null) {
        alert('Please select an image, a mode and a mask.');
        return;
    }
    formData.append('image', currentFile , 'image.jpg');
    formData.append('mask', JSON.stringify(mask)); 
    formData.append('isLoggedIn', isLoggedIn);

    openProcessingModal()

    try {
        uploadBtn.disabled = true
        resetBtn.disabled = true
        const response = await axios.post(`/process/${mode}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data' // Set the content type
            },
            responseType: 'blob' // Expect a binary response (image)
        });

        // Display the processed image
        const imageUrl = URL.createObjectURL(response.data);
        processedImageID = response.headers['x-processed-image-id']
        // imagePreview.src = imageUrl;
        processedImage.src = imageUrl

         // Hide processing container and show result container
        processingContainer.style.display = "none"
        resultContainer.style.display = "block"

        showUploadStatus("Image processed successfully!", "success")
        uploadBtn.disabled = false
        resetBtn.disabled = false
    } catch (error) {
        console.error('Error:', error);
        showUploadStatus('Failed to process image.', "error")
        uploadBtn.disabled = false
        resetBtn.disabled = false
    }
  }

  function openProcessingModal() {
    // Reset modal state
    processingContainer.style.display = "flex"
    resultContainer.style.display = "none"

    // Show the modal
    processingModal.classList.add("active")

    // Prevent body scrolling
    disableScroll()
  }

  async function closeModal() {
    if (!savedGallery){
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.delete('/api/nosave', {
          data: { 
              processedImageID: processedImageID 
          },
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error(error);
      }
    }
    processingModal.classList.remove("active")
    enableScroll()

    // Re-enable the upload button
    uploadBtn.disabled = false
    saveGalleryBtn.disabled = false;
    savedGallery = false;
  }

  //type: success/error
  function showUploadStatus(message, type) { 
    uploadStatus.textContent = message
    uploadStatus.className = "upload-status"
    uploadStatus.classList.add(type)
    uploadStatus.style.display = "block"

    uploadStatusTimeout = setTimeout(() => {
      uploadStatus.classList.remove(type);
      uploadStatus.textContent = "";
      uploadStatus.style.display = "none"; // Optional: Hide after clearing
      uploadStatusTimeout = null; // Reset the timeout ID
    }, 5000); 
  }

  function setMagicWandCursor() {
    canvas.classList.add("magic-wand-cursor")
    // imageOverlay.style.pointerEvents = "auto"
  }

  function runMagicWand(){
    canvas.classList.add("magic-wand-cursor")
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    document.onkeydown = onKeyDown;
    document.onkeyup = onKeyUp;
  }

  function resetMagicWand(){
    mask = null;
    oldMask = null;
    if (imageInfo && imageInfo.context) {
        imageInfo.context.clearRect(0, 0, imageInfo.width, imageInfo.height);
        imageInfo.context.drawImage(document.getElementById("image-preview"), 0, 0);
    }
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.classList.remove("magic-wand-cursor")
  }

  function onKeyDown(e) {
    if (e.keyCode == 17 && activeTool === "magic-wand-tool") document.getElementById("resultCanvas").classList.add("add-mode");
  }
  
  function onKeyUp(e) {
    if (e.keyCode == 17) document.getElementById("resultCanvas").classList.remove("add-mode");
  }
  
  function startPainting() {
    if (!imageInfo) return;
    
    // Create brush preview element if it doesn't exist
    if (!brushPreview) {
        brushPreview = document.createElement("div");
        brushPreview.className = "brush-preview";
        brushPreview.style.width = brushSize + "px";
        brushPreview.style.height = brushSize + "px";
        brushPreview.style.display = "none";
        canvas.parentNode.appendChild(brushPreview);
    }
    
    // Add event listeners for painting
    canvas.addEventListener("mousedown", startBrushStroke);
    canvas.addEventListener("mousemove", moveBrush);
    canvas.addEventListener("mouseup", endBrushStroke);
    canvas.addEventListener("mouseleave", endBrushStroke);
    
    // Add event listeners for Ctrl key
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    
    // Position brush preview at cursor
    canvas.style.cursor = "none";
    brushPreview.style.display = "block";
  }

  // Function to stop painting mode
  function stopPainting() {
    if (brushPreview) {
        brushPreview.style.display = "none";
    }
    
    // Remove event listeners
    canvas.removeEventListener("mousedown", startBrushStroke);
    canvas.removeEventListener("mousemove", moveBrush);
    canvas.removeEventListener("mouseup", endBrushStroke);
    canvas.removeEventListener("mouseleave", endBrushStroke);
    
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    
    // Reset cursor
    canvas.style.cursor = "";
  }

  // Function to handle mouse down for painting
  function startBrushStroke(e) {
    isPainting = true
    paint(e)
  }

  // Function to handle mouse move for painting
  function moveBrush(e) {
    if (!brushPreview) return;
    
    // Get mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate the size based on whether Ctrl is pressed
    const currentSize = isCtrlPressed ? brushSize * 2 : brushSize;
    
    // Update brush preview
    brushPreview.style.width = currentSize + "px";
    brushPreview.style.height = currentSize + "px";
    brushPreview.style.left = (x - currentSize / 2) + "px";
    brushPreview.style.top = (y - currentSize / 2) + "px";
    
    // Paint if mouse is pressed
    if (isPainting) {
        paint(e);
    }
  }

  // Function to handle mouse up for painting
  function endBrushStroke() {
    isPainting = false
  }

  // Function to handle key down for Ctrl key
  function handleKeyDown(e) {
    if (e.key === "Control") {
      isCtrlPressed = true

      // Update brush preview size
      if (brushPreview) {
        const currentSize = brushSize * 2
        brushPreview.style.width = currentSize + "px"
        brushPreview.style.height = currentSize + "px"
      }
    }
  }

  // Function to handle key up for Ctrl key
  function handleKeyUp(e) {
    if (e.key === "Control") {
      isCtrlPressed = false

      // Update brush preview size
      if (brushPreview) {
        brushPreview.style.width = brushSize + "px"
        brushPreview.style.height = brushSize + "px"
      }
    }
  }

  // Function to paint on the canvas
  function paint(e) {
    if (!imageInfo) return;
    
    const ctx = imageInfo.context;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    const scaleX = canvas.width / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    const canvasX = Math.round(x * scaleX);
    const canvasY = Math.round(y * scaleY);
    const scaledSize = Math.round(brushSize * ((scaleX + scaleY) / 2));
    
    // Draw white circle
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, scaledSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Update mask if it exists
    if (!mask) {
        mask = {
            data: new Uint8Array(imageInfo.width * imageInfo.height),
            width: imageInfo.width,
            height: imageInfo.height,
            bounds: { 
                minX: canvasX, 
                minY: canvasY, 
                maxX: canvasX, 
                maxY: canvasY 
            }
        };
    }
    
    // Mark painted area in mask
    const radius = Math.ceil(scaledSize / 2);
    for (let y = canvasY - radius; y <= canvasY + radius; y++) {
        for (let x = canvasX - radius; x <= canvasX + radius; x++) {
            if (x >= 0 && x < imageInfo.width && 
                y >= 0 && y < imageInfo.height &&
                Math.sqrt((x-canvasX)**2 + (y-canvasY)**2) <= radius) {
                mask.data[y * imageInfo.width + x] = 1;
            }
        }
    }
    
    // Update bounds
    mask.bounds.minX = Math.min(mask.bounds.minX, canvasX - radius);
    mask.bounds.minY = Math.min(mask.bounds.minY, canvasY - radius);
    mask.bounds.maxX = Math.max(mask.bounds.maxX, canvasX + radius);
    mask.bounds.maxY = Math.max(mask.bounds.maxY, canvasY + radius);
    
    updateImageData();
  }

  function downloadImageResult() {
    // Create a temporary link element
    const link = document.createElement("a")
    link.href = processedImage.src
    link.download = "processed-image.png"

    // Append to the document, click it, and remove it
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function toggleAuth() {
    if (isLoggedIn) {
      // Log out
      isLoggedIn = false
      localStorage.removeItem('authToken');
      updateAuthIcon()
      showUploadStatus("You have been logged out.", "success")
    } else {
      // Show login modal
      openLoginModal()
    }
  }

  function updateAuthIcon() {
    const iconElement = authIcon.querySelector("i")

    if (isLoggedIn) {
      // Change to logout icon
      iconElement.className = "fas fa-sign-out-alt"
      iconElement.title = "Logout"
    } else {
      // Change to login icon
      iconElement.className = "fa-solid fa-user-plus"
      iconElement.title = "Login"
    }
  }

  function openLoginModal() {
    // Reset form
    loginForm.reset()

    // Show the modal
    loginModal.classList.add("active")

    // Prevent body scrolling
    disableScroll()

    // Focus on username field
    document.getElementById("username").focus()
  }

  function closeLoginModal() {
    loginModal.classList.remove("active")
    enableScroll()
  }

  function openSignupModal() {
    // Reset form
    signupForm.reset()

    // Clear any previous error messages
    clearFormErrors()

    // Show the modal
    signupModal.classList.add("active")

    // Prevent body scrolling
    disableScroll()

    // Focus on username field
    document.getElementById("signup-username").focus()
  }

  function closeSignupModal() {
    signupModal.classList.remove("active")
    enableScroll()
  }

  function showFormError(inputId, message) {
    // Get the input element
    const input = document.getElementById(inputId)

    // Check if error element already exists
    let errorElement = input.parentElement.querySelector(".form-error")

    // If not, create one
    if (!errorElement) {
      errorElement = document.createElement("div")
      errorElement.className = "form-error"
      input.parentElement.appendChild(errorElement)
    }

    // Set the error message and show it
    errorElement.textContent = message
    errorElement.classList.add("visible")

    // Add error styling to the input
    input.style.borderColor = "#dc3545"

    // Focus on the input
    input.focus()
  }

  function clearFormErrors() {
    // Remove all error messages
    const errorElements = document.querySelectorAll(".form-error")
    errorElements.forEach((element) => {
      element.classList.remove("visible")
    })

    // Reset input styling
    const inputs = document.querySelectorAll("input")
    inputs.forEach((input) => {
      input.style.borderColor = ""
    })
  }

  function disableScroll() {
    scrollTop = documentElement.scrollTop;
    body.style.top = `-${scrollTop}px`;
    body.classList.add("scroll-disabled");
  }

  function enableScroll() {
    body.classList.remove("scroll-disabled");
    documentElement.scrollTop = scrollTop;
    body.style.removeProperty("top");
  }

  async function silentLogin() {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        // Axios request with Bearer token
        const response = await axios.get('/api/validate-token', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
  
        const { isValid, username } = response.data;
        if (isValid) {
          isLoggedIn = true;
          updateAuthIcon();
          // showUploadStatus(`Welcome back, ${username}!`, "success");
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            console.error("Token expired or invalid");
          } else {
            console.error("Network error:", error.message);
          }
        } else {
            console.error("Unexpected error:", error);
        }
      }
    } 
  }
  
  // Add these functions to the end of the file
  function switchView(view) {
    // Update current view
    currentView = view

    // Update navigation
    navLinks.forEach((link) => {
      if (link.getAttribute("data-view") === view) {
        link.classList.add("active")
      } else {
        link.classList.remove("active")
      }
    })

    // Show/hide views
    if (view === "editor") {
      editorView.style.display = "block"
      galleryView.style.display = "none"
    } else if (view === "gallery") {
      editorView.style.display = "none"
      galleryView.style.display = "block"

      // Load gallery images
      loadGalleryImages()
    }
  }

  async function loadGalleryImages() {
    // Clear existing images
    galleryGrid.innerHTML = ""

    if (isLoggedIn) {
      // Sample user gallery data
      try{
        const token = localStorage.getItem('authToken')
        const response = await axios.get('/api/gallery',{
          headers: {
            'Authorization': `Bearer ${token}`,
        },
      })
        galleryImages = response.data.images
        console.log(response.data)
        console.log(galleryImages)
      } catch (error){
        console.error("Error saving image:", error);
        const errorMsg = error.response?.data?.error || "Failed to load image";
        showUploadStatus(errorMsg, "error");
      }

      // Show gallery, hide empty state
      galleryGrid.style.display = "grid"
      galleryEmpty.style.display = "none"

      // Filter and render images
      filterGalleryImages()
    } else {
      // User not logged in, show empty state
      galleryImages = []
      galleryGrid.style.display = "none"
      galleryEmpty.style.display = "block"
      goToUploadBtn.style.display = 'none';
      showUploadStatus("Plesae Login","error")
    }
  }

  function filterGalleryImages() {
    // Filter images based on search query and filter type
    const filteredImages = galleryImages.filter((image) => {
      // Search filter
      const matchesSearch = image.title.toLowerCase().includes(searchQuery)

      // // Type filter
      const matchesType = currentFilter === "all" || (currentFilter === "favorites" && image.favorite) || (currentFilter === "recent" && isRecent(image.uploadedAt))
      // return matchesSearch && matchesType
      return matchesSearch && matchesType
    })

    // Render filtered images
    renderGalleryImages(filteredImages)
  }

  // day <= 7 days (true)
  function isRecent(uploadedAt) {

    const uploadedDate = new Date(uploadedAt);
    const currentDate = new Date();
    const diffInMs = currentDate - uploadedDate;
    
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    
    return diffInMs <= sevenDaysInMs;
  }

  function renderGalleryImages(images) {
    // Clear existing images
    galleryGrid.innerHTML = ""

    if (images.length === 0) {
      // No images match the filters
      galleryGrid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
          <p>No images match your search criteria.</p>
        </div>
      `
      return
    }

    // Render each image
    images.forEach((image) => {
      const galleryItem = document.createElement("div")
      const starIcon = image.favorite ? "fa-solid fa-star" : "fa-regular fa-star"
      const starIcon_reverse = image.favorite ? "fa-regular fa-star" : "fa-solid fa-star"
      galleryItem.className = "gallery-item"
      // galleryItem.dataset.id = image.id

      galleryItem.innerHTML = `
        <div class="gallery-item-image">
          <img src="data:image/jpeg;base64,${image.image}" alt="${image.title}">
          <div class="gallery-item-overlay">
            <div class="gallery-item-actions">
              <button class="gallery-action-btn view-btn" title="View">
                <i class="fas fa-eye"></i>
              </button>
              <button class="gallery-action-btn download-btn" title="Download">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="gallery-item-info">
          <div class="gallery-item-header">
            <div class="title-container">
              <h3 class="gallery-item-title">${image.title}</h3>
              <button class="edit-name-btn" title="Edit name">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="favorite-btn" title="${image.favorite ? "Remove from favorites" : "Add to favorites"}">
                <i class="${starIcon}" ></i>
              </button>
            </div>
          </div>
          <div class="gallery-item-meta">
            <span>${image.uploadedAt.split('T')[0]}</span>
            <span>${image.size}</span>
          </div>
        </div>
      `

      // Add event listeners
      const viewBtn = galleryItem.querySelector(".view-btn")
      // const editBtn = galleryItem.querySelector(".edit-btn")
      const downloadBtn = galleryItem.querySelector(".download-btn")
      const favoriteBtn = galleryItem.querySelector(".favorite-btn")
      const editNameBtn = galleryItem.querySelector(".edit-name-btn")

      viewBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        openPreviewModal(image)
      })

      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        downloadGalleryImage(image)
      })

      favoriteBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        toggleFavorite(image._id)
      })

      favoriteBtn.addEventListener("mouseover", (e) => {
        e.stopPropagation()
        favoriteBtn.querySelector('i').className= starIcon_reverse
      })

      favoriteBtn.addEventListener("mouseout", (e) => {
        e.stopPropagation()
        favoriteBtn.querySelector('i').className= starIcon
      })

      editNameBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        startEditingName(galleryItem, image)
      })

      // Click on the item to preview
      galleryItem.addEventListener("click", () => openPreviewModal(image))

      galleryGrid.appendChild(galleryItem)
    })
  }

  function openPreviewModal(image) {
    // Set preview image details
    previewImage.src = `data:${image.mimeType};base64,${image.image}`
    // previewImageTitle.textContent = image.title
    previewImageDate.textContent = image.uploadedAt.split('T')[0]
    previewImageSize.textContent = image.size
    previewImageDimensions.textContent = image.dimensions

    // Show the modal
    imagePreviewModal.classList.add("active")

    // Prevent body scrolling
    disableScroll()
    const deleteHandler = async() => {
      if (confirm("Are you sure you want to delete this image?")) {
        // In a real app, this would send a request to delete the image
        try {
          console.log(image._id)
          const token = localStorage.getItem('authToken');
          const response = await axios.delete('/api/users/delete', {
            data: { 
                _id: image._id 
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
          });
  
        } catch (error) {
          console.error('Error:', error);
          showUploadStatus("Failed to delete image!","error")
        }
        showUploadStatus("Image deleted successfully!","success")
        closePreviewModal()
        loadGalleryImages() // Reload the gallery
      }
    }
    deleteImageBtn.addEventListener("click", deleteHandler)
    imagePreviewModal._deleteHandler = deleteHandler;
  }

  function closePreviewModal() {
    deleteImageBtn.removeEventListener("click", imagePreviewModal._deleteHandler);
    imagePreviewModal.classList.remove("active")
    enableScroll()
  }

  function downloadPreviewImage() {
    const link = document.createElement("a");
    
    // 1. Extract MIME type from src (e.g., "image/png")
    const mimeType = previewImage.src.match(/^data:(image\/\w+);/)?.[1] || 'image/png';
    const extension = mimeType.split('/')[1]; // "png", "jpeg", etc.
    
    // 2. Generate filename with correct extension
    const filename = `${previewImageTitle.textContent || 'image'}.${extension}`;
    
    // 3. Set up download
    link.href = previewImage.src;
    link.download = filename;
    
    // 4. Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadGalleryImage(image) {
    try {
      const link = document.createElement("a");
      
      // 1. Extract extension from MIME type (priority) or fallback
      const getExtension = () => {
        if (image.mimeType) return image.mimeType.split('/')[1]; // "image/jpeg" → "jpeg"
        if (image.src?.match(/^data:image\/\w+;/)) { // Parse Base64 prefix
          return image.src.match(/^data:image\/(\w+);/)[1];
        }
        return 'png'; // Default fallback
      };
  
      // 2. Generate safe filename
      const sanitize = (name) => name.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase();
      const filename = `${sanitize(image.title || 'image')}.${getExtension()}`;
  
      // 3. Prepare download URL
      const src = image.image 
        ? `data:${image.mimeType || 'image/png'};base64,${image.image}` // Construct Base64
        : image.src; // Use direct URL
  
      // 4. Configure link
      link.href = src;
      link.download = filename;
      link.rel = 'noopener noreferrer'; // Security for external URLs
      link.style.display = 'none';
  
      // 5. Trigger download
      document.body.appendChild(link);
      link.click();
      
      // 6. Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        if (link.href.startsWith('blob:')) URL.revokeObjectURL(link.href);
      }, 100);
  
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download error: ${error.message}`);
    }
  }

  async function toggleFavorite(imageId) {
    // Find the image in the gallery
    const imageIndex = galleryImages.findIndex(img => img._id === imageId)
    
    if (imageIndex !== -1) {
      // Toggle the favorite status
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.put('/api/users/favorites',
          { _id: imageId,
            favorite: !galleryImages[imageIndex].favorite,
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        galleryImages[imageIndex].favorite = !galleryImages[imageIndex].favorite
        filterGalleryImages()

      } catch (error) {
        console.error("Error update image:", error);
        const errorMsg = error.response?.data?.error || "Unable to update image to favorites";
        showUploadStatus(errorMsg, "error");
      }
    }
  }

  // Modify the saveToGallery function to add the image to the gallery
  async function saveToGallery() {
    // In a real app, this would send the image to your backend
    // For this demo, we'll add it to our local gallery
    if(!isLoggedIn){
      showUploadStatus("Please login to use Gallery","error")
      return;
    }
    const token = localStorage.getItem('authToken');
    if (processedImage.src) {
      try {
          // Get dimensions from the processed image
          console.log(localStorage.getItem('authToken'))
          // Send data to server using Axios
          const response = await axios.post('/api/save', {
              processedImageID: processedImageID,
          }, {
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
              },
          });
          saveGalleryBtn.disabled = true;
          showUploadStatus("Image saved to gallery!", "success");
          savedGallery = true
      } catch (error) {
          console.error("Error saving image:", error);
          const errorMsg = error.response?.data?.error || "Failed to save image";
          showUploadStatus(errorMsg, "error");
      }
  }
  }

  function startEditingName(galleryItem, image) {
    // Get the title container and current title element
    const titleContainer = galleryItem.querySelector(".title-container")
    const titleElement = galleryItem.querySelector(".gallery-item-title")
    const currentTitle = titleElement.textContent

    // Create an input field for editing
    const inputField = document.createElement("input")
    inputField.type = "text"
    inputField.value = currentTitle
    inputField.className = "edit-title-input"

    // Create save button
    const saveButton = document.createElement("button")
    saveButton.className = "save-title-btn"
    saveButton.innerHTML = '<i class="fas fa-check"></i>'
    saveButton.title = "Save"

    // Create cancel button
    const cancelButton = document.createElement("button")
    cancelButton.className = "cancel-title-btn"
    cancelButton.innerHTML = '<i class="fas fa-times"></i>'
    cancelButton.title = "Cancel"

    // Create container for the buttons
    const buttonContainer = document.createElement("div")
    buttonContainer.className = "edit-title-buttons"
    buttonContainer.appendChild(saveButton)
    buttonContainer.appendChild(cancelButton)

    // Replace the title with the input field and buttons
    titleContainer.innerHTML = ""
    titleContainer.appendChild(inputField)
    titleContainer.appendChild(buttonContainer)

    // Focus the input field
    inputField.focus()
    inputField.select()

    // Prevent clicks on the input from triggering the gallery item click
    inputField.addEventListener("click", (e) => {
      e.stopPropagation()
    })

    // Handle save button click
    saveButton.addEventListener("click", (e) => {
      e.stopPropagation()
      saveImageName(galleryItem, image, inputField.value)
    })

    // Handle cancel button click
    cancelButton.addEventListener("click", (e) => {
      e.stopPropagation()
      cancelEditingName(galleryItem, image)
    })

    // Handle Enter key press
    inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        saveImageName(galleryItem, image, inputField.value)
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelEditingName(galleryItem, image)
      }
    })
  }

  async function saveImageName(galleryItem, image, newName) {
    const starIcon = image.favorite ? "fa-solid fa-star" : "fa-regular fa-star"
    // Trim the new name
    newName = newName.trim()
    // If the new name is empty, revert to the original name
    if (!newName) {
      cancelEditingName(galleryItem, image)
      return
    }
    // Update the image title in our data
    const imageIndex = galleryImages.findIndex((img) => img._id === image._id)
    
    if (imageIndex !== -1) {

      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.put('/api/users/title',
          { _id: image._id,
            title: newName,
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        galleryImages[imageIndex].title = newName

        // Update the title in the DOM
        const titleContainer = galleryItem.querySelector(".title-container")
        titleContainer.innerHTML = `
        <h3 class="gallery-item-title">${newName}</h3>
        <button class="edit-name-btn" title="Edit name">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="favorite-btn" title="${image.favorite ? "Remove from favorites" : "Add to favorites"}">
          <i class="${starIcon}" ></i>
        </button>
        `

        // Re-add event listener to the edit button
        const editNameBtn = titleContainer.querySelector(".edit-name-btn")
        const favoriteBtn = titleContainer.querySelector(".favorite-btn")
        editNameBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          startEditingName(galleryItem, galleryImages[imageIndex])
        })

        favoriteBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          toggleFavorite(image._id)
        })
  
        favoriteBtn.addEventListener("mouseover", (e) => {
          e.stopPropagation()
          favoriteBtn.querySelector('i').className= starIcon_reverse
        })
  
        favoriteBtn.addEventListener("mouseout", (e) => {
          e.stopPropagation()
          favoriteBtn.querySelector('i').className= starIcon
        })

      } catch (error) {
        console.error("Error update image:", error);
        const errorMsg = error.response?.data?.error || "Unable to update image title";
        showUploadStatus(errorMsg, "error");
      }
    }
  }

  function cancelEditingName(galleryItem, image) {
    // Restore the original title element
    const titleContainer = galleryItem.querySelector(".title-container")
    const starIcon = image.favorite ? "fa-solid fa-star" : "fa-regular fa-star"
    titleContainer.innerHTML = `
    <h3 class="gallery-item-title">${image.title}</h3>
    <button class="edit-name-btn" title="Edit name">
      <i class="fa-solid fa-pen-to-square"></i>
    </button>
    <button class="favorite-btn" title="${image.favorite ? "Remove from favorites" : "Add to favorites"}">
      <i class="${starIcon}" ></i>
    </button>
  `

    // Re-add event listener to the edit button
    const editNameBtn = titleContainer.querySelector(".edit-name-btn")
    const favoriteBtn = titleContainer.querySelector(".favorite-btn")
    editNameBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      startEditingName(galleryItem, image)
    })

    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      toggleFavorite(image._id)
    })

    favoriteBtn.addEventListener("mouseover", (e) => {
      e.stopPropagation()
      favoriteBtn.querySelector('i').className= starIcon_reverse
    })

    favoriteBtn.addEventListener("mouseout", (e) => {
      e.stopPropagation()
      favoriteBtn.querySelector('i').className= starIcon
    })
  }
  
})
