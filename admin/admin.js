// ===== Admin Panel JavaScript =====

// State
let content = {};
let hasUnsavedChanges = false;
let mediaLibrary = [];
let currentImageTarget = null; // For image picker

// GitHub Config
const GITHUB_CONFIG = {
    owner: 'nbengalgml',
    repo: 'SAE',
    branch: 'main',
    contentPath: 'content.json'
};

// DOM Elements (initialized after DOM loads)
let saveStatus, saveBtn, publishBtn, previewBtn, previewModal, toastContainer;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM references
    saveStatus = document.getElementById('saveStatus');
    saveBtn = document.getElementById('saveBtn');
    publishBtn = document.getElementById('publishBtn');
    previewBtn = document.getElementById('previewBtn');
    previewModal = document.getElementById('previewModal');
    toastContainer = document.getElementById('toastContainer');
    
    try {
        await loadContent();
        setupNavigation();
        setupFormListeners();
        setupImageUploads();
        setupMediaLibrary();
        setupGitHubSettings();
        setupImagePicker();
        populateEditors();
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        alert('Error loading admin panel: ' + error.message);
    }
});

// ===== GitHub Token Management =====
function getGitHubToken() {
    return localStorage.getItem('github_token') || '';
}

function setGitHubToken(token) {
    localStorage.setItem('github_token', token);
}

function setupGitHubSettings() {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput) {
        // Load saved token (show masked)
        const savedToken = getGitHubToken();
        if (savedToken) {
            tokenInput.value = savedToken;
            tokenInput.type = 'password';
        }
        
        // Save token on change
        tokenInput.addEventListener('change', (e) => {
            setGitHubToken(e.target.value);
            showToast('GitHub token saved', 'success');
        });
    }
    
    // Test connection button
    const testBtn = document.getElementById('test-github-btn');
    if (testBtn) {
        testBtn.addEventListener('click', testGitHubConnection);
    }
}

async function testGitHubConnection() {
    const token = getGitHubToken();
    if (!token) {
        showToast('Please enter a GitHub token first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json'
            }
        });
        
        if (response.ok) {
            showToast('✅ GitHub connection successful!', 'success');
        } else {
            const error = await response.json();
            showToast(`GitHub error: ${error.message}`, 'error');
        }
    } catch (error) {
        showToast('Connection failed: ' + error.message, 'error');
    }
}

// ===== Content Management =====
async function loadContent() {
    try {
        // Try to load from localStorage first (for unsaved changes)
        const savedContent = localStorage.getItem('shaham_content');
        if (savedContent) {
            content = JSON.parse(savedContent);
            console.log('Loaded content from localStorage');
            showToast('Loaded from local storage', 'success');
        } else {
            // Load from content.json (try multiple paths for different hosting scenarios)
            let response;
            const paths = ['../content.json', '/SAE/content.json', 'content.json'];
            
            for (const path of paths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        console.log('Loaded content from:', path);
                        break;
                    }
                } catch (e) {
                    console.log('Failed to load from:', path);
                }
            }
            
            if (response && response.ok) {
                content = await response.json();
                showToast('Content loaded successfully', 'success');
            } else {
                throw new Error('Could not load content.json from any path');
            }
        }
        
        // Load media library
        const savedMedia = localStorage.getItem('shaham_media');
        if (savedMedia) {
            mediaLibrary = JSON.parse(savedMedia);
        }
        
        console.log('Content loaded:', content);
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Error loading content: ' + error.message, 'error');
        
        // Initialize with empty content structure to prevent further errors
        content = {
            site: { companyName: '', logo: '', tagline: '' },
            home: { hero: {}, features: [], stats: [], cta: {} },
            products: { header: {}, categories: [], cta: {} },
            about: { header: {}, sections: [], values: [], cta: {} },
            contact: { header: {}, intro: {}, details: { address: {}, hours: {} } },
            footer: {}
        };
    }
}

function saveToLocalStorage() {
    localStorage.setItem('shaham_content', JSON.stringify(content));
    localStorage.setItem('shaham_media', JSON.stringify(mediaLibrary));
    hasUnsavedChanges = false;
    updateSaveStatus();
    showToast('Changes saved locally', 'success');
}

function markAsUnsaved() {
    hasUnsavedChanges = true;
    updateSaveStatus();
}

function updateSaveStatus() {
    if (hasUnsavedChanges) {
        saveStatus.textContent = 'Unsaved changes';
        saveStatus.classList.add('unsaved');
    } else {
        saveStatus.textContent = 'All changes saved';
        saveStatus.classList.remove('unsaved');
    }
}

