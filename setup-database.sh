#!/bin/bash

# Database setup script for Trend Advisory Customer Portal

echo "Setting up PostgreSQL database for Trend Advisory..."

# Database configuration
DB_USER="mal"
DB_PASSWORD="password123"
DB_NAME="trend_advisory"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database '$DB_NAME'..."
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER $DB_NAME 2>/dev/null || echo "Database may already exist, continuing..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file for Prisma..."
    cat > .env << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
EOF
    echo ".env file created!"
else
    echo ".env file already exists, skipping..."
fi

# Create/update .env.local file
echo "Creating .env.local file..."
cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3003"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# OpenAI API
OPENAI_API_KEY="your-openai-api-key-here"

# Email Service (SendGrid)
SENDGRID_API_KEY=""
EMAIL_FROM="noreply@trendadvisory.com"

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET=""
EOF

echo ".env file updated!"

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Run seed script
echo "Seeding database..."
npx prisma db seed

echo "Database setup complete!"
echo "You can now start the development server with 'npm run dev'"