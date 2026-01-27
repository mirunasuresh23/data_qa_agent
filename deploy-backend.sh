#!/bin/bash
# Deploy backend with correct environment variables for Vertex AI

PROJECT_ID="miruna-sandpit"
REGION="australia-southeast1"
SERVICE_NAME="data-qa-agent-backend"

echo "Deploying backend to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

gcloud run deploy $SERVICE_NAME \
  --source backend/ \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_REGION=$REGION,PYTHONUNBUFFERED=1

echo "Deployment complete!"
echo "Service URL: https://$SERVICE_NAME-750147355601.$REGION.run.app"
