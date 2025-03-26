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

  // Variables
  let currentFile = null
  let activeTool = null
  let activeMode = null
  let isLoggedIn = false
  let { scrollTop } = document.documentElement;

  // Event Listeners

  // Event listener for the checkbox
  switchCheckbox.addEventListener('change', () => {
    // Update the mode icon based on the checkbox state
    modeIcon.src = switchCheckbox.checked
      ? 'https://developer.mozilla.org/static/media/theme-dark.2204a73b9b7fbc5e0219.svg' // Dark mode icon
      : 'https://developer.mozilla.org/static/media/theme-light.af1aa3887c0deadaaf2e.svg'; // Light mode icon
  });
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
      // uploadArea.style.cursor = "default";
    }
  })

  resetBtn.addEventListener("click", resetUpload)

  uploadBtn.addEventListener("click", sendData)

  // Modal event listeners
  closeModalBtn.addEventListener("click", closeModal)
  backBtn.addEventListener("click", closeModal)
  downloadBtn.addEventListener("click", downloadImage)
  saveGalleryBtn.addEventListener("click", saveToGallery) 

  // Tool button event listeners
  toolButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Deactivate all tools
      toolButtons.forEach((btn) => btn.classList.remove("active"))

      // If clicking the same tool, deactivate it
      if (activeTool === this.id) {
        activeTool = null
        resetCursor()
        resetMagicWand()
        return
      }

      // Activate the clicked tool
      this.classList.add("active")
      activeTool = this.id

      // Handle specific tool actions
      if (this.id === "magic-wand-tool") {
        setMagicWandCursor()
        runMagicWand()
      } else {
        resetCursor()
        resetMagicWand()
      }
    })
  })

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
      const response = await axios.post('http://localhost:5000/api/login', {
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
      const response = await axios.post('http://localhost:5000/api/register', {
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
    resetCursor()
    resetMagicWand()
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

    openProcessingModal()

    try {
        uploadBtn.disabled = true
        resetBtn.disabled = true
        const response = await axios.post(`http://localhost:5000/process/${mode}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data' // Set the content type
            },
            responseType: 'blob' // Expect a binary response (image)
        });

        // Display the processed image
        const imageUrl = URL.createObjectURL(response.data);

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
        alert('Failed to process image.');
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
    document.body.style.overflow = "hidden"
  }

  function closeModal() {
    processingModal.classList.remove("active")
    document.body.style.overflow = ""

    // Re-enable the upload button
    uploadBtn.disabled = false
  }

  function showUploadStatus(message, type) {
    uploadStatus.textContent = message
    uploadStatus.className = "upload-status"
    uploadStatus.classList.add(type)
    uploadStatus.style.display = "block"
  }

  function setMagicWandCursor() {
    canvas.classList.add("magic-wand-cursor")
    // imageOverlay.style.pointerEvents = "auto"
  }

  function resetCursor() {
    canvas.classList.remove("magic-wand-cursor")
    // imageOverlay.style.pointerEvents = "none"
  }
  function runMagicWand(){
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    document.onkeydown = onKeyDown;
    document.onkeyup = onKeyUp;
  }

  function resetMagicWand(){
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
  }

  function onKeyDown(e) {
    if (e.keyCode == 17 && activeTool === "magic-wand-tool") document.getElementById("resultCanvas").classList.add("add-mode");
  }
  
  function onKeyUp(e) {
    if (e.keyCode == 17) document.getElementById("resultCanvas").classList.remove("add-mode");
  }
  
  function downloadImage() {
    // Create a temporary link element
    const link = document.createElement("a")
    link.href = processedImage.src
    link.download = "processed-image.png"

    // Append to the document, click it, and remove it
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function saveToGallery() {
    // This would typically involve sending the image to your backend
    // to save it in the user's gallery
    alert("Image saved to gallery! (This is a placeholder - actual gallery functionality would be implemented later)")
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
      silentLogin()
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
          showUploadStatus(`Welcome back, ${username}!`, "success");
          
        } else {
          openLoginModal()
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            console.error("Token expired or invalid");
            openLoginModal()
          } else {
            console.error("Network error:", error.message);
          }
        } else {
            console.error("Unexpected error:", error);
        }
      }
    } else {
      openLoginModal()
    }
  }
})
