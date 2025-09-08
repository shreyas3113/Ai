import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

// Initialize Firebase with config
const firebaseConfig = {
    apiKey: "AIzaSyDy7fz3i5qVNDgAaAj7E4RvGpjJbglixMA",
    authDomain: "prudenceai-4046f.firebaseapp.com",
    databaseURL: "https://prudenceai-4046f-default-rtdb.firebaseio.com",
    projectId: "prudenceai-4046f",
    storageBucket: "prudenceai-4046f.appspot.com",
    messagingSenderId: "896774332544",
    appId: "1:896774332544:web:eaf6d39a7d0a24e5cf0665"
};

// Initialize Firebase
initializeApp(firebaseConfig);

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.admin-sidebar nav ul li a');
    const sections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(nav => nav.classList.remove('active'));
            // Add active class to the clicked link
            this.classList.add('active');

            // Remove active class from all sections
            sections.forEach(section => section.classList.remove('active'));

            // Add active class to the target section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            targetSection.classList.add('active');

            // If the user management section is active, display users
            if (targetId === 'user-management') {
                displayUsers();
            }
         });
    });

    // Initially show the first section or a default one
    if (navLinks.length > 0) {
        navLinks[0].click();
    }

    // Handle logout button click
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // In a real application, you would clear session data here
            // For this example, we'll just redirect to the login page
            window.location.href = 'index.html';
        });
    }

    const templateForm = document.getElementById('template-form');
    const descriptionTextarea = document.getElementById('template-description');
    const descriptionCharCount = document.getElementById('description-char-count');

    if (descriptionTextarea && descriptionCharCount) {
        descriptionTextarea.addEventListener('input', () => {
            const currentLength = descriptionTextarea.value.length;
            descriptionCharCount.textContent = `${currentLength}/1000`;
        });
    }
    const addTemplateBtn = document.getElementById('add-template-btn');

    if (addTemplateBtn) {
        addTemplateBtn.addEventListener('click', () => {
            // Clear the form for new template
            templateForm.reset();
            // Remove any existing editing index
            delete templateForm.dataset.editingIndex;
            // Show the form
            templateForm.style.display = 'block';
        });
    }

    // Global array to store templates
    window.templates = [];

    // Function to load templates from Firebase Realtime Database
    async function loadInitialTemplates() {
        try {
            const db = getDatabase();
            const templatesRef = ref(db, 'templates');
            const snapshot = await get(templatesRef);
            
            if (snapshot.exists()) {
                const templatesData = snapshot.val();
                console.log('Raw data from Firebase:', templatesData);
                
                // Convert the object of templates to an array, storing the Firebase key
                window.templates = Object.entries(templatesData).map(([key, value]) => {
                    console.log(`Processing template ${key}:`, value);
                    
                    // Get title from all possible locations in the template structure
                    let templateTitle = 'Untitled Template';
                    
                    // Check all possible locations for the title
                    if (value.data && value.data.title && value.data.title[0]) {
                        templateTitle = value.data.title[0];
                    } else if (value.data && value.data.title) {
                        templateTitle = value.data.title;
                    } else if (value.title && Array.isArray(value.title) && value.title[0]) {
                        templateTitle = value.title[0];
                    } else if (value.title) {
                        templateTitle = value.title;
                    } else if (typeof value === 'object' && value.content) {
                        try {
                            const content = JSON.parse(value.content);
                            if (content.title) {
                                templateTitle = Array.isArray(content.title) ? content.title[0] : content.title;
                            }
                        } catch (e) {
                            console.warn('Could not parse template content for', key);
                        }
                    }
                    
                    console.log(`Title for template ${key}:`, templateTitle);
                    
                    return {
                        key: key, // Store the Firebase key
                        ...value,
                        title: templateTitle
                    };
                });
                console.log('Processed templates:', window.templates);
            } else {
                console.log('No templates found in Firebase');
                window.templates = [];
            }
        } catch (error) {
            console.error('Error loading templates from Firebase:', error);
            window.templates = [];
        }
        displayTemplates(); // Display templates after initial load
    }

    // Function to display templates
    function displayTemplates() {
        const templateTableBody = document.querySelector('#template-list tbody');
        if (!templateTableBody) return;

        templateTableBody.innerHTML = ''; // Clear existing templates

        if (!window.templates || window.templates.length === 0) {
            templateTableBody.innerHTML = '<tr><td colspan="2">No templates found.</td></tr>';
            return;
        }

        window.templates.forEach((template, index) => {
            const row = templateTableBody.insertRow();
            console.log('Rendering template:', template);
            
            // Get the title from all possible locations
            let displayTitle;
            if (template.data?.title) {
                displayTitle = Array.isArray(template.data.title) ? template.data.title[0] : template.data.title;
            } else if (template.title) {
                displayTitle = Array.isArray(template.title) ? template.title[0] : template.title;
            } else if (template.content) {
                try {
                    const content = JSON.parse(template.content);
                    displayTitle = content.title;
                    if (Array.isArray(displayTitle)) {
                        displayTitle = displayTitle[0];
                    }
                } catch (e) {
                    console.warn('Could not parse template content');
                }
            }

            row.innerHTML = `
                <td>${displayTitle || 'Untitled Template'}</td>
                <td>
                    <button class="update-template-btn" data-index="${index}">Update</button>
                    <button class="delete-template-btn" data-index="${index}">Delete</button>
                </td>
            `;
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-template-btn').forEach(button => {
            button.addEventListener('click', function() {
                const indexToDelete = this.dataset.index;
                deleteTemplate(indexToDelete);
            });
        });

        document.querySelectorAll('.update-template-btn').forEach(button => {
            button.addEventListener('click', function() {
                const indexToUpdate = this.dataset.index;
                editTemplate(indexToUpdate);
            });
        });
    }

    // Function to edit a template
    function editTemplate(index) {
        const template = window.templates[index];
        if (!template) {
            console.error('Template not found for index:', index);
            return;
        }

        const templateData = template.data || template;

        document.getElementById('template-title').value = Array.isArray(templateData.title) ? templateData.title[0] : templateData.title;
        document.getElementById('template-description').value = Array.isArray(templateData.description) ? templateData.description[0] : templateData.description;
        if (descriptionTextarea && descriptionCharCount) {
            descriptionCharCount.textContent = `${(Array.isArray(templateData.description) ? templateData.description[0] : templateData.description).length}/1000`;
        }
        currentKeywords = Array.isArray(templateData.keywords) ? templateData.keywords : (templateData.keywords ? [templateData.keywords] : []);
        renderKeywords();
        updateHiddenKeywords();
        currentQuestions = Array.isArray(templateData.questions) ? templateData.questions : (templateData.questions ? [templateData.questions] : []);
        renderQuestions();
        updateHiddenQuestions();

        templateForm.style.display = 'block';
        // Store the index of the template being edited for later saving
        templateForm.dataset.editingIndex = index;
    }

    // Function to delete a template
    async function deleteTemplate(index) {
        const template = window.templates[index];
        if (!template) return;

        if (confirm('Are you sure you want to delete this template? This cannot be undone.')) {
            try {
                const db = getDatabase();
                const templateKey = template.key; // Use the stored Firebase key
                
                console.log('Deleting template from Firebase path:', `templates/${templateKey}`);
                await remove(ref(db, `templates/${templateKey}`));
                console.log('Firebase delete completed');
                
                // Remove from local array
                window.templates.splice(index, 1);
                // Refresh the display
                displayTemplates();
                alert('Template deleted successfully from Firebase!');
            } catch (error) {
                console.error('Error deleting template:', error);
                alert('Error deleting template: ' + error.message);
            }
        }
    }

    // Function to save template changes
    async function saveTemplateChanges(formData) {
        try {
            console.log('Starting template save...');
            const db = getDatabase();
            
            // Get keywords and questions arrays
            const keywords = formData.get('template-keywords')
                .split(',')
                .filter(k => k.trim())
                .map(k => k.trim());
            
            const questions = formData.get('template-questions')
                .split(',')
                .filter(q => q.trim())
                .map(q => q.trim());

            // Prepare the template data
            const templateData = {
                title: [formData.get('template-title').trim()],
                description: [formData.get('template-description').trim()],
                keywords: keywords,
                questions: questions,
                icon: "📄"
            };

            let templateKey;
            const editingIndex = parseInt(templateForm.dataset.editingIndex);
            
            if (!isNaN(editingIndex)) {
                // Updating existing template
                const template = window.templates[editingIndex];
                templateKey = template.key; // Use the stored Firebase key
                templateData.icon = template.data?.icon || "📄";
            } else {
                // Creating new template
                // Get all templates from Firebase to find the highest number
                const templatesSnapshot = await get(ref(db, 'templates'));
                const existingTemplates = templatesSnapshot.val() || {};
                
                // Find the highest template number
                const templateNumbers = Object.keys(existingTemplates)
                    .map(key => {
                        const match = key.match(/template(\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    });
                
                const nextNumber = templateNumbers.length > 0 ? 
                    Math.max(...templateNumbers) + 1 : 11;  // Start from template11
                
                templateKey = `template${nextNumber}`;
            }

            console.log('Saving to Firebase path:', `templates/${templateKey}/data`);
            console.log('Template data to save:', templateData);

            // Save to Firebase
            await set(ref(db, `templates/${templateKey}/data`), templateData);
            console.log('Firebase save completed');
            
            // Update local data
            if (!isNaN(editingIndex)) {
                // Update existing template in the array
                window.templates[editingIndex].data = templateData;
            } else {
                // Add new template to the array
                window.templates.push({ key: templateKey, data: templateData }); // Store the new key
            }
            
            // Refresh display
            displayTemplates();
            
            // Hide and reset the form
            templateForm.style.display = 'none';
            templateForm.reset(); // Clear form fields
            delete templateForm.dataset.editingIndex; // Clear editing state

            alert(isNaN(editingIndex) ? 'New template saved to Firebase!' : 'Template updated successfully in Firebase!');
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Error saving template: ' + error.message);
        }
    }

    // Add form submit handler
    templateForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        await saveTemplateChanges(formData);
    });

    // Initial display of templates when the page loads
    loadInitialTemplates();

    const keywordsContainer = document.getElementById('keywords-container');
    const keywordInput = document.getElementById('keyword-input');
    const hiddenKeywordsInput = document.getElementById('template-keywords');

    let currentKeywords = [];

    function renderKeywords() {
        keywordsContainer.querySelectorAll('.keyword-tag').forEach(tag => tag.remove());
        currentKeywords.forEach(keyword => {
            const tag = document.createElement('span');
            tag.classList.add('keyword-tag');
            tag.textContent = keyword;
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('remove-keyword');
            removeBtn.textContent = 'x';
            removeBtn.addEventListener('click', () => {
                currentKeywords = currentKeywords.filter(k => k !== keyword);
                updateHiddenKeywords();
                renderKeywords();
            });
            tag.appendChild(removeBtn);
            keywordsContainer.insertBefore(tag, keywordInput);
        });
    }

    function updateHiddenKeywords() {
        hiddenKeywordsInput.value = currentKeywords.join(',');
    }

    if (keywordInput) {
        keywordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && keywordInput.value.trim() !== '') {
                e.preventDefault();
                const newKeyword = keywordInput.value.trim();
                if (!currentKeywords.includes(newKeyword)) {
                    if (currentKeywords.length < 5) {
                        currentKeywords.push(newKeyword);
                        updateHiddenKeywords();
                        renderKeywords();
                        keywordInput.value = '';
                    } else {
                        alert('You can add a maximum of 5 keywords.');
                    }
                } else {
                    alert('This keyword already exists.');
                }
            }
        });
    }

    const questionsContainer = document.getElementById('questions-container');
    const questionInput = document.getElementById('question-input');
    const hiddenQuestionsInput = document.getElementById('template-questions');

    let currentQuestions = [];

    function renderQuestions() {
        questionsContainer.querySelectorAll('.question-tag').forEach(tag => tag.remove());
        currentQuestions.forEach(question => {
            const tag = document.createElement('span');
            tag.classList.add('question-tag');
            tag.textContent = question;
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('remove-question');
            removeBtn.textContent = 'x';
            removeBtn.addEventListener('click', () => {
                currentQuestions = currentQuestions.filter(q => q !== question);
                updateHiddenQuestions();
                renderQuestions();
            });
            tag.appendChild(removeBtn);
            questionsContainer.insertBefore(tag, questionInput);
        });
    }

    function updateHiddenQuestions() {
        hiddenQuestionsInput.value = currentQuestions.join('\n');
    }

    if (questionInput) {
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && questionInput.value.trim() !== '') {
                e.preventDefault();
                const newQuestion = questionInput.value.trim();
                if (!currentQuestions.includes(newQuestion)) {
                    if (currentQuestions.length < 5) {
                        currentQuestions.push(newQuestion);
                        updateHiddenQuestions();
                        renderQuestions();
                        questionInput.value = '';
                    } else {
                        alert('You can add a maximum of 5 questions.');
                    }
                } else {
                    alert('This question already exists.');
                }
            }
        });
    }




    // Function to display users
    function displayUsers() {
        const userTableBody = document.querySelector('#user-list tbody');
        if (!userTableBody) return;

        userTableBody.innerHTML = ''; // Clear existing users
        let users = JSON.parse(localStorage.getItem('users')) || [];

        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            return;
        }

        users.forEach((user, index) => {
            const row = userTableBody.insertRow();
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button class="update-user-btn" data-index="${index}">Update</button>
                    <button class="delete-user-btn" data-index="${index}">Delete</button>
                </td>
            `;
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const indexToDelete = this.dataset.index;
                deleteUser(indexToDelete);
            });
        });

        document.querySelectorAll('.update-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const indexToUpdate = this.dataset.index;
                editUser(indexToUpdate);
            });
        });
    }

    // Function to edit a user
    function editUser(index) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const userToEdit = users[index];

        if (userToEdit) {
            document.getElementById('username').value = userToEdit.username;
            document.getElementById('email').value = userToEdit.email;
            document.getElementById('role').value = userToEdit.role;

            // Store the index of the user being edited
            userForm.dataset.editIndex = index;
            document.getElementById('user-form-submit-btn').textContent = 'Update User';
            document.getElementById('user-form-heading').textContent = 'Update User';
        }
    }

    // Function to delete a user
    function deleteUser(index) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        users.splice(index, 1);
        localStorage.setItem('users', JSON.stringify(users));
        displayUsers(); // Refresh the list
    }

    // Function to reset the user form
    function resetUserForm() {
        userForm.reset();
        userForm.dataset.editIndex = ''; // Clear edit index
        document.getElementById('user-form-submit-btn').textContent = 'Add User';
        document.getElementById('user-form-heading').textContent = 'Add New User';
    }

    // Initial display of users when the page loads
    displayUsers();

    const userForm = document.getElementById('user-form');
    if (userForm) {
        // Ensure the form is reset when the user management section is displayed
        resetUserForm();
        userForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const role = document.getElementById('role').value;

            let users = JSON.parse(localStorage.getItem('users')) || [];
            const editIndex = userForm.dataset.editIndex;

            if (editIndex !== undefined && editIndex !== '') {
                // Update existing user
                users[editIndex] = { username, email, role };
                alert('User updated successfully!');
            } else {
                // Add new user
                users.push({ username, email, role });
                alert('User added successfully!');
            }

            localStorage.setItem('users', JSON.stringify(users));
            displayUsers(); // Refresh the user list
            resetUserForm(); // Call the new reset function
        });
    }


});