// ===== Navigation =====
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            // Update nav active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding editor
            document.querySelectorAll('.page-editor').forEach(editor => {
                editor.classList.remove('active');
            });
            document.getElementById(`editor-${page}`).classList.add('active');
            
            // Update page title
            document.getElementById('currentPageTitle').textContent = item.textContent.trim();
        });
    });
}

// ===== Form Listeners =====
function setupFormListeners() {
    // Listen for changes on all inputs with data-path
    document.querySelectorAll('[data-path]').forEach(input => {
        input.addEventListener('input', (e) => {
            const path = e.target.dataset.path;
            setNestedValue(content, path, e.target.value);
            markAsUnsaved();
        });
    });
    
    // Save button
    saveBtn.addEventListener('click', saveToLocalStorage);
    
    // Publish button
    publishBtn.addEventListener('click', publishToGitHub);
    
    // Preview button
    previewBtn.addEventListener('click', () => {
        previewModal.classList.add('active');
        document.getElementById('previewFrame').src = '../index.html?' + Date.now();
    });
}

// ===== Populate Editors =====
function populateEditors() {
    if (!content) {
        console.error('No content to populate');
        return;
    }
    
    // Populate all inputs with data-path
    document.querySelectorAll('[data-path]').forEach(input => {
        const value = getNestedValue(content, input.dataset.path);
        if (value !== undefined && value !== null) {
            input.value = value;
        }
    });
    
    // Populate features (with safety check)
    if (content.home?.features) {
        populateFeatures();
    }
    
    // Populate stats
    if (content.home?.stats) {
        populateStats();
    }
    
    // Populate product categories
    if (content.products?.categories) {
        populateCategories();
    }
    
    // Populate about sections
    if (content.about?.sections) {
        populateAboutSections();
    }
    
    // Populate values
    if (content.about?.values) {
        populateValues();
    }
    
    // Populate logo preview
    const logoPreview = document.getElementById('logo-preview');
    if (logoPreview && content.site?.logo) {
        // Handle both relative paths and data URLs
        if (content.site.logo.startsWith('data:') || content.site.logo.startsWith('http')) {
            logoPreview.src = content.site.logo;
        } else {
            logoPreview.src = '../' + content.site.logo;
        }
    }
    
    // Populate media library
    populateMediaGrid();
    
    console.log('Editors populated');
}

// ===== Features Editor =====
function populateFeatures() {
    const container = document.getElementById('features-list');
    container.innerHTML = '';
    
    content.home.features.forEach((feature, index) => {
        container.appendChild(createFeatureItem(feature, index));
    });
    
    // Add feature button
    document.getElementById('addFeatureBtn').onclick = () => {
        const newFeature = {
            id: `feature-${Date.now()}`,
            title: 'New Feature',
            description: 'Description here...',
            icon: 'light'
        };
        content.home.features.push(newFeature);
        container.appendChild(createFeatureItem(newFeature, content.home.features.length - 1));
        markAsUnsaved();
    };
}

function createFeatureItem(feature, index) {
    const div = document.createElement('div');
    div.className = 'editable-item';
    div.innerHTML = `
        <div class="editable-item-header">
            <span class="editable-item-title">Feature ${index + 1}</span>
            <div class="editable-item-actions">
                <button class="item-action-btn delete" onclick="deleteFeature(${index})">🗑️</button>
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Title</label>
                <input type="text" value="${escapeHtml(feature.title)}" onchange="updateFeature(${index}, 'title', this.value)">
            </div>
            <div class="form-group">
                <label>Icon</label>
                <select onchange="updateFeature(${index}, 'icon', this.value)">
                    <option value="light" ${feature.icon === 'light' ? 'selected' : ''}>Light</option>
                    <option value="eye" ${feature.icon === 'eye' ? 'selected' : ''}>Eye</option>
                    <option value="chip" ${feature.icon === 'chip' ? 'selected' : ''}>Chip</option>
                    <option value="gear" ${feature.icon === 'gear' ? 'selected' : ''}>Gear</option>
                </select>
            </div>
            <div class="form-group full-width">
                <label>Description</label>
                <textarea rows="2" onchange="updateFeature(${index}, 'description', this.value)">${escapeHtml(feature.description)}</textarea>
            </div>
        </div>
    `;
    return div;
}

window.updateFeature = function(index, key, value) {
    content.home.features[index][key] = value;
    markAsUnsaved();
};

window.deleteFeature = function(index) {
    if (confirm('Delete this feature?')) {
        content.home.features.splice(index, 1);
        populateFeatures();
        markAsUnsaved();
    }
};

