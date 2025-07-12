// Debug script to analyze page creation flow
console.log('=== Page Creation Debug Analysis ===');

// Simulate the page creation flow to identify issues
function analyzePageCreationFlow() {
  console.log('1. Current localStorage state:');
  
  // Check if we have existing pages
  const savedPages = localStorage.getItem("novel-pages");
  const pages = savedPages ? JSON.parse(savedPages) : {};
  console.log('   - Existing pages:', Object.keys(pages));
  
  // Check main editor content
  const mainContent = localStorage.getItem("novel-content");
  console.log('   - Main editor content exists:', !!mainContent);
  
  console.log('\n2. Simulating page creation...');
  
  // Simulate the page creation process
  const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const slug = pageId;
  
  console.log('   - Generated pageId:', pageId);
  console.log('   - Generated slug:', slug);
  
  // Check current URL context
  const currentPath = window.location.pathname;
  const currentSlug = currentPath.startsWith('/page/') ? currentPath.split('/page/')[1] : null;
  const isSubPage = currentSlug !== null;
  
  console.log('   - Current path:', currentPath);
  console.log('   - Current slug:', currentSlug);
  console.log('   - Is sub page:', isSubPage);
  
  // Simulate page data creation
  const newPageData = {
    title: "Untitled",
    content: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(isSubPage && { parentSlug: currentSlug }),
    ...(isSubPage && { isSubPage: true }),
  };
  
  console.log('   - New page data:', newPageData);
  
  // Check for potential conflicts
  if (pages[slug]) {
    console.log('   ⚠️  CONFLICT: Page with this slug already exists!');
  }
  
  return { pageId, slug, newPageData, isSubPage, currentSlug };
}

// Function to check for timing issues
function checkTimingIssues() {
  console.log('\n3. Checking for timing issues...');
  
  // Check if there are any pending localStorage operations
  const storageEvents = [];
  const originalSetItem = localStorage.setItem;
  
  localStorage.setItem = function(key, value) {
    storageEvents.push({ key, timestamp: Date.now(), action: 'set' });
    return originalSetItem.call(this, key, value);
  };
  
  console.log('   - Storage monitoring enabled');
  
  // Restore after 5 seconds
  setTimeout(() => {
    localStorage.setItem = originalSetItem;
    console.log('   - Storage events captured:', storageEvents);
  }, 5000);
}

// Function to identify race conditions
function identifyRaceConditions() {
  console.log('\n4. Identifying potential race conditions...');
  
  // Check if editor is currently saving
  const editorSaveInterval = setInterval(() => {
    console.log('   - Checking for editor save activity...');
  }, 500);
  
  setTimeout(() => {
    clearInterval(editorSaveInterval);
    console.log('   - Editor save monitoring completed');
  }, 3000);
}

// Run analysis
try {
  const result = analyzePageCreationFlow();
  checkTimingIssues();
  identifyRaceConditions();
  
  console.log('\n=== Analysis Complete ===');
  console.log('Check console for any errors or warnings during page creation');
  
} catch (error) {
  console.error('Error during analysis:', error);
}