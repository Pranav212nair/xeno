# 🚀 Xeno Platform - Quick Reference

## Access the Application

**URL**: http://localhost:3000/login.html

**Demo Login**:
- Email: `admin@acme.com`
- Password: `password123`

## Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | Main API server |
| `backend/prisma/schema.prisma` | Database schema |
| `backend/.env` | Configuration |
| `homepage/index.html` | Dashboard |
| `homepage/login.html` | Login page |

## Common Commands

```powershell
# Start server
cd backend
npm start

# Restart server
.\restart-server.ps1

# View database
cd backend
npx prisma studio

# Run migrations
cd backend
npx prisma migrate dev

# Seed database
cd backend
npm run prisma:seed
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | Login |
| `/api/auth/register` | POST | Register |
| `/api/dashboard/stats` | GET | Dashboard data |
| `/api/campaigns` | GET/POST | Campaigns |

## Database Info

- **Type**: SQLite
- **Location**: `backend/prisma/dev.db`
- **Tenants**: 1 (ACME Retail)
- **Users**: 1 (admin@acme.com)
- **Customers**: 3
- **Campaigns**: 2

## Project Stats

- **Lines of Code**: 2,500+
- **API Endpoints**: 30+
- **Database Models**: 11
- **Completion**: 80% (MVP)

## Assignment Deliverables

✅ Working application
✅ Multi-tenant architecture
✅ Authentication system
✅ Campaign management
✅ Customer segmentation
✅ Analytics dashboard
✅ Complete documentation
⏳ Video demonstration (to record)
⏳ Full Shopify integration (partially ready)

## Tech Stack

**Backend**: Node.js + Express + Prisma + SQLite
**Frontend**: HTML + CSS + JavaScript
**Auth**: JWT
**Shopify**: @shopify/shopify-api (SDK installed)

## Next Steps for Full Implementation

1. Implement Shopify OAuth flow
2. Create data sync service
3. Add webhook handlers
4. Build campaign sending
5. Implement journey execution

## Troubleshooting

**Server won't start?**
- Check if port 3000 is available
- Verify `backend/.env` exists
- Run `npm install` in backend folder

**Can't login?**
- Verify server is running
- Check browser console for errors
- Try running seed script again

**Database issues?**
- Delete `dev.db` and run migrations
- Run seed script to repopulate data
- Use Prisma Studio to inspect

## Documentation

- `README.md` - Full setup guide
- `API.md` - API documentation
- `TEST_GUIDE.md` - Testing instructions
- `IMPLEMENTATION_SUMMARY.md` - Complete overview

---

**Status**: ✅ Ready for demonstration
**Version**: 2.0.0
**Date**: December 2, 2024
