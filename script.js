document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const startCameraBtn = document.getElementById('start-camera');
    const stopCameraBtn = document.getElementById('stop-camera');
    const switchCameraBtn = document.getElementById('switch-camera');
    const captureBtn = document.getElementById('capture-btn');
    const savePhotoBtn = document.getElementById('save-photo');
    const retakePhotoBtn = document.getElementById('retake-photo');
    const previewImage = document.getElementById('preview-image');
    const photoPreview = document.getElementById('photo-preview');
    const previewControls = document.getElementById('preview-controls');
    const photosContainer = document.getElementById('photos-container');
    const noPhotosMessage = document.getElementById('no-photos');
    const previewModal = document.getElementById('preview-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModalBtn = document.querySelector('.close-modal');
    const downloadPhotoBtn = document.getElementById('download-photo');
    const deletePhotoBtn = document.getElementById('delete-photo');
    const statusMessage = document.getElementById('status-message');

    // Variables
    let stream = null;
    let capturedPhoto = null;
    let currentFacingMode = 'user'; // front camera by default
    let photos = JSON.parse(localStorage.getItem('photobox-photos')) || [];
    let currentPhotoIndex = null;

    // Initialize
    updateGallery();

    // Event Listeners
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    switchCameraBtn.addEventListener('click', switchCamera);
    captureBtn.addEventListener('click', capturePhoto);
    savePhotoBtn.addEventListener('click', savePhoto);
    retakePhotoBtn.addEventListener('click', retakePhoto);
    closeModalBtn.addEventListener('click', closeModal);
    downloadPhotoBtn.addEventListener('click', downloadPhoto);
    deletePhotoBtn.addEventListener('click', deletePhoto);

    // Functions
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }

    async function startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            startCameraBtn.disabled = true;
            stopCameraBtn.disabled = false;
            switchCameraBtn.disabled = false;
            captureBtn.disabled = false;
            switchCameraBtn.style.display = 'inline-flex';
            
            showStatus('Camera started successfully', 'success');
        } catch (error) {
            console.error('Error starting camera:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            
            startCameraBtn.disabled = false;
            stopCameraBtn.disabled = true;
            switchCameraBtn.disabled = true;
            captureBtn.disabled = true;
            
            showStatus('Camera stopped', 'success');
        }
    }

    async function switchCamera() {
        if (!stream) return;
        
        // Store the current stream to stop it later
        const oldStream = stream;
        
        // Toggle facing mode
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        try {
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            // Stop the old stream
            oldStream.getTracks().forEach(track => track.stop());
            
            showStatus(`Switched to ${currentFacingMode === 'user' ? 'front' : 'rear'} camera`, 'success');
        } catch (error) {
            console.error('Error switching camera:', error);
            showStatus(`Error switching camera: ${error.message}`, 'error');
            // Revert facing mode if switch fails
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        }
    }

    function capturePhoto() {
        if (!stream) return;
        
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the image data from canvas
        capturedPhoto = canvas.toDataURL('image/png');
        
        // Show preview
        previewImage.src = capturedPhoto;
        photoPreview.style.display = 'block';
        previewControls.style.display = 'block';
        
        // Hide capture button
        captureBtn.disabled = true;
        
        showStatus('Photo captured! Review or retake', 'success');
    }

    function savePhoto() {
        if (!capturedPhoto) return;
        
        const timestamp = new Date().toISOString();
        const photoData = {
            id: Date.now(),
            data: capturedPhoto,
            timestamp: timestamp
        };
        
        photos.unshift(photoData);
        localStorage.setItem('photobox-photos', JSON.stringify(photos));
        
        // Reset UI
        photoPreview.style.display = 'none';
        previewControls.style.display = 'none';
        captureBtn.disabled = false;
        capturedPhoto = null;
        
        updateGallery();
        showStatus('Photo saved to gallery!', 'success');
    }

    function retakePhoto() {
        photoPreview.style.display = 'none';
        previewControls.style.display = 'none';
        captureBtn.disabled = false;
        capturedPhoto = null;
        showStatus('Ready to capture another photo', 'success');
    }

    function updateGallery() {
        if (photos.length === 0) {
            noPhotosMessage.style.display = 'block';
            photosContainer.style.display = 'none';
            return;
        }
        
        noPhotosMessage.style.display = 'none';
        photosContainer.style.display = 'grid';
        photosContainer.innerHTML = '';
        
        photos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.dataset.index = index;
            
            const img = document.createElement('img');
            img.src = photo.data;
            img.alt = `Photo taken on ${new Date(photo.timestamp).toLocaleString()}`;
            
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'delete-btn';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(index);
            });
            
            overlay.appendChild(viewBtn);
            photoItem.appendChild(img);
            photoItem.appendChild(overlay);
            photosContainer.appendChild(photoItem);
        });
    }

    function openModal(index) {
        currentPhotoIndex = index;
        const photo = photos[index];
        modalImage.src = photo.data;
        modalImage.alt = `Photo taken on ${new Date(photo.timestamp).toLocaleString()}`;
        previewModal.style.display = 'flex';
    }

    function closeModal() {
        previewModal.style.display = 'none';
        currentPhotoIndex = null;
    }

    function downloadPhoto() {
        if (currentPhotoIndex === null) return;
        
        const photo = photos[currentPhotoIndex];
        const link = document.createElement('a');
        link.href = photo.data;
        link.download = `photobox-${new Date(photo.timestamp).toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('Photo download started', 'success');
    }

    function deletePhoto() {
        if (currentPhotoIndex === null) return;
        
        photos.splice(currentPhotoIndex, 1);
        localStorage.setItem('photobox-photos', JSON.stringify(photos));
        updateGallery();
        closeModal();
        
        showStatus('Photo deleted', 'success');
    }

    // Close modal when clicking outside the image
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            closeModal();
        }
    });
});