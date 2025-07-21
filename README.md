# X Flow - Workflow Orchestration Platform

X Flow is a low-code workflow orchestration platform designed to simplify the creation and execution of complex workflows through a user-friendly interface. The platform empowers users to upload structured specifications that are visually rendered and executed using predefined functions, orchestrated by Temporal.

## System Architecture

### Frontend (React Flow + Next.js)
- Built using React Flow within a Next.js framework
- Visualization of workflows as directed graphs
- Upload structured workflow specifications (JSON)
- Real-time execution status updates per stage

### Backend & Middleware
- Next.js API routes for workflow management
- Validates and processes workflow specifications
- Integrates with Temporal for workflow orchestration
- Predefined, whitelisted functions for security

### Temporal Orchestration
- Dockerized Temporal setup for development
- Each workflow stage maps to a Temporal Activity
- Robust workflow execution with dependency management
- Built-in retry logic and error handling

## Key Features

- **Spec-based Workflow Generation**: Upload JSON specifications using a defined schema
- **Restricted Function Usage**: Only approved functions can be invoked from specifications
- **Visual Workflow UI**: Automatically generated React Flow diagrams
- **Real-time Updates**: Live status updates for each workflow stage
- **Dependency Management**: Support for stage dependencies and parallel execution

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd xflow-poc
npm install
\`\`\`

### 2. Start Temporal Services

\`\`\`bash
# Start Temporal server and PostgreSQL
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
# Check Temporal Web UI at http://localhost:8233
\`\`\`

### 3. Configure Environment

\`\`\`bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# For development, you can use the defaults
\`\`\`

### 4. Start the Application

\`\`\`bash
# Terminal 1: Start the Temporal worker
npm run temporal:dev

# Terminal 2: Start the Next.js development server
npm run dev
\`\`\`

### 5. Access the Application

- **X Flow UI**: http://localhost:3000
- **Temporal Web UI**: http://localhost:8233

## Usage

### 1. Upload a Workflow Specification

Use the example specification or create your own:

\`\`\`json
{
  "workflowName": "User Onboarding",
  "description": "Complete user onboarding process",
  "stages": [
    {
      "id": "validate-input",
      "function": "validateUserInput",
      "params": {
        "fields": ["email", "name"],
        "data": {
          "email": "user@example.com",
          "name": "John Doe"
        }
      }
    },
    {
      "id": "create-account",
      "function": "createUserAccount",
      "params": {
        "email": "user@example.com",
        "name": "John Doe",
        "role": "user"
      },
      "dependsOn": ["validate-input"]
    },
    {
      "id": "send-welcome-email",
      "function": "sendEmailNotification",
      "params": {
        "email": "user@example.com",
        "subject": "Welcome to X Flow!",
        "content": "Your account has been created successfully."
      },
      "dependsOn": ["create-account"]
    }
  ]
}
\`\`\`

### 2. Execute the Workflow

1. Upload your specification via drag-and-drop or copy-paste
2. Click "Execute Workflow" once validation passes
3. Watch real-time progress in the visualization panel
4. Monitor detailed logs in the Temporal Web UI

## Available Functions

The system includes these predefined functions:

- **validateUserInput**: Validate required fields and formats
- **sendEmailNotification**: Send emails via SendGrid (or mock)
- **createUserAccount**: Create user accounts (simulated)
- **logEvent**: Log events with different levels
- **delay**: Add delays to workflows
- **httpRequest**: Make HTTP requests to external APIs

## Workflow Specification Schema

### Required Fields

- `workflowName`: String name for the workflow
- `stages`: Array of workflow stages

### Optional Fields

- `description`: Workflow description

### Stage Schema

- `id`: Unique identifier for the stage
- `function`: One of the predefined function names
- `params`: Object with function-specific parameters
- `dependsOn`: Optional array of stage IDs this stage depends on

### Example with Dependencies

\`\`\`json
{
  "workflowName": "Complex Workflow",
  "stages": [
    {
      "id": "stage1",
      "function": "logEvent",
      "params": { "event": "workflow_started" }
    },
    {
      "id": "stage2",
      "function": "validateUserInput",
      "params": { "fields": ["email"] },
      "dependsOn": ["stage1"]
    },
    {
      "id": "stage3a",
      "function": "createUserAccount",
      "params": { "email": "user@example.com" },
      "dependsOn": ["stage2"]
    },
    {
      "id": "stage3b",
      "function": "logEvent",
      "params": { "event": "validation_complete" },
      "dependsOn": ["stage2"]
    },
    {
      "id": "stage4",
      "function": "sendEmailNotification",
      "params": { "email": "user@example.com" },
      "dependsOn": ["stage3a", "stage3b"]
    }
  ]
}
\`\`\`

## Development

### Project Structure

\`\`\`
xflow-poc/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── pages/api/          # API routes
│   ├── temporal/           # Temporal workflows and activities
│   └── types/              # TypeScript type definitions
├── docker-compose.yml      # Temporal setup
└── package.json
\`\`\`

### Adding New Functions

1. Add the function name to `PredefinedFunctions` enum in `src/types/workflow.ts`
2. Implement the function in `src/temporal/activities.ts`
3. Update the switch statement in `executeStageActivity`

### API Endpoints

- `POST /api/workflows/upload` - Upload and validate specifications
- `POST /api/workflows/execute` - Start workflow execution
- `GET /api/workflows/status/[workflowId]` - Get workflow status
- `GET /api/workflows/result/[workflowId]` - Get workflow results

### Environment Variables

- `TEMPORAL_ADDRESS`: Temporal server address (default: localhost:7233)
- `SENDGRID_API_KEY`: SendGrid API key for email sending (optional)
- `SENDGRID_FROM_EMAIL`: From email address for notifications

## Troubleshooting

### Temporal Connection Issues

1. Ensure Docker services are running: `docker-compose ps`
2. Check Temporal Web UI is accessible: http://localhost:8233
3. Restart services: `docker-compose restart`

### Workflow Execution Issues

1. Check the Temporal worker is running: `npm run temporal:dev`
2. Monitor logs in both the worker terminal and Temporal Web UI
3. Verify workflow specification format and function names

### Frontend Issues

1. Ensure all dependencies are installed: `npm install`
2. Check browser console for errors
3. Verify API endpoints are responding: Network tab in DevTools

## License

This project is for demonstration purposes. See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

For questions or support, please open an issue in the repository. 