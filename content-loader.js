// ===== Content Loader for Shaham Aviation Website =====
// This script loads content from content.json and populates the pages

class ContentLoader {
    constructor() {
        this.content = null;
        this.init();
    }

    async init() {
        await this.loadContent();
        this.applyContent();
    }

    async loadContent() {
        try {
            // First check localStorage for any saved changes from admin
            const savedContent = localStorage.getItem('shaham_content');
            if (savedContent) {
                this.content = JSON.parse(savedContent);
                return;
            }
            
            // Otherwise load from content.json
            const response = await fetch('content.json');
            this.content = await response.json();
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    applyContent() {
        if (!this.content) return;

        const page = this.detectPage();
        
        // Apply site-wide content
        this.applySiteContent();
        this.applyFooterContent();

        // Apply page-specific content
        switch (page) {
            case 'home':
                this.applyHomeContent();
                break;
            case 'products':
                this.applyProductsContent();
                break;
            case 'about':
                this.applyAboutContent();
                break;
            case 'contact':
                this.applyContactContent();
                break;
        }
    }

    detectPage() {
        const path = window.location.pathname;
        if (path.includes('products')) return 'products';
        if (path.includes('about')) return 'about';
        if (path.includes('contact')) return 'contact';
        return 'home';
    }

    // ===== Site-wide Content =====
    applySiteContent() {
        const site = this.content.site;
        
        // Update logo
        const logos = document.querySelectorAll('.logo-img');
        logos.forEach(logo => {
            if (site.logo) {
                logo.src = site.logo;
                logo.alt = site.companyName;
            }
        });
    }

    applyFooterContent() {
        const footer = this.content.footer;
        const contact = this.content.contact?.details;

        // Footer description
        const footerDesc = document.querySelector('.footer-brand p');
        if (footerDesc && footer?.description) {
            footerDesc.textContent = footer.description;
        }

        // Copyright
        const copyright = document.querySelector('.footer-bottom p');
        if (copyright && footer?.copyright) {
            copyright.textContent = footer.copyright;
        }

        // Contact info in footer
        if (contact) {
            const footerAddress = document.querySelector('.footer-contact address');
            if (footerAddress) {
                footerAddress.innerHTML = `
                    <p>${contact.address?.line1 || ''}</p>
                    <p>${contact.address?.line2 || ''}</p>
                    <p>${contact.address?.line3 || ''}</p>
                    <p>Tel: ${contact.phone || ''}</p>
                    <p>Email: ${contact.email || ''}</p>
                `;
            }
        }
    }

    // ===== Home Page =====
    applyHomeContent() {
        const home = this.content.home;
        if (!home) return;

        // Hero section
        const hero = home.hero;
        if (hero) {
            this.setText('.hero-badge', hero.badge, true);
            this.setText('.title-line:not(.accent)', hero.titleLine1);
            this.setText('.title-line.accent', hero.titleLine2);
            this.setText('.hero-description', hero.description);
            
            const ctaPrimary = document.querySelector('.hero-cta .btn-primary');
            if (ctaPrimary && hero.ctaPrimary) ctaPrimary.textContent = hero.ctaPrimary;
            
            const ctaSecondary = document.querySelector('.hero-cta .btn-secondary');
            if (ctaSecondary && hero.ctaSecondary) ctaSecondary.textContent = hero.ctaSecondary;
        }

        // Features
        if (home.features) {
            this.applyFeatures(home.features);
        }

        // Stats
        if (home.stats) {
            this.applyStats(home.stats);
        }

        // CTA section
        if (home.cta) {
            this.setText('.cta-content h2', home.cta.title);
            this.setText('.cta-content p', home.cta.description);
        }
    }

    applyFeatures(features) {
        const cards = document.querySelectorAll('.feature-card');
        features.forEach((feature, index) => {
            if (cards[index]) {
                const card = cards[index];
                const title = card.querySelector('h3');
                const desc = card.querySelector('p');
                if (title) title.textContent = feature.title;
                if (desc) desc.textContent = feature.description;
            }
        });
    }

    applyStats(stats) {
        const items = document.querySelectorAll('.stat-item');
        stats.forEach((stat, index) => {
            if (items[index]) {
                const number = items[index].querySelector('.stat-number');
                const label = items[index].querySelector('.stat-label');
                if (number) number.textContent = stat.number;
                if (label) label.textContent = stat.label;
            }
        });
    }

    // ===== Products Page =====
    applyProductsContent() {
        const products = this.content.products;
        if (!products) return;

        // Header
        if (products.header) {
            this.setText('.page-header h1', products.header.title);
            this.setText('.page-header p', products.header.subtitle);
        }

        // Categories and products
        if (products.categories) {
            const categoryDivs = document.querySelectorAll('.products-category');
            products.categories.forEach((category, catIndex) => {
                if (categoryDivs[catIndex]) {
                    const catDiv = categoryDivs[catIndex];
                    const catTitle = catDiv.querySelector('.category-header h2');
                    if (catTitle) catTitle.textContent = category.name;

                    const productCards = catDiv.querySelectorAll('.product-card');
                    category.products.forEach((product, prodIndex) => {
                        if (productCards[prodIndex]) {
                            const card = productCards[prodIndex];
                            const title = card.querySelector('h3');
                            const desc = card.querySelector('p');
                            if (title) title.textContent = product.title;
                            if (desc) desc.textContent = product.description;
                        }
                    });
                }
            });
        }

        // CTA
        if (products.cta) {
            this.setText('.cta-content h2', products.cta.title);
            this.setText('.cta-content p', products.cta.description);
        }
    }

    // ===== About Page =====
    applyAboutContent() {
        const about = this.content.about;
        if (!about) return;

        // Header
        if (about.header) {
            this.setText('.page-header h1', about.header.title);
            this.setText('.page-header p', about.header.subtitle);
        }

        // About sections
        if (about.sections) {
            const contentDivs = document.querySelectorAll('.about-content');
            about.sections.forEach((section, index) => {
                if (contentDivs[index]) {
                    const textDiv = contentDivs[index].querySelector('.about-text');
                    if (textDiv) {
                        const title = textDiv.querySelector('h2');
                        if (title) title.textContent = section.title;

                        const paragraphs = textDiv.querySelectorAll('p');
                        section.paragraphs.forEach((text, pIndex) => {
                            if (paragraphs[pIndex]) {
                                paragraphs[pIndex].innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            }
                        });
                    }
                }
            });
        }

        // Values
        if (about.values) {
            const valueCards = document.querySelectorAll('.value-card');
            about.values.forEach((value, index) => {
                if (valueCards[index]) {
                    const title = valueCards[index].querySelector('h3');
                    const desc = valueCards[index].querySelector('p');
                    if (title) title.textContent = value.title;
                    if (desc) desc.textContent = value.description;
                }
            });
        }

        // CTA
        if (about.cta) {
            this.setText('.cta-content h2', about.cta.title);
            this.setText('.cta-content p', about.cta.description);
        }
    }

    // ===== Contact Page =====
    applyContactContent() {
        const contact = this.content.contact;
        if (!contact) return;

        // Header
        if (contact.header) {
            this.setText('.page-header h1', contact.header.title);
            this.setText('.page-header p', contact.header.subtitle);
        }

        // Intro
        if (contact.intro) {
            this.setText('.contact-info h2', contact.intro.title);
            this.setText('.contact-info > p', contact.intro.description);
        }

        // Contact details
        if (contact.details) {
            const details = contact.details;
            
            // Address
            const addressItem = document.querySelector('.contact-item:nth-child(1) p');
            if (addressItem && details.address) {
                addressItem.innerHTML = `${details.address.line1}<br>${details.address.line2}<br>${details.address.line3}`;
            }

            // Phone
            const phoneItem = document.querySelector('.contact-item:nth-child(2) p');
            if (phoneItem) {
                phoneItem.innerHTML = `Tel: ${details.phone}<br>Fax: ${details.fax}`;
            }

            // Email
            const emailItem = document.querySelector('.contact-item:nth-child(3) p');
            if (emailItem) {
                emailItem.textContent = details.email;
            }

            // Hours
            const hoursItem = document.querySelector('.contact-item:nth-child(4) p');
            if (hoursItem && details.hours) {
                hoursItem.innerHTML = `${details.hours.weekdays}<br>${details.hours.friday}`;
            }
        }
    }

    // ===== Utility Methods =====
    setText(selector, text, preserveChildren = false) {
        const element = document.querySelector(selector);
        if (element && text) {
            if (preserveChildren) {
                // Keep the first child (like badge icon) and update text
                const firstChild = element.firstElementChild;
                if (firstChild) {
                    element.innerHTML = '';
                    element.appendChild(firstChild);
                    element.appendChild(document.createTextNode(' ' + text));
                } else {
                    element.textContent = text;
                }
            } else {
                element.textContent = text;
            }
        }
    }
}

// Initialize content loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ContentLoader();
});