// ===== Stats Editor =====
function populateStats() {
    const container = document.getElementById('stats-list');
    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    
    content.home.stats.forEach((stat, index) => {
        grid.innerHTML += `
            <div class="form-group">
                <label>Stat ${index + 1} Number</label>
                <input type="text" value="${escapeHtml(stat.number)}" onchange="updateStat(${index}, 'number', this.value)">
            </div>
            <div class="form-group">
                <label>Stat ${index + 1} Label</label>
                <input type="text" value="${escapeHtml(stat.label)}" onchange="updateStat(${index}, 'label', this.value)">
            </div>
        `;
    });
    
    container.appendChild(grid);
}

window.updateStat = function(index, key, value) {
    content.home.stats[index][key] = value;
    markAsUnsaved();
};

// ===== Categories Editor =====
function populateCategories() {
    const container = document.getElementById('categories-list');
    container.innerHTML = '';
    
    content.products.categories.forEach((category, catIndex) => {
        const accordion = document.createElement('div');
        accordion.className = 'category-accordion';
        accordion.innerHTML = `
            <div class="category-header" onclick="toggleCategory(this)">
                <h3>📁 ${escapeHtml(category.name)}</h3>
                <span class="category-toggle">▼</span>
            </div>
            <div class="category-content">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label>Category Name</label>
                    <input type="text" value="${escapeHtml(category.name)}" onchange="updateCategoryName(${catIndex}, this.value)">
                </div>
                <div class="products-list" id="products-${catIndex}">
                    ${category.products.map((product, prodIndex) => createProductItem(catIndex, prodIndex, product)).join('')}
                </div>
                <button class="btn btn-add btn-sm" onclick="addProduct(${catIndex})" style="margin-top: 12px;">
                    <span>+</span> Add Product
                </button>
            </div>
        `;
        container.appendChild(accordion);
    });
}

function createProductItem(catIndex, prodIndex, product) {
    const imageUrl = product.image || '';
    const hasImage = imageUrl && imageUrl.length > 0;
    
    return `
        <div class="editable-item">
            <div class="editable-item-header">
                <span class="editable-item-title">${escapeHtml(product.title)}</span>
                <div class="editable-item-actions">
                    <button class="item-action-btn delete" onclick="deleteProduct(${catIndex}, ${prodIndex})">🗑️</button>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Product Image</label>
                    <div class="product-image-edit editable-image" onclick="openImagePicker(this, 'products.categories[${catIndex}].products[${prodIndex}].image')" style="width: 100%; height: 80px; background: var(--admin-bg); border-radius: var(--radius); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${hasImage 
                            ? `<img src="${escapeHtml(imageUrl)}" alt="Product" style="max-width: 100%; max-height: 100%; object-fit: contain;">` 
                            : `<span style="color: var(--admin-text-muted); font-size: 12px;">📷 Add Image</span>`
                        }
                    </div>
                </div>
                <div class="form-group">
                    <label>Product Title</label>
                    <input type="text" value="${escapeHtml(product.title)}" onchange="updateProduct(${catIndex}, ${prodIndex}, 'title', this.value)">
                </div>
                <div class="form-group full-width">
                    <label>Description</label>
                    <textarea rows="2" onchange="updateProduct(${catIndex}, ${prodIndex}, 'description', this.value)">${escapeHtml(product.description)}</textarea>
                </div>
            </div>
        </div>
    `;
}

window.toggleCategory = function(header) {
    header.parentElement.classList.toggle('open');
};

window.updateCategoryName = function(catIndex, value) {
    content.products.categories[catIndex].name = value;
    markAsUnsaved();
};

window.updateProduct = function(catIndex, prodIndex, key, value) {
    content.products.categories[catIndex].products[prodIndex][key] = value;
    markAsUnsaved();
};

window.deleteProduct = function(catIndex, prodIndex) {
    if (confirm('Delete this product?')) {
        content.products.categories[catIndex].products.splice(prodIndex, 1);
        populateCategories();
        markAsUnsaved();
    }
};

window.addProduct = function(catIndex) {
    const newProduct = {
        id: `prod-${Date.now()}`,
        title: 'New Product',
        description: 'Product description...',
        image: ''
    };
    content.products.categories[catIndex].products.push(newProduct);
    populateCategories();
    markAsUnsaved();
};

