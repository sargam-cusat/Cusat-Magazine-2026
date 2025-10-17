import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from 'lucide-react';

function Book() {
  const [numPages, setNumPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(new Map());
  const [currentPage, setCurrentPage] = useState(0);
  const [showKavaruLoading, setShowKavaruLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const flipBookRef = useRef();
  
  // Magazine configuration
  const TOTAL_PAGES = 95; // Pages from page00.jpg to page94.jpg
  const BASE_IMAGE_PATH = '/magazine-pages/page';

  // Generate image URLs for JPG files with standardized zero-padded naming
  const getPageImageUrl = useCallback((pageNumber) => {
    // Pages start from page00.jpg, so we need to subtract 1 from pageNumber
    // pageNumber 1 -> page00.jpg, pageNumber 2 -> page01.jpg, etc.
    const zeroBasedNumber = (pageNumber - 1).toString().padStart(2, '0');
    return `${BASE_IMAGE_PATH}${zeroBasedNumber}.jpg`;
  }, []);

  // Get all pages for both mobile and desktop
  const getFilteredPages = useCallback(() => {
    return Array.from(new Array(TOTAL_PAGES), (el, index) => index + 1);
  }, []);

  // 5-second Kavaru loading screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowKavaruLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Mobile detection and resize listener
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Calculate dimensions based on available space
      if (mobile) {
        const availableWidth = window.innerWidth;
        const headerHeight = 60; // Fixed header height
        const bottomBarHeight = 65; // Bottom navigation bar height
        const availableHeight = window.innerHeight - headerHeight - bottomBarHeight;
        
        // For two-page layout, each page should be half width
        // Use A4 ratio (1:1.414) for page height
        const pageWidth = availableWidth / 2;
        const heightFromWidth = pageWidth * 1.414;
        
        if (heightFromWidth <= availableHeight) {
          // Width is the limiting factor
          setDimensions({
            width: availableWidth,
            height: heightFromWidth
          });
        } else {
          // Height is the limiting factor
          const pageWidthFromHeight = availableHeight / 1.414;
          setDimensions({
            width: pageWidthFromHeight * 2,
            height: availableHeight
          });
        }
      } else {
        // Desktop: Use same A4 ratio calculation
        const availableWidth = Math.min(window.innerWidth - 40, 900); // Max 900px width
        const headerHeight = 100; // Approximate header height on desktop
        const availableHeight = window.innerHeight - headerHeight - 40;
        
        // For two-page layout, each page should be half width
        const pageWidth = availableWidth / 2;
        const heightFromWidth = pageWidth * 1.414;
        
        if (heightFromWidth <= availableHeight) {
          // Width is the limiting factor
          setDimensions({
            width: availableWidth,
            height: heightFromWidth
          });
        } else {
          // Height is the limiting factor
          const pageWidthFromHeight = availableHeight / 1.414;
          setDimensions({
            width: pageWidthFromHeight * 2,
            height: availableHeight
          });
        }
      }
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Pinch-to-zoom and pan functionality
  useEffect(() => {
    let initialDistance = 0;
    let initialZoom = 1;
    let isZooming = false;
    let startTouchTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      startTouchTime = Date.now();
      
      if (e.touches.length === 2) {
        // Pinch start - prevent flip book events
        isZooming = true;
        e.preventDefault();
        e.stopPropagation();
        
        initialDistance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        initialZoom = zoomLevel;
      } else if (e.touches.length === 1 && zoomLevel > 1) {
        // Only start panning if zoomed in
        e.preventDefault();
        e.stopPropagation();
        setIsPanning(true);
        touchStartX = e.touches[0].pageX;
        touchStartY = e.touches[0].pageY;
        setLastPanPoint({
          x: e.touches[0].pageX,
          y: e.touches[0].pageY
        });
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        // Pinch zoom - prevent flip book events
        isZooming = true;
        e.preventDefault();
        e.stopPropagation();
        
        const currentDistance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const scale = currentDistance / initialDistance;
        const newZoom = Math.min(Math.max(initialZoom * scale, 1), 3);
        setZoomLevel(newZoom);
        
        if (newZoom === 1) {
          setPanOffset({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && isPanning && zoomLevel > 1) {
        // Pan when zoomed in - prevent flip book events
        e.preventDefault();
        e.stopPropagation();
        
        const deltaX = e.touches[0].pageX - lastPanPoint.x;
        const deltaY = e.touches[0].pageY - lastPanPoint.y;
        
        // Calculate max pan based on zoom level and viewport
        const containerWidth = dimensions.width;
        const containerHeight = dimensions.height;
        const maxPanX = (containerWidth * (zoomLevel - 1)) / 2;
        const maxPanY = (containerHeight * (zoomLevel - 1)) / 2;
        
        setPanOffset(prev => ({
          x: Math.min(Math.max(prev.x + deltaX, -maxPanX), maxPanX),
          y: Math.min(Math.max(prev.y + deltaY, -maxPanY), maxPanY)
        }));
        
        setLastPanPoint({
          x: e.touches[0].pageX,
          y: e.touches[0].pageY
        });
      }
    };

    const handleTouchEnd = (e) => {
      const touchDuration = Date.now() - startTouchTime;
      
      // Reset panning state
      setIsPanning(false);
      
      // Reset zoom flag after a brief delay
      setTimeout(() => {
        isZooming = false;
      }, 100);
    };

    // Add touch event listeners to the flip book container
    const flipBookContainer = document.querySelector('.flip-book-container');
    if (flipBookContainer && isMobile) {
      // Use capture phase to intercept events before they reach flip book
      flipBookContainer.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
      flipBookContainer.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      flipBookContainer.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      flipBookContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true });
    }

    return () => {
      if (flipBookContainer) {
        flipBookContainer.removeEventListener('touchstart', handleTouchStart, true);
        flipBookContainer.removeEventListener('touchmove', handleTouchMove, true);
        flipBookContainer.removeEventListener('touchend', handleTouchEnd, true);
        flipBookContainer.removeEventListener('touchcancel', handleTouchEnd, true);
      }
    };
  }, [zoomLevel, isPanning, lastPanPoint, isMobile, dimensions]);

  // Reset pan offset when zoom changes to prevent out of bounds
  useEffect(() => {
    if (zoomLevel === 1) {
      setPanOffset({ x: 0, y: 0 });
    } else {
      // Constrain existing pan offset to new zoom limits
      const containerWidth = dimensions.width;
      const containerHeight = dimensions.height;
      const maxPanX = (containerWidth * (zoomLevel - 1)) / 2;
      const maxPanY = (containerHeight * (zoomLevel - 1)) / 2;
      
      setPanOffset(prev => ({
        x: Math.min(Math.max(prev.x, -maxPanX), maxPanX),
        y: Math.min(Math.max(prev.y, -maxPanY), maxPanY)
      }));
    }
  }, [zoomLevel, dimensions]);

  // Preload and cache images
  useEffect(() => {
    const preloadImages = async () => {
      const imageCache = new Map();
      
      // Start with first few pages for immediate display
      for (let i = 1; i <= Math.min(5, TOTAL_PAGES); i++) {
        try {
          const img = new Image();
          const imageUrl = getPageImageUrl(i);
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              imageCache.set(i, imageUrl);
              resolve();
            };
            img.onerror = (error) => {
              console.error(`Failed to load image ${i}:`, error);
              reject(error);
            };
            img.src = imageUrl;
          });
        } catch (error) {
          console.error(`Failed to preload image ${i}:`, error);
        }
      }
      
      setLoadedImages(imageCache);
      setNumPages(TOTAL_PAGES);
      setIsLoading(false);
    };

    preloadImages();
  }, [getPageImageUrl]);

  // Get the current filtered pages based on mobile state
  const filteredPages = useMemo(() => getFilteredPages(), [getFilteredPages]);
  const displayPageCount = filteredPages.length;

  // Load additional images as needed
  const loadImage = useCallback((pageNumber) => {
    if (!loadedImages.has(pageNumber)) {
      const img = new Image();
      const imageUrl = getPageImageUrl(pageNumber);
      
      img.onload = () => {
        setLoadedImages(prev => new Map(prev).set(pageNumber, imageUrl));
      };
      img.src = imageUrl;
    }
  }, [loadedImages, getPageImageUrl]);

  // Navigation functions
  const goToNextPage = () => {
    if (flipBookRef.current && flipBookRef.current.pageFlip) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const goToPrevPage = () => {
    if (flipBookRef.current && flipBookRef.current.pageFlip) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  // Handle page change events
  const onFlip = useCallback((e) => {
    const newPage = e.data;
    setCurrentPage(newPage);
    
    // Preload adjacent pages
    if (newPage + 1 <= TOTAL_PAGES) {
      loadImage(newPage + 1);
    }
    if (newPage + 2 <= TOTAL_PAGES) {
      loadImage(newPage + 2);
    }
  }, [loadImage]);

  // Memoized PageImage component to prevent re-renders
  const PageImage = useMemo(() => {
    const component = ({ pageNumber }) => {
      const [imageLoaded, setImageLoaded] = useState(false);
      const [imageError, setImageError] = useState(false);
      const imageUrl = getPageImageUrl(pageNumber);
      
      // Debug: Log the image URL
      console.log(`Loading page ${pageNumber}: ${imageUrl}`);
      
      const handleImageLoad = () => {
        console.log(`Successfully loaded page ${pageNumber}`);
        setImageLoaded(true);
        setLoadedImages(prev => new Map(prev).set(pageNumber, imageUrl));
      };
      
      const handleImageError = (error) => {
        console.error(`Failed to load page ${pageNumber}:`, imageUrl, error);
        setImageError(true);
      };

      if (imageError) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#e74c3c',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div>
              <div style={{ marginBottom: '10px' }}>
                Failed to load page {pageNumber}
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                URL: {imageUrl}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {!imageLoaded && (
            <div style={{ 
              position: 'absolute',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#666',
              fontSize: '14px',
              zIndex: 1
            }}>
              Loading page {pageNumber}...
            </div>
          )}
          <img
            key={`page-${pageNumber}`}
            src={imageUrl}
            alt={`Magazine page ${pageNumber}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    };
    
    return React.memo(component);
  }, [getPageImageUrl, setLoadedImages]);

  // Show 5-second Kavaru loading screen first
  if (showKavaruLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}>
        {/* Union Logo */}
        <img 
          src="/union logo.png" 
          alt="Union Logo"
          style={{
            width: '150px',
            height: 'auto',
            marginBottom: '30px',
            animation: 'fadeInScale 1.5s ease-in-out'
          }}
        />
        
        {/* Presents Text */}
        <div style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '40px',
          textAlign: 'center',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          animation: 'fadeIn 2s ease-in-out 0.5s both'
        }}>
          Presents
        </div>
        
        {/* Progress Line */}
        <div style={{
          width: '200px',
          height: '4px',
          backgroundColor: '#e0e0e0',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
            borderRadius: '2px',
            animation: 'progressSlide 3s ease-in-out infinite'
          }}></div>
        </div>
        
        <div style={{
          fontSize: '14px',
          color: '#7f8c8d',
          textAlign: 'center',
          animation: 'fadeIn 2.5s ease-in-out 1s both'
        }}>
          Loading Digital Magazine...
        </div>
        
        {/* CSS animations */}
        <style>{`
          @keyframes fadeInScale {
            0% { 
              opacity: 0; 
              transform: scale(0.8); 
            }
            100% { 
              opacity: 1; 
              transform: scale(1); 
            }
          }
          
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          
          @keyframes progressSlide {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // Show loading screen after Kavaru screen
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}>
        {/* Loading spinner */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        
        <div style={{
          fontSize: '18px',
          color: '#333',
          marginBottom: '10px',
          fontWeight: '500'
        }}>
          Loading Magazine...
        </div>
        
        <div style={{
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          maxWidth: '300px'
        }}>
          Preparing your digital reading experience
        </div>
        
        {/* Add CSS animation for spinner */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '0' : '20px',
      paddingBottom: isMobile ? '0' : '20px',
      minHeight: '100vh',
      backgroundColor: 'white',
      position: 'relative',
      overflow: isMobile ? 'hidden' : 'auto'
    }}>
      {/* Stable container to prevent jumps */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'flex-start',
        width: '100%',
        maxWidth: isMobile ? '100%' : '900px',
        height: isMobile ? '100vh' : 'auto',
        paddingBottom: isMobile ? '60px' : '0',
        flex: isMobile ? '1' : 'initial',
        paddingTop: isMobile ? '60px' : '0'
      }}>
        {/* Header with university logos */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: isMobile ? '8px 12px' : '20px 30px',
          backgroundColor: 'white',
          borderBottom: '2px solid #f0f0f0',
          marginBottom: isMobile ? '0' : '20px',
          flexShrink: 0,
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? '0' : 'auto',
          left: isMobile ? '0' : 'auto',
          right: isMobile ? '0' : 'auto',
          zIndex: isMobile ? 100 : 'auto',
          boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
        }}>
          {/* Cochin University Logo - Left */}
          <img 
            src="/University logo.png"
            alt="Cochin University Logo"
            style={{
              width: 'auto',
              height: isMobile ? '40px' : '65px',
              objectFit: 'contain'
            }}
          />
          
          {/* Kavaru Logo - Center */}
          <img 
            src="/kavaru logo.png"
            alt="Kavaru Logo"
            style={{
              width: 'auto',
              height: isMobile ? '45px' : '70px',
              objectFit: 'contain',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
          
          {/* Students Union Logo - Right */}
          <img 
            src="/union logo.png"
            alt="Students Union Logo"
            style={{
              width: 'auto',
              height: isMobile ? '40px' : '65px',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Flip Book Container with margins */}
        <div 
          className="flip-book-container"
          style={{
            margin: '0 auto',
            boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.15)' : '0 8px 16px rgba(0,0,0,0.2)',
            borderRadius: isMobile ? '8px' : '8px',
            overflow: isMobile ? 'visible' : 'hidden',
            position: 'relative',
            maxWidth: '100%',
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: zoomLevel > 1 ? 'grab' : 'default',
            touchAction: zoomLevel > 1 ? 'none' : 'auto',
            backgroundColor: 'white'
          }}
        >
          <div style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <HTMLFlipBook 
            ref={flipBookRef}
            width={dimensions.width / 2} 
            height={dimensions.height}
            maxShadowOpacity={0.5}
            drawShadow={true}
            showCover={false}
            size='stretch'
            minWidth={dimensions.width / 2}
            maxWidth={dimensions.width / 2}
            minHeight={dimensions.height}
            maxHeight={dimensions.height}
            flippingTime={isMobile ? 600 : 800}
            usePortrait={false}
            startPage={0}
            autoSize={false}
            clickEventForward={zoomLevel <= 1}
            useMouseEvents={true}
            swipeDistance={zoomLevel > 1 ? 80 : 30}
            showPageCorners={true}
            disableFlipByClick={zoomLevel > 1}
            onFlip={onFlip}
            mobileScrollSupport={zoomLevel <= 1}
            style={{
              margin: '0 auto',
              width: `${dimensions.width}px`,
              pointerEvents: zoomLevel > 1 ? 'none' : 'auto'
            }}
          >
            {/* Magazine pages as images */}
            {numPages && filteredPages.map((actualPageNumber, index) => {
              return (
                <div className="page" key={`page_${actualPageNumber}`} style={{ 
                  background: 'white',
                  overflow: 'hidden',
                  width: '100%',
                  height: '100%'
                }}>
                  <div className="page-content" style={{ 
                    padding: '0',
                    margin: '0',
                    overflow: 'hidden',
                    height: '100%',
                    width: '100%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PageImage pageNumber={actualPageNumber} />
                  </div>
                </div>
              );
            })}
          </HTMLFlipBook>
          </div>
        </div>

        {/* Zoom Controls (Mobile Only) - Improved UI/UX */}
        {isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'fixed',
            right: '15px',
            bottom: '80px',
            zIndex: 1000
          }}>
            {/* Zoom In Button */}
            <button
              onClick={() => {
                const newZoom = Math.min(zoomLevel + 0.5, 3);
                setZoomLevel(newZoom);
              }}
              style={{
                padding: '0',
                backgroundColor: zoomLevel < 3 ? '#3498db' : '#cbd5e0',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '22px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(52, 152, 219, 0.4)',
                transform: zoomLevel < 3 ? 'scale(1)' : 'scale(0.9)',
                opacity: zoomLevel < 3 ? 1 : 0.5
              }}
              disabled={zoomLevel >= 3}
              aria-label="Zoom in"
            >
              +
            </button>
            
            {/* Zoom Level Indicator */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              padding: '6px 12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              fontSize: '11px',
              fontWeight: '600',
              color: '#333',
              minWidth: '48px'
            }}>
              {Math.round(zoomLevel * 100)}%
            </div>
            
            {/* Zoom Out Button */}
            <button
              onClick={() => {
                const newZoom = Math.max(zoomLevel - 0.5, 1);
                setZoomLevel(newZoom);
                if (newZoom === 1) {
                  setPanOffset({ x: 0, y: 0 });
                }
              }}
              style={{
                padding: '0',
                backgroundColor: zoomLevel > 1 ? '#3498db' : '#cbd5e0',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '26px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(52, 152, 219, 0.4)',
                transform: zoomLevel > 1 ? 'scale(1)' : 'scale(0.9)',
                opacity: zoomLevel > 1 ? 1 : 0.5
              }}
              disabled={zoomLevel <= 1}
              aria-label="Zoom out"
            >
              −
            </button>
            
            {/* Reset Button (Only when zoomed) */}
            {zoomLevel > 1 && (
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(231, 76, 60, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '4px',
                  animation: 'fadeInScale 0.3s ease'
                }}
                aria-label="Reset zoom"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Navigation Controls at Bottom */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: isMobile ? '100%' : '500px',
          marginTop: isMobile ? 'auto' : '20px',
          marginBottom: isMobile ? '0' : '0',
          padding: isMobile ? '12px 20px' : '0 30px',
          flexShrink: 0,
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? '0' : 'auto',
          left: isMobile ? '0' : 'auto',
          right: isMobile ? '0' : 'auto',
          backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.98)' : 'transparent',
          backdropFilter: isMobile ? 'blur(10px)' : 'none',
          boxShadow: isMobile ? '0 -2px 10px rgba(0, 0, 0, 0.1)' : 'none',
          borderTop: isMobile ? '1px solid #e5e7eb' : 'none',
          zIndex: isMobile ? 1000 : 'auto'
        }}>
          <button
            onClick={goToPrevPage}
            disabled={zoomLevel > 1 && isMobile}
            style={{
              padding: '0',
              backgroundColor: 'transparent',
              color: (zoomLevel > 1 && isMobile) ? '#ccc' : '#1e3a8a',
              border: '2px solid #e5e7eb',
              borderRadius: '50%',
              cursor: (zoomLevel > 1 && isMobile) ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              fontWeight: 'normal',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '42px' : '48px',
              height: isMobile ? '42px' : '48px',
              boxShadow: 'none',
              opacity: (zoomLevel > 1 && isMobile) ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (!(zoomLevel > 1 && isMobile)) {
                e.target.style.backgroundColor = '#f1f5f9';
                e.target.style.borderColor = '#1e3a8a';
                e.target.style.transform = 'scale(1.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!(zoomLevel > 1 && isMobile)) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.transform = 'scale(1)';
              }
            }}
            title={zoomLevel > 1 && isMobile ? "Zoom out to navigate" : "Previous page"}
          >
            <ChevronLeft size={isMobile ? 18 : 20} strokeWidth={2.5} style={{ pointerEvents: 'none' }} />
          </button>
          
          {/* Page Counter in the middle */}
          <div style={{
            fontSize: isMobile ? '11px' : '14px',
            color: '#666',
            fontWeight: '500',
            textAlign: 'center',
            minWidth: isMobile ? '100px' : '120px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {isMobile ? (
              <>
                {currentPage === 0 
                  ? `Page ${filteredPages[currentPage] || 1}` 
                  : `Pages ${currentPage * 2} - ${Math.min(currentPage * 2 + 1, TOTAL_PAGES)}`
                } / {TOTAL_PAGES}
                <br />
                <span style={{ fontSize: '9px', color: '#999' }}>
                  {zoomLevel > 1 ? 'Zoomed' : 'Swipe to flip'}
                </span>
              </>
            ) : (
              `Page ${currentPage + 1} of ${numPages}`
            )}
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={zoomLevel > 1 && isMobile}
            style={{
              padding: '0',
              backgroundColor: 'transparent',
              color: (zoomLevel > 1 && isMobile) ? '#ccc' : '#1e3a8a',
              border: '2px solid #e5e7eb',
              borderRadius: '50%',
              cursor: (zoomLevel > 1 && isMobile) ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              fontWeight: 'normal',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '42px' : '48px',
              height: isMobile ? '42px' : '48px',
              boxShadow: 'none',
              opacity: (zoomLevel > 1 && isMobile) ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (!(zoomLevel > 1 && isMobile)) {
                e.target.style.backgroundColor = '#f1f5f9';
                e.target.style.borderColor = '#1e3a8a';
                e.target.style.transform = 'scale(1.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!(zoomLevel > 1 && isMobile)) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.transform = 'scale(1)';
              }
            }}
            title={zoomLevel > 1 && isMobile ? "Zoom out to navigate" : "Next page"}
          >
            <ChevronRight size={isMobile ? 18 : 20} strokeWidth={2.5} style={{ pointerEvents: 'none' }} />
          </button>
        </div>      {/* Helper tip - Only show on desktop */}
      {!isMobile && (
        <div style={{
          marginTop: '15px',
          marginBottom: '0',
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
          padding: '0',
          flexShrink: 0
        }}>
          💡 Click page corners or drag to flip pages
        </div>
      )}
      </div>
    </div>
  );
}

export default Book