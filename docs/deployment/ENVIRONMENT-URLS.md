# Environment URLs

This document contains the URLs for different environments of the carparts management system.

## Staging Environment

### Frontend
- **URL**: https://rasuki-carparts-staging.up.railway.app/
- **Platform**: Railway
- **Branch**: develop
- **Auto-deploy**: Yes (triggers on push to develop branch)

### Backend
- **URL**: https://carparts-backend-staging.up.railway.app
- **Platform**: Railway  
- **Branch**: develop
- **Auto-deploy**: Yes (triggers on push to develop branch)

## Production Environment

### Frontend
- **URL**: TBD
- **Platform**: Railway
- **Branch**: main

### Backend  
- **URL**: TBD
- **Platform**: Railway
- **Branch**: main

## Testing Staging Environment

To test the staging environment, you can use:

```bash
# Test backend API
curl -X GET "https://carparts-backend-staging.up.railway.app/api/parts/available" \
  -H "Authorization: Bearer test-token"

# Test reservations API
curl -X GET "https://carparts-backend-staging.up.railway.app/api/reservations" \
  -H "Authorization: Bearer test-token"
```

## Deployment Process

1. **Staging**: Push to `develop` branch triggers automatic deployment
2. **Production**: Push to `main` branch triggers automatic deployment

## Environment Variables

The frontend uses `REACT_APP_API_URL` environment variable to determine the backend URL:
- **Local**: http://localhost:3000
- **Staging**: https://carparts-backend-staging.up.railway.app
- **Production**: TBD

## Notes

- Both frontend and backend are deployed on Railway
- Staging deployments happen automatically on push to develop branch
- The staging environment is used for testing before production deployment
