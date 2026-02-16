import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Users, 
  Trash2, 
  Shield,
  Mail,
  Calendar,
  Search,
  UserX,
  Crown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import logoImage from '@/assets/C2-logo.jpeg';

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  role?: 'admin' | 'user';
  user_roles?: { role: 'admin' | 'user' }[];
}

const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
  }, [user, navigate]);

  useEffect(() => {
    const filtered = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
      fetchUsers();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch user roles separately
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserProfile[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role || 'user') as 'admin' | 'user'
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (userId: string, email: string) => {
    try {
      // First delete from profiles (this will cascade to user_roles due to foreign key)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Remove from local state
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      
      toast({
        title: "Success",
        description: `Profile for ${email} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete profile",
        variant: "destructive",
      });
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string, email: string) => {
    if (email === 'robbie@chapter2.group') {
      toast({
        title: "Cannot modify",
        description: "Cannot change the master admin role",
        variant: "destructive",
      });
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId 
          ? { ...u, role: newRole as 'admin' | 'user' }
          : u
      ));

      toast({
        title: "Success",
        description: `${email} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Checking admin privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Floating background elements */}
      <div className="floating-orb w-64 h-64 top-20 left-10 opacity-30"></div>
      <div className="floating-orb w-48 h-48 top-1/2 right-20 opacity-20 animation-delay-1000"></div>
      <div className="floating-orb w-32 h-32 bottom-32 left-1/3 opacity-25 animation-delay-2000"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="bg-surface hover:bg-surface-hover border-border/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="w-16 h-16">
              <img 
                src={logoImage} 
                alt="C2 Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-hero mb-4">Admin Dashboard</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Manage user accounts and permissions
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 pb-16">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 gradient-card shadow-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 gradient-card shadow-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 gradient-card shadow-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Regular Users</p>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'user').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="p-6 gradient-card shadow-card border-border/50 mb-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus-visible:ring-0 text-foreground"
              />
            </div>
          </Card>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="p-12 text-center gradient-card shadow-card border-border/50">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'Users will appear here when they sign up'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userProfile) => (
                <Card key={userProfile.user_id} className="p-6 gradient-card shadow-card border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {userProfile.name || 'No name'}
                          </h3>
                          <Badge 
                            variant={userProfile.role === 'admin' ? 'default' : 'secondary'}
                            className={userProfile.role === 'admin' ? 'bg-primary text-primary-foreground' : ''}
                          >
                            {userProfile.role === 'admin' ? (
                              <>
                                <Crown className="w-3 h-3 mr-1" />
                                Admin
                              </>
                            ) : (
                              'User'
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {userProfile.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {formatDate(userProfile.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {userProfile.email !== 'robbie@chapter2.group' && (
                        <>
                          <Button
                            onClick={() => toggleUserRole(userProfile.user_id, userProfile.role || 'user', userProfile.email)}
                            variant="outline"
                            size="sm"
                            className="bg-surface hover:bg-surface-hover"
                          >
                            <Shield className="w-3 h-3 mr-2" />
                            {userProfile.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Profile</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the profile for {userProfile.email}? 
                                  This action cannot be undone and will remove all their data including saved reports.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProfile(userProfile.user_id, userProfile.email)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete Profile
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {userProfile.email === 'robbie@chapter2.group' && (
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          Master Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Admin;