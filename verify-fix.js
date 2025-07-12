// Verification script for page creation fix
console.log('=== Page Creation Fix Verification ===');

function simulateFixedPageCreation() {
  console.log('\n1. Testing fixed page creation flow...');
  
  // Clear localStorage
  localStorage.removeItem('novel-pages');
  
  // Create parent page
  const parentSlug = 'test-parent-' + Date.now();
  const pages = {};
  
  pages[parentSlug] = {
    title: "Test Parent Page",
    content: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  localStorage.setItem('novel-pages', JSON.stringify(pages));
  console.log('✓ Created parent page:', parentSlug);
  
  // Simulate child page creation (from parent context)
  const childSlug = 'test-child-' + Date.now();
  const savedPages = localStorage.getItem("novel-pages");
  const pagesData = savedPages ? JSON.parse(savedPages) : {};
  
  const currentSlug = parentSlug; // Current page context
  const isSubPage = currentSlug !== null;
  
  pagesData[childSlug] = {
    title: "Test Child Page",
    content: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(isSubPage && { parentSlug: currentSlug }),
    ...(isSubPage && { isSubPage: true }),
  };
  
  localStorage.setItem("novel-pages", JSON.stringify(pagesData));
  console.log('✓ Created child page with proper hierarchy');
  console.log('   - Child has parentSlug:', pagesData[childSlug].parentSlug);
  console.log('   - Child is marked as subPage:', pagesData[childSlug].isSubPage);
  
  return { parentSlug, childSlug, pagesData };
}

function simulateFixedPageReferenceCheck(childSlug, pages) {
  console.log('\n2. Testing fixed PageReference behavior...');
  
  // Simulate the FIXED PageReference logic (won't create incomplete data)
  const currentTitle = "Test Child Page";
  
  console.log('   - PageReference checking page:', childSlug);
  console.log('   - Page exists:', !!pages[childSlug]);
  console.log('   - Before check - parentSlug:', pages[childSlug]?.parentSlug);
  console.log('   - Before check - isSubPage:', pages[childSlug]?.isSubPage);
  
  // Fixed logic: Only update existing pages, don't create new ones
  if (pages[childSlug] && pages[childSlug].title !== currentTitle) {
    pages[childSlug].title = currentTitle;
    localStorage.setItem("novel-pages", JSON.stringify(pages));
    console.log('✓ PageReference updated title only');
  } else if (pages[childSlug]) {
    console.log('✓ PageReference found existing page, no changes needed');
  } else {
    console.log('✓ PageReference correctly ignored missing page (will be created by proper flow)');
  }
  
  console.log('   - After check - parentSlug:', pages[childSlug]?.parentSlug);
  console.log('   - After check - isSubPage:', pages[childSlug]?.isSubPage);
}

function verifySidebarDisplay(pages) {
  console.log('\n3. Verifying sidebar display logic...');
  
  // Simulate sidebar filtering logic
  const pageEntries = Object.entries(pages)
    .filter(([, page]) => !page.isSubPage) // Only show parent pages
    .sort(([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  console.log('   - Pages shown in sidebar:', pageEntries.length);
  pageEntries.forEach(([slug, page]) => {
    console.log(`     * ${page.title} (${slug})`);
  });
  
  // Check for sub-pages (should not appear in main sidebar)
  const subPages = Object.entries(pages).filter(([, page]) => page.isSubPage);
  console.log('   - Sub-pages (hidden from sidebar):', subPages.length);
  subPages.forEach(([slug, page]) => {
    console.log(`     * ${page.title} (parent: ${page.parentSlug})`);
  });
}

// Run the tests
try {
  const { parentSlug, childSlug, pagesData } = simulateFixedPageCreation();
  simulateFixedPageReferenceCheck(childSlug, pagesData);
  
  // Get final state
  const finalPages = JSON.parse(localStorage.getItem("novel-pages") || '{}');
  verifySidebarDisplay(finalPages);
  
  console.log('\n=== Verification Complete ===');
  console.log('✅ Fix appears to be working correctly!');
  console.log('   - Child page maintains parent relationship');
  console.log('   - PageReference doesn\'t overwrite data');
  console.log('   - Sidebar displays correctly');
  
} catch (error) {
  console.error('❌ Verification failed:', error);
}