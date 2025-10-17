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

  // Get filtered pages for mobile (skip pages 1 and 3)
  const getFilteredPages = useCallback(() => {
    if (!isMobile) {
      return Array.from(new Array(TOTAL_PAGES), (el, index) => index + 1);
    }
    
    // For mobile, create array excluding pages 1 and 3
    const pages = [];
    for (let i = 1; i <= TOTAL_PAGES; i++) {
      if (i !== 1 && i !== 3) {
        pages.push(i);
      }
    }
    return pages;
  }, [isMobile]);

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
      setIsMobile(window.innerWidth <= 768);
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
        setIsPanning(true);
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
        
        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        setLastPanPoint({
          x: e.touches[0].pageX,
          y: e.touches[0].pageY
        });
      }
    };

    const handleTouchEnd = (e) => {
      const touchDuration = Date.now() - startTouchTime;
      
      // Reset states
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
    }

    return () => {
      if (flipBookContainer) {
        flipBookContainer.removeEventListener('touchstart', handleTouchStart, true);
        flipBookContainer.removeEventListener('touchmove', handleTouchMove, true);
        flipBookContainer.removeEventListener('touchend', handleTouchEnd, true);
      }
    };
  }, [zoomLevel, isPanning, lastPanPoint, isMobile]);

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
      padding: isMobile ? '10px' : '20px',
      minHeight: '100vh',
      backgroundColor: 'white',
      position: 'relative'
    }}>
      {/* Stable container to prevent jumps */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: isMobile ? '100%' : '900px'
      }}>
        {/* Header with university logos */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: isMobile ? '15px 20px' : '20px 30px',
          backgroundColor: 'white',
          borderBottom: '2px solid #f0f0f0',
          marginBottom: '20px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          {/* Cochin University Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            order: isMobile ? 2 : 1
          }}>
            <img 
              src="/University logo.png"
              alt="Cochin University Logo"
              style={{
                width: 'auto',
                height: isMobile ? '50px' : '65px',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Center Kavaru Logo */}
          <div style={{
            textAlign: 'center',
            order: isMobile ? 1 : 2,
            width: isMobile ? '100%' : 'auto',
            marginBottom: isMobile ? '15px' : '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src="/kavaru logo.png"
              alt="Kavaru Logo"
              style={{
                width: 'auto',
                height: isMobile ? '50px' : '65px',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Students Union Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            order: isMobile ? 3 : 3
          }}>
            <img 
              src="/union logo.png"
              alt="Students Union Logo"
              style={{
                width: 'auto',
                height: isMobile ? '50px' : '65px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {/* Flip Book Container with margins */}
        <div 
          className="flip-book-container"
          style={{
            margin: isMobile ? '0 10px' : '0 30px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
            maxWidth: isMobile ? '100%' : 'none',
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease',
            cursor: zoomLevel > 1 ? 'grab' : 'default'
          }}
        >
          <HTMLFlipBook 
            ref={flipBookRef}
            width={isMobile ? window.innerWidth - 40 : 400} 
            height={isMobile ? (window.innerWidth - 40) * 1.4 : 600}
            maxShadowOpacity={0.5}
            drawShadow={true}
            showCover={false}
            size='stretch'
            minWidth={isMobile ? 280 : 400}
            maxWidth={isMobile ? window.innerWidth - 40 : 400}
            minHeight={isMobile ? 400 : 600}
            maxHeight={isMobile ? (window.innerWidth - 40) * 1.4 : 600}
            flippingTime={800}
            usePortrait={isMobile}
            startPage={0}
            autoSize={false}
            clickEventForward={zoomLevel <= 1}
            useMouseEvents={!isMobile || zoomLevel <= 1}
            swipeDistance={zoomLevel > 1 ? 50 : 30}
            showPageCorners={true}
            disableFlipByClick={zoomLevel > 1}
            onFlip={onFlip}
            style={{
              margin: '0 auto',
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

        {/* Zoom Controls (Mobile Only) */}
        {isMobile && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            marginTop: '15px',
            padding: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <button
              onClick={() => {
                const newZoom = Math.max(zoomLevel - 0.25, 1);
                setZoomLevel(newZoom);
                if (newZoom === 1) setPanOffset({ x: 0, y: 0 });
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={zoomLevel <= 1}
            >
              −
            </button>
            
            <span style={{
              fontSize: '14px',
              color: '#666',
              minWidth: '60px',
              textAlign: 'center'
            }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            
            <button
              onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 3))}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={zoomLevel >= 3}
            >
              +
            </button>
            
            {zoomLevel > 1 && (
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginLeft: '5px'
                }}
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
          marginTop: '20px',
          padding: isMobile ? '0 20px' : '0 30px'
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
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
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
            fontSize: isMobile ? '12px' : '14px',
            color: '#666',
            fontWeight: '500',
            textAlign: 'center',
            minWidth: isMobile ? '80px' : '120px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {isMobile ? (
              <>
                {`Page ${filteredPages[currentPage] || 1} of ${TOTAL_PAGES}`}
                <br />
                <span style={{ fontSize: '10px', color: '#999' }}>
                  {zoomLevel > 1 ? 'Zoomed View' : 'Mobile View'}
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
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
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
        </div>      {/* Helper tip */}
      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        color: '#999',
        textAlign: 'center'
      }}>
        {isMobile ? (
          zoomLevel > 1 ? (
            <>
              💡 Drag to pan • Zoom out to flip pages • Use zoom controls below
            </>
          ) : (
            <>
              💡 Pinch to zoom • Swipe to flip pages • Use arrow buttons below
            </>
          )
        ) : (
          <>
            💡 Click page corners or drag to flip pages
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default Book