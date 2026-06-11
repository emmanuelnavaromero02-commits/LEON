# Identity and Access Management (IAM)

IAM is a global service that allows you to manage access to AWS services and resources securely.

## Components
- **Users**: Permanent credentials for people or applications.
- **Groups**: Collection of users with common permissions.
- **Roles**: Temporary credentials for trusted entities (services or external users).
- **Policies**: JSON documents that define permissions.

## Best Practices
- Use IAM roles for EC2 instances instead of long-term access keys.
- Enable Multi-Factor Authentication (MFA) for all users, especially the root account.
- Rotate credentials regularly.
