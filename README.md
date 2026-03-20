# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


BankApp - Secure SDK & Risk Engine Integration Demo

This project is a React-based Single Page Application (SPA) demonstrating the end-to-end integration lifecycle of a behavioral biometrics SDK (such as BioCatch) into a banking flow.

🚀 Key Implementation Features

1. Server-to-Server (S2S) API Orchestration

The application architecture simulates the critical S2S interactions between a Bank's backend and a Risk Engine (BioCatch):

INIT Trigger: Upon a successful user login, an /api/biocatch/init call is triggered. This links the anonymous behavioral session (CSID) collected by the SDK to the actual logged-in user identity.

GET_SCORE Trigger: Before processing a sensitive transaction (like transferring funds), the app calls /api/biocatch/getScore. The Risk Engine returns a score based on the user's behavior.

Simulation Logic: Entering an amount > $20,000 simulates a high-risk score (>800), triggering an explicit block ("DENY" action) and preventing the /api/transfer endpoint from being called.

2. SPA Context Management

SPA routing does not trigger browser page reloads. To prevent the SDK from losing tracking context, an active changeContext() hook is tied to the React Router state. This ensures the SDK remains context-aware across virtual page transitions.

3. Defensive Programming & Native Fetch

Safe SDK Wrapper: The app uses a wrapper to interact with the third-party SDK. It verifies the existence of SDK functions (typeof window.DummySDK.func === 'function') before invoking them. This ensures the banking app will not crash if the CDN is down, blocked by AdBlockers, or if the SDK version changes.

Native Fetch: The native fetch API is used instead of third-party libraries (like Axios) to mitigate supply chain risks and minimize bundle size.

4. DOM Element Tagging (data-bb)

Critical input fields and action buttons are explicitly tagged with the data-bb custom attribute (e.g., data-bb="transfer-amount"). This is a best practice for behavioral biometric tools, allowing the SDK to map interactions to specific business logic regardless of dynamic CSS class changes.

🛠️ How to Run

Clone the repository

Install dependencies:

npm install


Run the development server:

npm run dev


Open the Browser Console (F12) to observe the precise flow of Context changes, INIT triggers, and GET_SCORE responses.

(Demo Credentials: Username: admin, Password: 1234)
