// Template management module
import { database } from '../core/firebase.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

export let suggestions = [];

export async function loadTemplates() {
    try {
        const dbRef = ref(database, 'templates');
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
            let allTemplates = [];
            
            // Convert Firebase data to template format
            snapshot.forEach((childSnapshot) => {
                const templateData = childSnapshot.val();
                if (templateData && templateData.data) {
                    // Add each template from the data
                    allTemplates = allTemplates.concat(templateData.data);
                }
            });
            
            suggestions = allTemplates;
            console.log('✅ Templates loaded successfully from Firebase');
        } else {
            console.log('No templates found in Firebase');
            suggestions = [];
        }
    } catch (error) {
        console.error('Error loading templates from Firebase:', error);
        suggestions = [];
    }
}

// Template Suggestions Methods
export function showTemplateSuggestions(messageInput, templateSuggestionsContainer, createTemplateSuggestionsContainer, openTemplateQAModal) {
    const userInput = messageInput.value.trim().toLowerCase();
    
    // If no input, hide suggestions and return
    if (!userInput) {
        hideTemplateSuggestions(templateSuggestionsContainer);
        return;
    }
    
    // Create container if it doesn't exist
    if (!templateSuggestionsContainer) {
        templateSuggestionsContainer = createTemplateSuggestionsContainer();
    }
    
    // Clear previous suggestions
    templateSuggestionsContainer.innerHTML = '';
    
    // Only look for matching templates if there's input
    if (userInput) {
        // Find matching templates based on keywords
        const matchingTemplates = suggestions.filter(template => {
            if (!template.keywords) return false;
            const matches = template.keywords.some(keyword => userInput.includes(keyword));
            return matches;
        });
        
        // Add matching templates
        matchingTemplates.forEach(template => {
            const templateElement = document.createElement('div');
            templateElement.className = 'template-suggestion';
            templateElement.innerHTML = `
                <div class="template-icon">${template.icon}</div>
                <div class="template-info">
                    <div class="template-title">${template.title}</div>
                    <div class="template-description">${template.description}</div>
                </div>
            `;
            
            // Add click event to open template Q&A modal
            templateElement.addEventListener('click', () => {
                openTemplateQAModal(template);
            });
            
            templateSuggestionsContainer.appendChild(templateElement);
        });
    }
    
    // Show the container
    templateSuggestionsContainer.style.display = 'flex';
    
    return templateSuggestionsContainer;
}

export function hideTemplateSuggestions(templateSuggestionsContainer) {
    if (templateSuggestionsContainer) {
        templateSuggestionsContainer.style.display = 'none';
    }
}

export function createTemplateSuggestionsContainer() {
    // Create container if it doesn't exist
    const templateSuggestionsContainer = document.createElement('div');
    templateSuggestionsContainer.className = 'template-suggestions-container';
    templateSuggestionsContainer.id = 'template-suggestions-container';
    
    // Add container to the DOM
    const messageInputContainer = document.querySelector('.message-input-container');
    
    if (messageInputContainer) {
        messageInputContainer.style.position = 'relative';
        messageInputContainer.appendChild(templateSuggestionsContainer);
    } else {
        // Fallback to body if container not found
        document.body.appendChild(templateSuggestionsContainer);
    }
    
    return templateSuggestionsContainer;
}

