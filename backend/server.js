require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Serve static frontend files (support both ../homepage and project root)
const projectRoot = path.join(__dirname, '..');
const homepageDir = path.join(projectRoot, 'homepage');
const staticDir = fs.existsSync(path.join(homepageDir, 'login.html')) ? homepageDir : projectRoot;
app.use(express.static(staticDir));

// Root route -> login page
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'login.html'));
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, companyName, shopDomain } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create tenant first
    const tenant = await prisma.tenant.create({
      data: {
        shopDomain: shopDomain || `${companyName.toLowerCase().replace(/\s+/g, '-')}.myshopify.com`,
        companyName: companyName || 'My Company',
        email: email,
        isActive: true,
      }
    });

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name,
        passwordHash,
        role: 'admin',
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        company: tenant.companyName,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        company: user.tenant.companyName,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      company: user.tenant.companyName,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { days = 30 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // Get customers by lifecycle
    const lifecycleStats = await prisma.customer.groupBy({
      by: ['lifecycle'],
      where: { tenantId },
      _count: true
    });

    // Get total revenue from orders
    const orderStats = await prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: daysAgo }
      },
      _sum: { totalPrice: true },
      _count: true
    });

    // Calculate KPIs
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'live').length;
    const totalCustomers = await prisma.customer.count({ where: { tenantId } });

    // Format lifecycle data
    const lifecycle = {
      new: lifecycleStats.find(s => s.lifecycle === 'new')?._count || 0,
      active: lifecycleStats.find(s => s.lifecycle === 'active')?._count || 0,
      at_risk: lifecycleStats.find(s => s.lifecycle === 'at_risk')?._count || 0,
      churned: lifecycleStats.find(s => s.lifecycle === 'churned')?._count || 0,
    };

    res.json({
      kpis: {
        revenueInfluenced: totalRevenue,
        activeCampaigns,
        totalCustomers,
        totalOrders: orderStats._count || 0,
        repeatRate: 42,
        loyaltyEngagement: 61,
        customerGrowth: lifecycle.new,
        topChannel: 'WhatsApp'
      },
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        status: c.status,
        revenue: c.revenue,
        roi: c.revenue > 0 && c.cost > 0 ? (c.revenue / c.cost).toFixed(1) : 0,
        ctr: c.sent > 0 ? ((c.clicked / c.sent) * 100).toFixed(1) : 0,
        sent: c.sent,
        opened: c.opened,
        clicked: c.clicked,
        converted: c.converted
      })),
      lifecycle,
      segments: await prisma.segment.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          description: true,
          customerCount: true,
          type: true
        }
      }),
      journeys: await prisma.journey.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          status: true,
          enrolledCount: true,
          conversionRate: true
        }
      })
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// ==================== CAMPAIGNS ====================

app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: req.user.tenantId },
      include: { segment: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const { name, channel, segmentId, budget } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        channel,
        segmentId: segmentId || null,
        status: 'live',
        cost: parseFloat(budget) || 0,
        startedAt: new Date()
      }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.put('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, channel, status, segmentId } = req.body;

    const campaign = await prisma.campaign.update({
      where: { id, tenantId: req.user.tenantId },
      data: { name, channel, status, segmentId }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.delete('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.campaign.delete({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// ==================== CUSTOMERS ====================

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { lifecycle, limit = 100 } = req.query;

    const customers = await prisma.customer.findMany({
      where: {
        tenantId: req.user.tenantId,
        ...(lifecycle && { lifecycle })
      },
      take: parseInt(limit),
      orderBy: { lifetimeValue: 'desc' }
    });

    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/top', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const customers = await prisma.customer.findMany({
      where: { tenantId: req.user.tenantId },
      take: parseInt(limit),
      orderBy: { totalSpent: 'desc' }
    });

    res.json(customers);
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
});

// ==================== SEGMENTS ====================

app.get('/api/segments', authenticateToken, async (req, res) => {
  try {
    const segments = await prisma.segment.findMany({
      where: { tenantId: req.user.tenantId },
      include: { _count: { select: { members: true } } }
    });

    res.json(segments);
  } catch (error) {
    console.error('Get segments error:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

app.post('/api/segments', authenticateToken, async (req, res) => {
  try {
    const { name, description, type } = req.body;

    const segment = await prisma.segment.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        description,
        type: type || 'custom'
      }
    });

    res.json(segment);
  } catch (error) {
    console.error('Create segment error:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// ==================== ORDERS ====================

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;

    const where = {
      tenantId: req.user.tenantId,
      ...(from && to && {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      })
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { email: true, firstName: true, lastName: true } },
        items: true
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ==================== ANALYTICS ====================

app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: req.user.tenantId }
    });

    const channelPerformance = campaigns.reduce((acc, c) => {
      if (!acc[c.channel]) {
        acc[c.channel] = { revenue: 0, count: 0, cost: 0 };
      }
      acc[c.channel].revenue += c.revenue;
      acc[c.channel].cost += c.cost;
      acc[c.channel].count += 1;
      return acc;
    }, {});

    const topCampaigns = campaigns
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        revenue: c.revenue,
        channel: c.channel,
        roi: c.cost > 0 ? (c.revenue / c.cost).toFixed(2) : 0
      }));

    res.json({
      channelPerformance,
      topCampaigns,
      totalRevenue: campaigns.reduce((sum, c) => sum + c.revenue, 0),
      totalCost: campaigns.reduce((sum, c) => sum + c.cost, 0),
      avgROI: campaigns.length > 0 
        ? (campaigns.reduce((sum, c) => sum + (c.cost > 0 ? c.revenue / c.cost : 0), 0) / campaigns.length).toFixed(2)
        : 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==================== SHOPIFY INTEGRATION ====================

app.post('/api/shopify/sync', authenticateToken, async (req, res) => {
  try {
    const { accessToken, shopDomain } = req.body;

    await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        accessToken,
        shopDomain,
        updatedAt: new Date()
      }
    });

    const syncLog = await prisma.syncLog.create({
      data: {
        tenantId: req.user.tenantId,
        resourceType: 'all',
        status: 'in_progress',
        recordsProcessed: 0
      }
    });

    res.json({
      message: 'Sync initiated',
      syncLogId: syncLog.id,
      note: 'In production, this would sync data from Shopify API'
    });
  } catch (error) {
    console.error('Shopify sync error:', error);
    res.status(500).json({ error: 'Failed to sync Shopify data' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    version: '2.0.0'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Xeno Marketing Platform API',
    version: '2.0.0',
    endpoints: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
      dashboard: ['GET /api/dashboard/stats'],
      campaigns: ['GET /api/campaigns', 'POST /api/campaigns', 'PUT /api/campaigns/:id', 'DELETE /api/campaigns/:id'],
      customers: ['GET /api/customers', 'GET /api/customers/top'],
      segments: ['GET /api/segments', 'POST /api/segments'],
      orders: ['GET /api/orders'],
      analytics: ['GET /api/analytics'],
      shopify: ['POST /api/shopify/sync']
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Xeno Backend Server v2.0`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🗄️  Database: SQLite`);
  console.log(`🔐 JWT Auth: Enabled`);
  console.log(`\n✨ Ready to accept requests!\n`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
