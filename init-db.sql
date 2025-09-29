-- Drop and recreate database (careful with this in production!)
DROP DATABASE IF EXISTS trend_advisory;
CREATE DATABASE trend_advisory;

-- Drop user if exists and recreate
DROP USER IF EXISTS mal;
CREATE USER mal WITH PASSWORD 'password123';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE trend_advisory TO mal;
ALTER DATABASE trend_advisory OWNER TO mal;

-- Connect to the database and set up schema permissions
\c trend_advisory
GRANT ALL ON SCHEMA public TO mal;
GRANT CREATE ON SCHEMA public TO mal;