// ===== About Sections Editor =====
function populateAboutSections() {
    const container = document.getElementById('about-sections-list');
    container.innerHTML = '';
    
    content.about.sections.forEach((section, index) => {
        const div = document.createElement('div');
        div.className = 'editable-item';
        div.innerHTML = `
            <div class="editable-item-header">
                <span class="editable-item-title">${escapeHtml(section.title)}</span>
            </div>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>Section Title</label>
                    <input type="text" value="${escapeHtml(section.title)}" onchange="updateAboutSection(${index}, 'title', this.value)">
                </div>
                ${section.paragraphs.map((p, pIndex) => `
                    <div class="form-group full-width">
                        <label>Paragraph ${pIndex + 1}</label>
                        <textarea rows="3" onchange="updateAboutParagraph(${index}, ${pIndex}, this.value)">${escapeHtml(p)}</textarea>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(div);
    });
}

window.updateAboutSection = function(index, key, value) {
    content.about.sections[index][key] = value;
    markAsUnsaved();
};

window.updateAboutParagraph = function(sectionIndex, paragraphIndex, value) {
    content.about.sections[sectionIndex].paragraphs[paragraphIndex] = value;
    markAsUnsaved();
};

// ===== Values Editor =====
function populateValues() {
    const container = document.getElementById('values-list');
    container.innerHTML = '';
    
    content.about.values.forEach((value, index) => {
        const div = document.createElement('div');
        div.className = 'editable-item';
        div.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Value Title</label>
                    <input type="text" value="${escapeHtml(value.title)}" onchange="updateValue(${index}, 'title', this.value)">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea rows="2" onchange="updateValue(${index}, 'description', this.value)">${escapeHtml(value.description)}</textarea>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.updateValue = function(index, key, value) {
    content.about.values[index][key] = value;
    markAsUnsaved();
};

// ===== Image Uploads =====
function setupImageUploads() {
    const logoFile = document.getElementById('logo-file');
    logoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                document.getElementById('logo-preview').src = dataUrl;
                // Store in media library
                addToMediaLibrary(file.name, dataUrl);
                // Update content
                content.site.logo = `data:${file.type};base64,` + dataUrl.split(',')[1];
                markAsUnsaved();
                showToast('Logo updated', 'success');
            };
            reader.readAsDataURL(file);
        }
    });
}

// ===== Media Library =====
function setupMediaLibrary() {
    const dropzone = document.getElementById('media-dropzone');
    const fileInput = document.getElementById('media-files');
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    // File input
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                addToMediaLibrary(file.name, event.target.result);
                populateMediaGrid();
                markAsUnsaved();
            };
            reader.readAsDataURL(file);
        }
    });
}

function addToMediaLibrary(name, dataUrl) {
    mediaLibrary.push({
        id: Date.now(),
        name: name,
        url: dataUrl,
        uploadedAt: new Date().toISOString()
    });
}

function populateMediaGrid() {
    const grid = document.getElementById('media-grid');
    grid.innerHTML = '';
    
    mediaLibrary.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'media-item';
        div.innerHTML = `
            <img src="${item.url}" alt="${escapeHtml(item.name)}">
            <div class="media-item-overlay">
                <button class="btn btn-sm btn-secondary" onclick="copyMediaUrl(${index})">📋</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMedia(${index})">🗑️</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

window.copyMediaUrl = function(index) {
    navigator.clipboard.writeText(mediaLibrary[index].url);
    showToast('URL copied to clipboard', 'success');
};

window.deleteMedia = function(index) {
    if (confirm('Delete this image?')) {
        mediaLibrary.splice(index, 1);
        populateMediaGrid();
        markAsUnsaved();
    }
};

// ===== Publish to GitHub =====
async function publishToGitHub() {
    const token = getGitHubToken();
    
    if (!token) {
        showToast('Please set your GitHub token in Site Settings first!', 'error');
        // Switch to site settings
        document.querySelector('[data-page="site-settings"]').click();
        return;
    }
    
    // Show loading state
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<span>⏳</span> Publishing...';
    
    try {
        // First, get the current file to get its SHA
        const getResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.contentPath}?ref=${GITHUB_CONFIG.branch}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            }
        );
        
        let sha = null;
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }
        
        // Prepare the content
        const contentString = JSON.stringify(content, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));
        
        // Create commit
        const updateResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.contentPath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update content via Admin Panel - ${new Date().toLocaleString()}`,
                    content: contentBase64,
                    sha: sha,
                    branch: GITHUB_CONFIG.branch
                })
            }
        );
        
        if (updateResponse.ok) {
            // Clear local storage since changes are now on GitHub
            localStorage.removeItem('shaham_content');
            hasUnsavedChanges = false;
            updateSaveStatus();
            
            showToast('🎉 Published to GitHub successfully!', 'success');
            
            // Show info about GitHub Pages update time
            setTimeout(() => {
                showToast('Site will update in ~1-2 minutes', 'success');
            }, 1500);
        } else {
            const error = await updateResponse.json();
            throw new Error(error.message || 'Failed to publish');
        }
        
    } catch (error) {
        console.error('Publish error:', error);
        showToast('Publish failed: ' + error.message, 'error');
    } finally {
        // Reset button
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<span>🚀</span> Publish';
    }
}

