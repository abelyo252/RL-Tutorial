document.addEventListener('DOMContentLoaded', () => {
    // Sidebar control
    const sidebar = document.getElementById('sidebar');
    const collapseSidebar = document.getElementById('collapse-sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarText = document.querySelectorAll('.sidebar-text');
    
    // Collapse sidebar on desktop
    if (collapseSidebar) {
        collapseSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                collapseSidebar.innerHTML = '<i class="fas fa-angles-right"></i>';
                sidebarText.forEach(el => el.style.display = 'none');
            } else {
                collapseSidebar.innerHTML = '<i class="fas fa-angles-left"></i>';
                sidebarText.forEach(el => el.style.display = 'block');
            }
        });
    }
    
    // Mobile sidebar toggle
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && e.target !== mobileSidebarToggle) {
            sidebar.classList.remove('open');
        }
    });
    
    // Navigation
    const sidebarItems = document.querySelectorAll('.sidebar-menu-item');
    const sections = document.querySelectorAll('.section-content');
    
    function activateSection(sectionId) {
        // Hide all sections
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        // Deactivate all sidebar items
        sidebarItems.forEach(item => {
            item.classList.remove('active', 'bg-primary/10', 'text-primary');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        // Activate corresponding sidebar item
        const targetItem = document.querySelector(`.sidebar-menu-item[data-section="${sectionId}"]`);
        if (targetItem) {
            targetItem.classList.add('active', 'bg-primary/10', 'text-primary');
        }
        
        // Close sidebar on mobile after selection
        if (window.innerWidth < 768) {
            sidebar.classList.remove('open');
        }
        
        // Initialize syntax highlighting
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('pre code').forEach((el) => {
                hljs.highlightElement(el);
            });
        }
        
        // Render math with MathJax
        if (typeof MathJax !== 'undefined' && typeof MathJax.typesetPromise === 'function') {
            MathJax.typesetPromise().catch(function (err) {
                console.log('MathJax typesetting failed: ' + err.message);
            });
        } else if (typeof MathJax !== 'undefined') {
            // For older versions of MathJax
            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        }
    }
    
    // Attach click handlers to sidebar items
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            activateSection(sectionId);
        });
    });
    
    // Step navigation in code walkthrough
    const stepButtons = document.querySelectorAll('.step-button');
    
    stepButtons.forEach(button => {
        button.addEventListener('click', () => {
            const stepId = button.getAttribute('data-step');
            
            // Deactivate all step buttons
            stepButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Hide all step contents
            document.querySelectorAll('[id^="step-"]').forEach(content => {
                content.classList.add('hidden');
            });
            
            // Show selected step content
            const targetContent = document.getElementById(`step-${stepId}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            // Activate selected step button
            button.classList.add('active');
        });
    });
    
    // Start with Home section active by default
    activateSection('home');
    
    // Initialize syntax highlighting
    if (typeof hljs !== 'undefined') {
        hljs.configure({
            languages: ['javascript'],
            ignoreUnescapedHTML: true
        });
        
        document.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }
    
    // Manually trigger MathJax rendering
    if (typeof MathJax !== 'undefined' && typeof MathJax.typesetPromise === 'function') {
        MathJax.typesetPromise().catch(function (err) {
            console.log('MathJax typesetting failed: ' + err.message);
        });
    } else if (typeof MathJax !== 'undefined') {
        // For older versions of MathJax
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }
    
    // Listen for window resizing to adjust sidebar
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('open');
        }
    });
});