import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Sprout, Award, FileText, MessageSquare, TrendingUp, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCrops: 0,
    totalSchemes: 0,
    totalNewsletters: 0,
    openTickets: 0,
    recommendations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching admin dashboard stats...');
      setLoading(true);
      
      // Run individual queries for each stat to avoid subquery issues
      const [usersResult, cropsResult, schemesResult, newslettersResult, ticketsResult, recommendationsResult] = await Promise.all([
        blink.db.sql<{ count: string }>(`SELECT COUNT(*) as count FROM users`),
        blink.db.sql<{ count: string }>(`SELECT COUNT(*) as count FROM crops`),
        blink.db.sql<{ count: string }>(`SELECT COUNT(*) as count FROM government_schemes WHERE is_active = '1'`),
        blink.db.sql<{ count: string }>(`SELECT COUNT(*) as count FROM newsletters WHERE is_published = '1'`),
        blink.db.sql<{ count: string }>(`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'`),
        blink.db.sql<{ count: string }>(`SELECT COUNT(*) as count FROM crop_recommendations`)
      ]);

      console.log('📊 Query results:', {
        users: usersResult,
        crops: cropsResult,
        schemes: schemesResult,
        newsletters: newslettersResult,
        tickets: ticketsResult,
        recommendations: recommendationsResult
      });

      // Extract counts from results - handle both result.rows and direct array formats
      const getCount = (result: { rows?: { count: string }[]; } | { count: string }[]): number => {
        // Check if result has rows property (SDK format)
        if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows) && result.rows.length > 0) {
          return parseInt(String(result.rows[0].count)) || 0;
        }
        // Check if result is direct array (alternative format)
        if (Array.isArray(result) && result.length > 0) {
          return parseInt(String((result[0] as { count: string }).count)) || 0;
        }
        return 0;
      };

      const newStats = {
        totalUsers: getCount(usersResult),
        totalCrops: getCount(cropsResult),
        totalSchemes: getCount(schemesResult),
        totalNewsletters: getCount(newslettersResult),
        openTickets: getCount(ticketsResult),
        recommendations: getCount(recommendationsResult)
      };

      console.log('✅ Stats parsed:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Crops',
      value: stats.totalCrops,
      icon: Sprout,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Schemes',
      value: stats.totalSchemes,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Published News',
      value: stats.totalNewsletters,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Open Tickets',
      value: stats.openTickets,
      icon: MessageSquare,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Recommendations',
      value: stats.recommendations,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    }
  ];

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your agriculture support system
          </p>
        </div>
        <Button 
          onClick={fetchStats} 
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/admin/database"
              className="p-4 border rounded-lg hover:bg-muted transition-colors bg-primary/5 border-primary/20"
            >
              <h3 className="font-semibold mb-1">📊 View All Tables</h3>
              <p className="text-sm text-muted-foreground">
                Browse all 14 database tables with full access
              </p>
            </a>
            <a
              href="/admin/crops"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold mb-1">Manage Crops</h3>
              <p className="text-sm text-muted-foreground">
                Add, edit, or remove crop information
              </p>
            </a>
            <a
              href="/admin/schemes"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold mb-1">Manage Schemes</h3>
              <p className="text-sm text-muted-foreground">
                Update government schemes and subsidies
              </p>
            </a>
            <a
              href="/admin/newsletters"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold mb-1">Manage Newsletters</h3>
              <p className="text-sm text-muted-foreground">
                Publish news and updates for farmers
              </p>
            </a>
            <a
              href="/admin/tickets"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold mb-1">Support Tickets</h3>
              <p className="text-sm text-muted-foreground">
                Respond to farmer queries and issues
              </p>
            </a>
            <a
              href="/admin/users"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold mb-1">Manage Users</h3>
              <p className="text-sm text-muted-foreground">
                View and manage farmer accounts
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
