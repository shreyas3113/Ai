// Fusion Service Module
// Handles intelligent response fusion using Gemini 2.5 Flash

export class FusionService {
    constructor(geminiAPI) {
        this.geminiAPI = geminiAPI;
    }

    async generateFusedResponse(userMessage, botResponses, selectedBots, aiModels, grid, compareContainer, formatAnswer, messages, saveChatHistory) {
        try {
            // Check if Gemini API is configured
            if (!this.geminiAPI || !this.geminiAPI.isReady()) {
                console.warn('⚠️ Gemini API not configured, showing fallback response');
                this.showFallbackResponse(botResponses, grid, formatAnswer, 'Gemini API not configured. Showing individual responses.');
                return;
            }

            console.log('🔍 Starting fusion process...');
            console.log('📨 User message:', userMessage);
            console.log('🤖 Bot responses:', botResponses);
            console.log('🎯 Selected bots:', selectedBots);

            // Validate bot responses
            if (!botResponses || botResponses.length === 0) {
                throw new Error('No bot responses available for fusion');
            }

            // Filter out empty responses
            const validResponses = botResponses.filter(response => response && response.trim() !== '');
            if (validResponses.length === 0) {
                throw new Error('No valid responses available for fusion');
            }

            // Ensure at least 2 responses for fusion
            if (validResponses.length < 2) {
                throw new Error('Fusion requires at least 2 responses. Cannot fuse a single response.');
            }

            console.log('✅ Valid responses for fusion:', validResponses.length);

            // Create fusion prompt
            const fusionPrompt = this.createFusionPrompt(userMessage, validResponses, selectedBots, aiModels);

            // Show typing indicator for fusion
            const fusedDiv = this.createFusionUI();
            grid.appendChild(fusedDiv);

            // Generate fused response using Gemini 2.5 Flash
            console.log('🔄 Generating fused response with Gemini 2.5 Flash...');
            console.log('📝 Fusion prompt:', fusionPrompt);
            
            const fusedResult = await this.geminiAPI.generateResponse(fusionPrompt, {
                model: 'gemini-2.5-flash',
                temperature: 1.0,
                maxTokens: 13000  // Increased token limit for longer responses
            });

            console.log('🔍 Raw fused result from Gemini:', fusedResult);
            console.log('🔍 Fused result type:', typeof fusedResult);
            console.log('🔍 Fused result keys:', Object.keys(fusedResult || {}));

            // Process and display response
            const fusedText = this.extractFusedText(fusedResult);
            const formattedFusedResponse = formatAnswer(fusedText);
            
            // Update UI
            this.updateFusionUI(fusedDiv, formattedFusedResponse);
            this.addExpandFunctionality(fusedDiv, formattedFusedResponse);
            this.autoScroll(compareContainer);

            // Save to messages
            messages.push({
                content: fusedText,
                sender: 'ai',
                botId: 'gemini-2.5-flash-fused',
                timestamp: Date.now()
            });

            // Trigger chat history save after fusion completes
            if (saveChatHistory && typeof saveChatHistory === 'function') {
                saveChatHistory();
            }

        } catch (error) {
            console.error('❌ Error generating fused response:', error);
            
            // Check if it's a Gemini API configuration issue
            if (error.message.includes('not configured') || error.message.includes('API key')) {
                console.warn('⚠️ Gemini API not configured, showing fallback response');
                this.showFallbackResponse(botResponses, grid, formatAnswer, 'Gemini API not configured. Showing individual responses.');
            } else if (error.message.includes('Rate limit') || error.message.includes('Quota exceeded')) {
                console.warn('⚠️ Gemini API rate limit/quota exceeded, showing fallback response');
                this.showFallbackResponse(botResponses, grid, formatAnswer, 'Gemini API rate limit exceeded. Showing individual responses.');
            } else {
                console.error('❌ Unexpected error in fusion:', error);
                this.showFallbackResponse(botResponses, grid, formatAnswer, 'Fusion failed. Showing individual responses.');
            }
        }
    }

