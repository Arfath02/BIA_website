-- BIA website · MS SQL Server schema
CREATE DATABASE bia_website;
GO
USE bia_website;
GO
CREATE TABLE dbo.fabric_briefs (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    reference     NVARCHAR(20)  NOT NULL UNIQUE,
    feel          NVARCHAR(40)  NOT NULL,
    performance   NVARCHAR(40)  NOT NULL,
    application   NVARCHAR(40)  NOT NULL,
    status        NVARCHAR(20)  NOT NULL DEFAULT 'new',
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE dbo.enquiries (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    reference     NVARCHAR(20)  NOT NULL UNIQUE,
    topic         NVARCHAR(30)  NOT NULL,
    name          NVARCHAR(120) NOT NULL,
    email         NVARCHAR(200) NOT NULL,
    company       NVARCHAR(160) NULL,
    message       NVARCHAR(2000) NULL,
    status        NVARCHAR(20)  NOT NULL DEFAULT 'new',
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE USER bia_app WITH PASSWORD = '@dm!n@123';
ALTER ROLE db_datareader ADD MEMBER bia_app;
ALTER ROLE db_datawriter ADD MEMBER bia_app;
GO
