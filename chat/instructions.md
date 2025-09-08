## Instructions to Run the Project

### 1. Set Up Firebase

- **Create a Firebase Project**: If you don't have one already, create a new project in the [Firebase Console](https://console.firebase.google.com/).
- **Enable Firebase Services**: In your new project, enable **Authentication**, **Realtime Database**, and **Remote Config**.
- **Get Firebase Configuration**: In your project settings, find your web app's Firebase configuration object. It will look something like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

- **Update `.env` file**: Open the `.env` file in the root of the project and replace the placeholder values with your Firebase configuration.

### 2. Configure API Keys in Remote Config

- **Cerebras API Key**: In the Firebase Console, go to **Remote Config** and add a new parameter with the following details:
  - **Parameter key**: `cerebras_api_key`
  - **Default value**: Your Cerebras API key
- **Cerebras API Endpoint**: Add another parameter for the Cerebras API endpoint:
  - **Parameter key**: `cerebras_endpoint`
  - **Default value**: `https://api.cerebras.net/ws/v1/workload/instruct/completion`
- **Gemini API Key**: Add a parameter for the Gemini API key:
  - **Parameter key**: `gemini_api_key`
  - **Default value**: Your Gemini API key

### 3. Run the Application

- **Open `index.html`**: After completing the setup, open the `index.html` file in your browser to run the application.