    createEnsembleButton(grid, userMessage, botResponses, selectedBots, aiModels, compareContainer, formatAnswer, messages, saveChatHistory) {
        const button = document.createElement('button');
        button.className = 'ensemble-button';
        button.innerHTML = '✨ Ensemble';
        button.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin: 20px auto;
            display: block;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        `;

        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
        });

        // Click handler
        button.addEventListener('click', async () => {
            // Show response selection modal
            this.showResponseSelectionModal(userMessage, botResponses, selectedBots, aiModels, grid, compareContainer, formatAnswer, messages, button, saveChatHistory);
        });

        grid.appendChild(button);
        return button;
    }

    showResponseSelectionModal(userMessage, botResponses, selectedBots, aiModels, grid, compareContainer, formatAnswer, messages, button, saveChatHistory) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'fusion-selection-modal-overlay';
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
        modalContent.className = 'fusion-selection-modal';
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        // Create response checkboxes
        const responseItems = [];
        const checkboxes = [];
        
        botResponses.forEach((response, index) => {
            const responseItem = document.createElement('div');
            responseItem.style.cssText = `
                margin: 12px 0;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                background: #f9f9f9;
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `response-${index}`;
            checkbox.style.marginRight = '12px';
            
            // Add data attribute to track the response index
            checkbox.setAttribute('data-response-index', index);
            
            // Start with checked state by default
            checkbox.checked = true;
            checkbox.setAttribute('checked', 'checked');
            
            // Add a custom data attribute to track state
            checkbox.setAttribute('data-selected', 'true');
            
            checkboxes.push(checkbox);

            const label = document.createElement('label');
            label.htmlFor = `response-${index}`;
            label.style.cssText = `
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 4px;
            `;

            const modelName = document.createElement('strong');
            modelName.textContent = aiModels[selectedBots[index]]?.name || `AI Model ${index + 1}`;
            modelName.style.color = '#333';

            const preview = document.createElement('span');
            preview.textContent = response.substring(0, 150) + (response.length > 150 ? '...' : '');
            preview.style.cssText = `
                color: #666;
                font-size: 14px;
                line-height: 1.4;
            `;

            label.appendChild(modelName);
            label.appendChild(preview);
            responseItem.appendChild(checkbox);
            responseItem.appendChild(label);
            responseItems.push(responseItem);
        });

        // Create modal HTML
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333; font-size: 20px;">Select Responses to Fuse</h3>
                <button class="close-modal-btn" style="
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
            </div>
            
            <div class="selection-info" style="
                background: #e3f2fd;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                border-left: 4px solid #2196f3;
            ">
                <div style="font-weight: 600; color: #1976d2; margin-bottom: 4px;">Selection Rules:</div>
                <div style="font-size: 14px; color: #555;">
                    • <strong>Minimum 2 responses required</strong> (fusion won't work with 1 response)<br>
                    • Maximum 3 responses allowed<br>
                    • All responses are pre-selected by default
                </div>
            </div>

            <div class="response-list" style="margin-bottom: 20px;">
                ${responseItems.map(item => item.outerHTML).join('')}
            </div>

            <div class="selection-count" style="
                text-align: center;
                margin-bottom: 20px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 6px;
                font-weight: 600;
                color: #333;
            ">
                Selected: ${botResponses.length}/${botResponses.length} responses
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="cancel-btn" style="
                    padding: 10px 20px;
                    border: 2px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Cancel</button>
                <button class="start-fusion-btn" style="
                    padding: 10px 20px;
                    border: none;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                " disabled>Start Fusion</button>
            </div>
        `;

        // Add event listeners
        const closeBtn = modalContent.querySelector('.close-modal-btn');
        const cancelBtn = modalContent.querySelector('.cancel-btn');
        const startFusionBtn = modalContent.querySelector('.start-fusion-btn');
        const selectionCount = modalContent.querySelector('.selection-count');

        // Update selection count and validate
        const updateSelection = () => {
            // Get DOM state as the source of truth (what user actually sees)
            const domCheckboxes = modalContent.querySelectorAll('input[type="checkbox"]');
            let selectedCount = 0;
            
            console.log('🔍 Checking DOM checkboxes...');
            domCheckboxes.forEach((cb, i) => {
                const isChecked = cb.checked === true;
                if (isChecked) {
                    selectedCount++;
                    console.log(`✅ Checkbox ${i}: CHECKED`);
                } else {
                    console.log(`❌ Checkbox ${i}: UNCHECKED`);
                }
            });
            
            // Update the selection count display
            selectionCount.textContent = `Selected: ${selectedCount}/${botResponses.length} responses`;
            
            console.log('🔍 Final count:', selectedCount, 'responses selected');
            console.log('🔍 DOM checkboxes found:', domCheckboxes.length);
            
            // Button logic
            if (selectedCount >= 2 && selectedCount <= 3) {
                startFusionBtn.disabled = false;
                startFusionBtn.style.opacity = '1';
                startFusionBtn.style.cursor = 'pointer';
                console.log('✅ Button ENABLED');
            } else {
                startFusionBtn.disabled = true;
                startFusionBtn.style.opacity = '0.5';
                startFusionBtn.style.cursor = 'not-allowed';
                console.log('❌ Button DISABLED');
            }
        };

        // Add checkbox event listeners AFTER modal is added to DOM
        setTimeout(() => {
            console.log('🔧 Adding event listeners after DOM is ready...');
            
            // Re-get checkboxes from DOM to ensure they're properly attached
            const domCheckboxes = modalContent.querySelectorAll('input[type="checkbox"]');
            console.log('🔧 Found', domCheckboxes.length, 'checkboxes in DOM');
            
            domCheckboxes.forEach((checkbox, index) => {
                console.log(`🔧 Adding event listeners to DOM checkbox ${index}`);
                
                // Add change event listener
                checkbox.addEventListener('change', (e) => {
                    console.log(`🔘 DOM Checkbox ${index} CHANGE event: ${e.target.checked}`);
                    updateSelection();
                });
                
                // Add click event listener
                checkbox.addEventListener('click', (e) => {
                    console.log(`🔘 DOM Checkbox ${index} CLICK event: ${e.target.checked}`);
                    // Force update after click
                    setTimeout(() => {
                        console.log(`🔘 DOM Checkbox ${index} after click delay: ${e.target.checked}`);
                        updateSelection();
                    }, 50);
                });
                
                // Add input event listener as additional backup
                checkbox.addEventListener('input', (e) => {
                    console.log(`🔘 DOM Checkbox ${index} INPUT event: ${e.target.checked}`);
                    updateSelection();
                });
                
                // Add mousedown event listener as another backup
                checkbox.addEventListener('mousedown', (e) => {
                    console.log(`🔘 DOM Checkbox ${index} MOUSEDOWN event`);
                });
                
                // Add mouseup event listener as another backup
                checkbox.addEventListener('mouseup', (e) => {
                    console.log(`🔘 DOM Checkbox ${index} MOUSEUP event: ${e.target.checked}`);
                    setTimeout(() => {
                        updateSelection();
                    }, 10);
                });
            });
        }, 100); // Wait 100ms for DOM to be ready

        // Close modal handlers
        const closeModal = () => {
            document.body.removeChild(modalOverlay);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // Start fusion handler
        startFusionBtn.addEventListener('click', async (e) => {
            // Prevent click if button is disabled
            if (startFusionBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                alert('❌ Please select 2 or 3 responses before starting fusion.');
                return;
            }

            // Use DOM state for validation (what user actually sees)
            const currentCheckboxes = modalContent.querySelectorAll('input[type="checkbox"]');
            const currentSelectedCount = Array.from(currentCheckboxes).filter(cb => cb.checked).length;
            
            console.log('🔍 Click validation - Current selected count:', currentSelectedCount);
            
            if (currentSelectedCount < 2) {
                e.preventDefault();
                e.stopPropagation();
                alert('❌ Invalid selection. Please select 2 or 3 responses before starting fusion.');
                return;
            }

            // Get selected indices from DOM state (what user actually sees)
            const domCheckboxes = modalContent.querySelectorAll('input[type="checkbox"]');
            const selectedIndices = Array.from(domCheckboxes)
                .map((cb, index) => cb.checked ? index : -1)
                .filter(index => index !== -1);

            console.log('🔍 Fusion attempt - Selected indices:', selectedIndices);
            console.log('🔍 Fusion attempt - Selected count:', selectedIndices.length);

            if (selectedIndices.length < 2) {
                alert('❌ Fusion requires at least 2 responses. Please select 2 or 3 responses to fuse.');
                return;
            }

            if (selectedIndices.length > 3) {
                alert('❌ Maximum 3 responses allowed for fusion. Please select only 2 or 3 responses.');
                return;
            }

            // Close modal
            closeModal();

            // Disable button and show loading state
            button.disabled = true;
            button.innerHTML = '🔄 Fusing...';
            button.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
            button.style.cursor = 'not-allowed';

            try {
                // Filter responses based on selection
                const selectedResponses = selectedIndices.map(index => botResponses[index]);
                const selectedBotIds = selectedIndices.map(index => selectedBots[index]);

                // Final validation - ensure we have at least 2 responses
                if (selectedResponses.length < 2) {
                    throw new Error('Cannot fuse less than 2 responses. Please select 2 or 3 responses.');
                }

                console.log('🚀 Starting fusion with', selectedResponses.length, 'responses');

                // Start fusion process with selected responses
                await this.generateFusedResponse(userMessage, selectedResponses, selectedBotIds, aiModels, grid, compareContainer, formatAnswer, messages, saveChatHistory);
                
                // Hide button after successful fusion
                button.style.display = 'none';
            } catch (error) {
                console.error('❌ Fusion failed:', error);
                // Reset button state on error
                button.disabled = false;
                button.innerHTML = '✨ Ensemble';
                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
                button.style.cursor = 'pointer';
            }
        });

        // Add modal to page
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        
        // Add mutation observer to detect checkbox changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
                    console.log('🔍 Mutation detected: checkbox attribute changed');
                    updateSelection();
                }
            });
        });
        
        // Observe all checkboxes for changes
        checkboxes.forEach(checkbox => {
            observer.observe(checkbox, {
                attributes: true,
                attributeFilter: ['checked']
            });
        });

        // Initial validation - run immediately and after DOM is ready
        setTimeout(() => {
            console.log('🔄 Initial validation (50ms)...');
            updateSelection(); // Run after DOM is fully ready
        }, 50);
        
        // Also run validation after a longer delay to ensure all elements are properly initialized
        setTimeout(() => {
            console.log('🔄 Secondary validation (200ms)...');
            updateSelection(); // Run again after DOM is fully ready
        }, 200);
        

        
        // Add polling mechanism as backup to detect checkbox changes
        setTimeout(() => {
            let lastCheckboxStates = [true, true, true]; // Start with all checked
            
            setInterval(() => {
                const domCheckboxes = modalContent.querySelectorAll('input[type="checkbox"]');
                const currentStates = Array.from(domCheckboxes).map(cb => cb.checked);
                const hasChanged = currentStates.some((state, index) => state !== lastCheckboxStates[index]);
                
                if (hasChanged) {
                    console.log('🔄 Polling detected checkbox state change');
                    console.log('Previous states:', lastCheckboxStates);
                    console.log('Current states:', currentStates);
                    lastCheckboxStates = [...currentStates];
                    updateSelection();
                }
            }, 100); // Check every 100ms
        }, 200); // Start polling after DOM is ready
        
        // Log initial checkbox states
        setTimeout(() => {
            console.log('🔄 Logging initial checkbox states...');
            checkboxes.forEach((cb, index) => {
                console.log(`🔍 Checkbox ${index} (${cb.id}): checked=${cb.checked}, hasAttribute('checked')=${cb.hasAttribute('checked')}`);
            });
        }, 500);
    }

    createFusionPrompt(userMessage, validResponses, selectedBots, aiModels) {
        return `You are an expert AI synthesizer tasked with creating the most comprehensive and accurate response possible. Here are responses from ${validResponses.length} different AI models about: "${userMessage}"

${validResponses.map((response, index) =>
    `**Model ${index + 1} (${aiModels[selectedBots[index]]?.name || `AI Model ${index + 1}`}):**
${response}`
).join('\n\n---\n\n')}

## Your Task:
Create a single, superior response that combines the best elements from all models above. Follow these guidelines:

### Content Integration:
- **Merge complementary information**: Combine unique insights and details from each response
- **Resolve contradictions**: When models disagree, prioritize the most accurate or well-supported information
- **Eliminate redundancy**: Remove repetitive content while preserving all valuable points
- **Enhance completeness**: Fill any gaps by drawing from the collective knowledge

### Quality Standards:
- **Accuracy first**: Prioritize factual correctness over eloquence
- **Comprehensive coverage**: Address all aspects of the original question
- **Logical flow**: Organize information in a clear, coherent structure
- **Natural language**: Write in a conversational, engaging tone

### Formatting Guidelines:
- Use clear headings and bullet points when appropriate
- Include relevant examples or analogies if present in the source responses
- Maintain any code snippets, formulas, or technical details accurately
- Preserve important nuances and caveats mentioned by any model

### Output Requirements:
- Be more comprehensive than any individual response
- Maintain objectivity and avoid bias toward any particular model
- Include the most relevant and useful information for the user
- End with a clear, actionable conclusion when appropriate

**Create your synthesized response now:**`;
    }

    createFusionUI() {
        const fusedDiv = document.createElement('div');
        fusedDiv.className = 'compare-response compare-response-fused';
        fusedDiv.style.background = '#f0f8ff';
        fusedDiv.style.border = '2px solid #4CAF50';
        fusedDiv.style.marginTop = '1em';
        fusedDiv.style.padding = '1em';
        fusedDiv.innerHTML = `
            <div class="compare-response-header">
                <div class="compare-response-icon">✨</div>
                <div class="compare-response-name">
                    <span class="bot-name-text">Gemini 2.5 Flash - Fused Response</span>
                    <button class="compare-popout-btn" title="Expand this response"> Expand</button>
                </div>
            </div>
            <div class="compare-response-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        return fusedDiv;
    }

    extractFusedText(fusedResult) {
        console.log('✅ Fused result received:', fusedResult);
        console.log('📄 Fused result structure:', JSON.stringify(fusedResult, null, 2));
        
        // Check different possible response structures
        let fusedText = '';
        
        // Check for the actual Gemini API response structure
        if (fusedResult && typeof fusedResult === 'object') {
            if (fusedResult.text) {
                fusedText = fusedResult.text;
            } else if (fusedResult.response && fusedResult.response.text) {
                fusedText = fusedResult.response.text;
            } else if (fusedResult.candidates && fusedResult.candidates[0] && fusedResult.candidates[0].content) {
                fusedText = fusedResult.candidates[0].content.parts[0].text;
            } else if (fusedResult.content && fusedResult.content.parts && fusedResult.content.parts[0]) {
                fusedText = fusedResult.content.parts[0].text;
            } else {
                console.error('❌ Unexpected response structure:', fusedResult);
                throw new Error('Unexpected Gemini API response structure');
            }
        } else if (typeof fusedResult === 'string') {
            fusedText = fusedResult;
        } else {
            console.error('❌ Invalid response type:', typeof fusedResult, fusedResult);
            throw new Error('Invalid response type from Gemini API');
        }
        
        console.log('📄 Extracted fused text:', fusedText);

        // Ensure we have content to display
        if (!fusedText || fusedText.trim() === '') {
            throw new Error('Gemini API returned empty response');
        }
        
        return fusedText;
    }

    updateFusionUI(fusedDiv, formattedFusedResponse) {
        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const timestampHtml = `<div class="compare-response-time" style="color: green; font-weight: bold; margin-top: 1rem; text-align: left;">${currentTime}</div>`;

        fusedDiv.querySelector('.compare-response-content').innerHTML = formattedFusedResponse + timestampHtml;
        console.log('📱 Content set in DOM:', fusedDiv.querySelector('.compare-response-content').innerHTML);

        // Highlight code blocks if highlight.js is available
        if (window.hljs) {
            fusedDiv.querySelectorAll('.compare-response-content pre code').forEach((block) => {
                window.hljs.highlightElement(block);
            });
        }
    }

    addExpandFunctionality(fusedDiv, formattedFusedResponse) {
        const fusedPopoutBtn = fusedDiv.querySelector('.compare-popout-btn');
        fusedPopoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modal = document.getElementById('comparePopoutModal');
            const contentArea = document.getElementById('comparePopoutContentArea');
            if (modal && contentArea) {
                contentArea.innerHTML = `
                    <div class="compare-popout-header" style="display:flex;align-items:center;gap:0.7em;margin-bottom:1em;">
                        <span class="compare-popout-icon" style="font-size:2rem;">✨</span>
                        <span class="compare-popout-name" style="font-weight:600;font-size:1.2rem;">Gemini 2.5 Flash - Fused Response</span>
                    </div>
                    <div class='compare-response-content'>${formattedFusedResponse}</div>
                `;
                // Highlight code blocks in modal
                if (window.hljs) {
                    contentArea.querySelectorAll('.compare-response-content pre code').forEach((block) => {
                        window.hljs.highlightElement(block);
                    });
                }
                modal.classList.add('active');
            }
        });
    }

    autoScroll(compareContainer) {
        if (compareContainer) {
            compareContainer.scrollTop = compareContainer.scrollHeight;
        }
    }

    showFallbackResponse(botResponses, grid, formatAnswer, message = 'Fusion failed. Showing individual responses.') {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'compare-response compare-response-fallback';
        fallbackDiv.style.background = '#fff3cd';
        fallbackDiv.style.border = '2px solid #ffc107';
        fallbackDiv.style.marginTop = '1em';
        fallbackDiv.style.padding = '1em';
        fallbackDiv.innerHTML = `
            <div class="compare-response-header">
                <strong>Combined Response (Fallback)</strong>
                <button class="compare-popout-btn" title="Expand this response"> Expand</button>
            </div>
            <div class="compare-response-content">
                ${botResponses.map(r => formatAnswer(r)).join('<hr style="margin:1em 0;">')}
                <div style="color: #856404; margin-top: 1rem; font-style: italic;">
                    ${message}
                </div>
            </div>
        `;
        grid.appendChild(fallbackDiv);
    }
} 