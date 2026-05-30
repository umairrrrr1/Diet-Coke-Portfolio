/* ==========================================================================
   Diet Coke Scroll Animation - High Performance Canvas & UI Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- 1. DOM Element Selectors ---
  const preloader = document.getElementById('preloader');
  const liquidFill = document.getElementById('liquid-fill');
  const loaderPercent = document.getElementById('loader-percent');
  
  const mainHeader = document.getElementById('main-header');
  
  const canvas = document.getElementById('scroll-canvas');
  const ctx = canvas.getContext('2d');
  const scrollTrack = document.getElementById('animation-section');
  
  // Navigation Waypoints
  const navItems = document.querySelectorAll('.nav-item');

  // --- 2. Configuration Parameters ---
  const totalFrames = 210;
  const framesFolder = '/frames/';
  const framePrefix = 'ezgif-frame-';
  const frameExtension = '.jpg';
  
  // Preloading image storage
  const images = [];
  let loadedImagesCount = 0;

  // Scrolling state variables for LERP interpolation
  let scrollPercent = 0;
  let targetFrame = 0;
  let renderedFrame = 0;
  
  // Helper: Pad integer with leading zeros (e.g. 1 -> "001")
  const pad = (num, size) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  };

  // --- 3. Image Preloading & Initialization ---
  const preloadImages = () => {
    return new Promise((resolve) => {
      for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        
        // Build padded path: /frames/ezgif-frame-001.jpg
        const frameNum = pad(i, 3);
        img.src = `${framesFolder}${framePrefix}${frameNum}${frameExtension}`;
        
        img.onload = () => {
          loadedImagesCount++;
          
          // Calculate progress percentage
          const percent = Math.round((loadedImagesCount / totalFrames) * 100);
          liquidFill.style.width = `${percent}%`;
          loaderPercent.textContent = `${percent}%`;
          
          if (loadedImagesCount === totalFrames) {
            // Once all frames loaded, hide preloader and resolve promise
            setTimeout(() => {
              preloader.classList.add('fade-out');
              document.body.style.overflow = 'auto'; // allow scroll
              resolve();
            }, 600);
          }
        };

        img.onerror = () => {
          console.error(`Error loading image frame: ${img.src}`);
          // Prevent getting stuck on load errors
          loadedImagesCount++;
          if (loadedImagesCount === totalFrames) {
            resolve();
          }
        };

        images.push(img);
      }
    });
  };

  // --- 4. Responsive Canvas Sizing & Rendering ---
  const resizeCanvas = () => {
    // Set buffer size matching display size multiplied by devicePixelRatio for razor-sharp screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    
    // Immediately draw current frame on resize to avoid flash of empty space
    drawFrame(Math.round(renderedFrame));
  };

  // Draw specific frame using dynamic full-bleed aspect-cover mapping math
  const drawFrame = (frameIndex) => {
    const imgIndex = Math.max(0, Math.min(totalFrames - 1, frameIndex));
    const img = images[imgIndex];
    
    if (!img || !img.complete) return;

    // Clear canvas
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Fit image using CSS-like "object-fit: cover" mathematics
    const imgRatio = img.width / img.height;
    const canvasRatio = window.innerWidth / window.innerHeight;
    
    let renderWidth, renderHeight, xOffset, yOffset;

    if (canvasRatio > imgRatio) {
      // Canvas is wider than image ratio -> stretch width, crop height
      renderWidth = window.innerWidth;
      renderHeight = window.innerWidth / imgRatio;
      xOffset = 0;
      yOffset = (window.innerHeight - renderHeight) / 2;
    } else {
      // Canvas is taller than image ratio -> stretch height, crop width
      renderHeight = window.innerHeight;
      renderWidth = window.innerHeight * imgRatio;
      xOffset = (window.innerWidth - renderWidth) / 2;
      yOffset = 0;
    }

    // Draw the image sequence frame full bleed
    ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight);
  };

  // --- 5. Lerped Scrolling Physics Loop ---
  const updateScrollPosition = () => {
    // Calculate active scroll offset metrics
    const rect = scrollTrack.getBoundingClientRect();
    const trackTop = scrollTrack.offsetTop;
    const trackHeight = scrollTrack.offsetHeight;
    
    // Total vertical pixels of scrollable space inside the track container
    const totalScrollable = trackHeight - window.innerHeight;
    
    // How far the user has scrolled relative to the start of the track
    const relativeScroll = window.scrollY - trackTop;
    
    // Normalize percentage between 0.0 and 1.0
    scrollPercent = Math.max(0, Math.min(1, relativeScroll / totalScrollable));
    
    // Map percentage to frames (0 to 209 index)
    targetFrame = scrollPercent * (totalFrames - 1);
  };

  // Dedicated RequestAnimationFrame Loop for butter-smooth interpolation
  const animationLoop = () => {
    // Smooth deceleration interpolation: renderedFrame + difference * speed
    const diff = targetFrame - renderedFrame;
    
    if (Math.abs(diff) > 0.005) {
      renderedFrame += diff * 0.085; // Sweet easing ratio
      drawFrame(Math.round(renderedFrame));
      handleTextOverlays(renderedFrame / (totalFrames - 1));
    } else {
      // Snapping to lock frame and avoid constant redrawing when stationary
      renderedFrame = targetFrame;
      drawFrame(Math.round(renderedFrame));
      handleTextOverlays(scrollPercent);
    }
    
    requestAnimationFrame(animationLoop);
  };

  // --- 6. Scroll-Synchronized Active Navigation ---
  const handleTextOverlays = (progress) => {
    // Dynamic Navigation item highlighting
    if (progress <= 0.25) {
      highlightNav(0);
    } else if (progress > 0.25 && progress <= 0.75) {
      highlightNav(1); 
    } else {
      highlightNav(2); 
    }
  };

  const highlightNav = (activeIndex) => {
    navItems.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  };

  // Window scroll listener
  window.addEventListener('scroll', () => {
    updateScrollPosition();
    
    // Toggle navigation bar style on scroll down
    if (window.scrollY > 50) {
      mainHeader.classList.add('scrolled');
    } else {
      mainHeader.classList.remove('scrolled');
    }
  });

  // --- 7. Interactive Navigation Checkpoint Handlers ---
  
  // Smooth scroll links to relative frame percentage checkpoints
  navItems.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPercent = parseFloat(link.getAttribute('data-scroll-to'));
      if (isNaN(targetPercent)) return;
      
      const trackHeight = scrollTrack.offsetHeight;
      const totalScrollable = trackHeight - window.innerHeight;
      const targetY = scrollTrack.offsetTop + (targetPercent * totalScrollable);
      
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    });
  });

  // --- 8. Bootstrap and Initialization sequence ---
  const init = async () => {
    // First, lock body scroll during preload
    document.body.style.overflow = 'hidden';
    
    // Preload image assets
    await preloadImages();
    
    // Initialize canvas sizes
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup initial positions
    updateScrollPosition();
    
    // Start continuous animation rendering loops
    animationLoop();
  };

  // Kick off the site load!
  init();
});