export function openTemplateQAModal(template) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.template-qa-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'template-qa-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'template-qa-modal';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
        color: #333;
    `;
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #eee;
    `;
    
    modalHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 32px;">${template.icon}</div>
            <div>
                <h3 style="margin: 0; font-size: 20px;">${template.title}</h3>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">${template.description}</p>
            </div>
        </div>
        <button class="close-template-qa" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">&times;</button>
    `;
    
    modalContent.appendChild(modalHeader);
    
    // Create questions section
    const questionsSection = document.createElement('div');
    questionsSection.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 16px;
    `;
    
    // Add questions with text areas
    const answers = [];
    template.questions.forEach((question, index) => {
        const questionContainer = document.createElement('div');
        questionContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        const questionLabel = document.createElement('label');
        questionLabel.textContent = `${index + 1}. ${question}`;
        questionLabel.style.cssText = `
            font-weight: 500;
            color: #333;
        `;
        
        const answerInput = document.createElement('textarea');
        answerInput.className = 'qa-answer';
        answerInput.placeholder = 'Your answer...';
        answerInput.rows = 3;
        
        // Store question and answer for later use
        answers.push({
            question,
            answer: '',
            element: answerInput
        });
        
        // Update answer when input changes
        answerInput.addEventListener('input', () => {
            answers[index].answer = answerInput.value;
        });
        
        questionContainer.appendChild(questionLabel);
        questionContainer.appendChild(answerInput);
        questionsSection.appendChild(questionContainer);
    });
    
    modalContent.appendChild(questionsSection);
    
    // Create buttons section
    const buttonsSection = document.createElement('div');
    buttonsSection.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
    `;
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
        padding: 10px 16px;
        border: 1px solid #ddd;
        background: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        color: #666;
    `;
    
    // Generate button
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate';
    generateButton.style.cssText = `
        padding: 10px 16px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
    `;
    
    // Add event listeners to buttons
    cancelButton.addEventListener('click', () => {
        modalOverlay.remove();
    });
    
    generateButton.addEventListener('click', () => {
        const prompt = generatePromptFromTemplate(template, answers);
        if (prompt) {
            console.log('Generated Prompt:', prompt);
            modalOverlay.remove();
            // Dispatch event to populate the message input
            document.dispatchEvent(new CustomEvent('promptGenerated', { 
                detail: { 
                    prompt: prompt,
                    templateTitle: template.title[0]
                } 
            }));
        } else {
            console.log('Prompt not generated because no answers were provided.');
        }
    });

    // Close button event
    const closeButton = modalContent.querySelector('.close-template-qa');
    closeButton.addEventListener('click', () => {
        modalOverlay.remove();
    });
    
    buttonsSection.appendChild(cancelButton);
    buttonsSection.appendChild(generateButton);
    modalContent.appendChild(buttonsSection);
    
    // Add modal to DOM
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Focus first input
    setTimeout(() => {
        const firstInput = modalContent.querySelector('.qa-answer');
        if (firstInput) firstInput.focus();
    }, 100);
    
    return { modalOverlay, answers };
}

export function generatePromptFromTemplate(template, answers) {
    // Filter out empty answers
    const validAnswers = answers.filter(answer => answer && answer.answer);
    
    if (validAnswers.length === 0) {
        alert('Please answer at least one question to generate content.');
        return null;
    }
    
    // Create a structured prompt
    let prompt = `Create a ${Array.isArray(template.title) ? template.title[0].toLowerCase() : template.title.toLowerCase()} with the following requirements:\n\n`;
    
    // Add answers to the prompt
    validAnswers.forEach(answer => {
        prompt += `- ${answer.question}: ${answer.answer}\n`;
    });
    
    // Add a closing instruction
    prompt += `\nPlease make the presentation professional, well-structured, and tailored to my specific needs as described above.`;
    
    return prompt;
}

export async function processTextFiles(files) {
    console.log(`📄 Processing ${files.length} text file(s) for Gemini models...`);
    const fileContents = [];

    for (const file of files) {
        try {
            console.log(`📖 Processing file: ${file.name} (${formatFileSize(file.size)})`);

            const content = await readFileAsText(file);
            fileContents.push(`📄 ${file.name}:\n${content}\n`);

            console.log(`✅ Successfully processed ${file.name}, content length: ${content.length} characters`);
        } catch (error) {
            console.error(`❌ Error processing file ${file.name}:`, error);
            fileContents.push(`📄 ${file.name}: Error reading file content`);
        }
    }

    const combinedContent = fileContents.join('\n');
    console.log(`📋 Combined file content length: ${combinedContent.length} characters`);
    return combinedContent;
}

// Helper function to read file as text
async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (event) => reject(event.target.error);
        reader.readAsText(file);
    });
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}