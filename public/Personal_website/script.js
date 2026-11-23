document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navContainer = document.querySelector('.nav-container');
    const navLinks = document.querySelectorAll('.links a');

    const toggleMenu = () => {
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
        
        hamburger.classList.toggle('active');
        navContainer.classList.toggle('active');
        
        hamburger.setAttribute('aria-expanded', !isExpanded);
        
        if (!isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    };

    if (hamburger && navContainer) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navContainer && navContainer.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (navContainer && navContainer.classList.contains('active')) {
            const isClickInsideMenu = navContainer.contains(e.target);
            const isClickOnHamburger = hamburger.contains(e.target);
            
            if (!isClickInsideMenu && !isClickOnHamburger) {
                toggleMenu();
            }
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (navContainer && navContainer.classList.contains('active')) {
                hamburger.removeProperty ? hamburger.classList.remove('active') : hamburger.classList.remove('active');
                navContainer.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        }
    });

    // Contact Form handling with safe textContent rendering
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('name');
            const name = nameInput ? nameInput.value : '';

            let feedback = contactForm.querySelector('.form-feedback');
            if (!feedback) {
                feedback = document.createElement('div');
                feedback.className = 'form-feedback';
                contactForm.appendChild(feedback);
            }

            // Strictly set feedback using textContent to prevent XSS payloads from executing
            feedback.textContent = `Thank you, ${name}! Your message has been received.`;
            contactForm.reset();
        });
    }
});

/**
 * Safely inserts a project card into #projects-container.
 * Explicitly uses textContent (or document.createTextNode) to ensure all
 * fixture or user input strings are strictly treated as text, never HTML.
 */
function addProjectCard(titleOrObj, maybeDesc) {
    const container = document.getElementById('projects-container');
    if (!container) return null;

    let title = '';
    let description = '';

    if (typeof titleOrObj === 'object' && titleOrObj !== null) {
        title = titleOrObj.title || '';
        description = titleOrObj.description || '';
    } else {
        title = titleOrObj || '';
        description = maybeDesc || '';
    }

    const card = document.createElement('article');
    card.className = 'project-card';

    const heading = document.createElement('h3');
    heading.textContent = String(title);

    const desc = document.createElement('p');
    desc.textContent = String(description);

    card.appendChild(heading);
    card.appendChild(desc);
    container.appendChild(card);
    return card;
}

// Expose globally for dynamic insertion and testing
if (typeof window !== 'undefined') {
    window.addProjectCard = addProjectCard;
    window.insertProjectCard = addProjectCard;
}