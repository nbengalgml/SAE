// ===== Admin Panel JavaScript =====

// State
let content = {};
let hasUnsavedChanges = false;
let mediaLibrary = [];

// DOM Elements
const saveStatus = document.getElementById('saveStatus');
const saveBtn = document.getElementById('saveBtn');
const publishBtn = document.getElementById('publishBtn');
const previewBtn = document.getElementById('previewBtn');
const previewModal = document.getElementById('previewModal');
const toastContainer = document.getElementById('toastContainer');

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadContent();
    setupNavigation();
    setupFormListeners();
    setupImageUploads();
    setupMediaLibrary();
    populateEditors();
});

// ===== Content Management =====
async function loadContent() {
    try {
        // Try to load from localStorage first (for unsaved changes)
        const savedContent = localStorage.getItem('shaham_content');
        if (savedContent) {
            content = JSON.parse(savedContent);
            showToast('Loaded from local storage', 'success');
        } else {
            // Load from content.json
            const response = await fetch('../content.json');
            content = await response.json();
        }
        
        // Load media library
        const savedMedia = localStorage.getItem('shaham_media');
        if (savedMedia) {
            mediaLibrary = JSON.parse(savedMedia);
        }
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Error loading content', 'error');
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
    publishBtn.addEventListener('click', publishChanges);
    
    // Preview button
    previewBtn.addEventListener('click', () => {
        previewModal.classList.add('active');
        document.getElementById('previewFrame').src = '../index.html?' + Date.now();
    });
}

// ===== Populate Editors =====
function populateEditors() {
    // Populate all inputs with data-path
    document.querySelectorAll('[data-path]').forEach(input => {
        const value = getNestedValue(content, input.dataset.path);
        if (value !== undefined) {
            input.value = value;
        }
    });
    
    // Populate features
    populateFeatures();
    
    // Populate stats
    populateStats();
    
    // Populate product categories
    populateCategories();
    
    // Populate about sections
    populateAboutSections();
    
    // Populate values
    populateValues();
    
    // Populate logo preview
    if (content.site?.logo) {
        document.getElementById('logo-preview').src = '../' + content.site.logo;
    }
    
    // Populate media library
    populateMediaGrid();
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
    return `
        <div class="editable-item">
            <div class="editable-item-header">
                <span class="editable-item-title">${escapeHtml(product.title)}</span>
                <div class="editable-item-actions">
                    <button class="item-action-btn delete" onclick="deleteProduct(${catIndex}, ${prodIndex})">🗑️</button>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group full-width">
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

// ===== Publish =====
async function publishChanges() {
    // Save to localStorage first
    saveToLocalStorage();
    
    // Generate and download the content.json file
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Content exported! Replace content.json with the downloaded file.', 'success');
    
    // Also generate updated HTML files info
    showPublishInstructions();
}

function showPublishInstructions() {
    const instructions = `
To publish your changes:

1. The content.json file has been downloaded
2. Replace the existing content.json in your website folder
3. If hosting on GitHub Pages, commit and push the changes
4. If using Netlify, redeploy or drag the folder again

Your website will automatically load content from the updated JSON file.
    `;
    alert(instructions);
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
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
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
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToLocalStorage();
    }
});

// ===== Warn on unsaved changes =====
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