// ===== Preview Modal =====
window.closePreviewModal = function() {
    previewModal.classList.remove('active');
};

previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        closePreviewModal();
    }
});

// ===== Utilities =====
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, path, value) {
    // Handle array notation like "products.categories[0].products[1].image"
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    const lastKey = parts.pop();
    
    let target = obj;
    for (const key of parts) {
        if (target[key] === undefined) {
            target[key] = isNaN(parseInt(key)) ? {} : [];
        }
        target = target[key];
    }
    
    target[lastKey] = value;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    // Get toast container (might not be initialized yet)
    const container = toastContainer || document.getElementById('toastContainer');
    if (!container) {
        console.log(`Toast (${type}):`, message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Image Picker =====
function setupImagePicker() {
    const modal = document.getElementById('imagePickerModal');
    const tabs = document.querySelectorAll('.picker-tab');
    const panels = document.querySelectorAll('.picker-panel');
    const dropzone = document.getElementById('picker-dropzone');
    const fileInput = document.getElementById('picker-file-input');
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${targetTab}`).classList.add('active');
            
            // Populate library when switching to it
            if (targetTab === 'library') {
                populatePickerLibrary();
            }
        });
    });
    
    // Drag and drop in picker
    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handlePickerFile(file);
            }
        });
    }
    
    // File input in picker
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlePickerFile(file);
            }
        });
    }
    
    // Close modal on background click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImagePicker();
            }
        });
    }
}

function handlePickerFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        
        // Add to media library
        addToMediaLibrary(file.name, dataUrl);
        populateMediaGrid();
        
        // Apply to target
        applySelectedImage(dataUrl);
        
        showToast('Image uploaded and applied', 'success');
    };
    reader.readAsDataURL(file);
}

function populatePickerLibrary() {
    const grid = document.getElementById('picker-library-grid');
    const emptyMsg = document.getElementById('empty-library-msg');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (mediaLibrary.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    
    if (emptyMsg) emptyMsg.style.display = 'none';
    
    mediaLibrary.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'picker-library-item';
        div.innerHTML = `
            <img src="${item.url}" alt="${escapeHtml(item.name)}">
            <div class="select-check">✓</div>
        `;
        div.addEventListener('click', () => {
            // Remove selected from others
            grid.querySelectorAll('.picker-library-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            
            // Apply after a short delay for visual feedback
            setTimeout(() => {
                applySelectedImage(item.url);
                showToast('Image selected', 'success');
            }, 200);
        });
        grid.appendChild(div);
    });
}

function openImagePicker(targetElement, contentPath) {
    currentImageTarget = {
        element: targetElement,
        path: contentPath
    };
    
    // Reset to upload tab
    document.querySelectorAll('.picker-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.picker-tab[data-tab="upload"]')?.classList.add('active');
    document.querySelectorAll('.picker-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-upload')?.classList.add('active');
    
    // Clear file input
    const fileInput = document.getElementById('picker-file-input');
    if (fileInput) fileInput.value = '';
    
    document.getElementById('imagePickerModal').classList.add('active');
}

window.closeImagePicker = function() {
    document.getElementById('imagePickerModal').classList.remove('active');
    currentImageTarget = null;
};

function applySelectedImage(imageUrl) {
    if (!currentImageTarget) return;
    
    // Update the image element
    if (currentImageTarget.element) {
        const img = currentImageTarget.element.querySelector('img') || currentImageTarget.element;
        if (img.tagName === 'IMG') {
            img.src = imageUrl;
        }
    }
    
    // Update content data
    if (currentImageTarget.path) {
        setNestedValue(content, currentImageTarget.path, imageUrl);
        markAsUnsaved();
    }
    
    closeImagePicker();
}

// Global function to make images editable
window.makeImageEditable = function(element, contentPath) {
    element.classList.add('editable-image');
    element.addEventListener('click', () => {
        openImagePicker(element, contentPath);
    });
};

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToLocalStorage();
    }
    
    // Ctrl/Cmd + Shift + P to publish
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        publishToGitHub();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        closeImagePicker();
        closePreviewModal();
    }
});

// ===== Warn on unsaved changes =====
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});
